"use strict";
(() => {
  // ../../preprocess/retry.ts
  var BASE_DELAY_SEC = 0.2;
  var MAX_DELAY_SEC = 30;
  var wait = (ms) => new Promise((r) => setTimeout(r, ms));
  var getRetryDelayMs = (attempt) => {
    const delaySec = Math.min(
      BASE_DELAY_SEC * Math.pow(1.75, attempt),
      MAX_DELAY_SEC,
    );
    const jitter = 0.8 + Math.random() * 0.4;
    return delaySec * 1e3 * jitter;
  };

  // ../../psychojs/src/core/retryablePavloviaPost.js
  var _RETRYABLE_STATUSES = /* @__PURE__ */ new Set([429, 502, 503, 504]);
  async function _retryablePavloviaPost(url2, data) {
    let attempt = 0;
    while (true) {
      const controller = new AbortController();
      const timerId = setTimeout(() => controller.abort(), 15e3);
      try {
        let response;
        try {
          response = await fetch(url2, {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: new URLSearchParams(data),
            signal: controller.signal,
          });
        } catch (e) {
          if (
            e instanceof TypeError ||
            (e instanceof DOMException && e.name === "AbortError")
          ) {
            const delay = getRetryDelayMs(attempt++);
            console.warn(
              `_retryablePavloviaPost: network error, retrying in ${delay}ms`,
            );
            await wait(delay);
            continue;
          }
          throw e;
        }
        if (response.ok) return response;
        const { status } = response;
        if (_RETRYABLE_STATUSES.has(status)) {
          const retryAfterHeader = response.headers.get("Retry-After");
          const delay =
            retryAfterHeader !== null
              ? parseFloat(retryAfterHeader) * 1e3
              : getRetryDelayMs(attempt);
          attempt++;
          console.warn(
            `_retryablePavloviaPost: status ${status}, retrying in ${delay}ms`,
          );
          await wait(delay);
          continue;
        }
        throw Object.assign(
          new Error(
            `_retryablePavloviaPost: POST failed with status ${status} ${response.statusText}`,
          ),
          { status, statusText: response.statusText },
        );
      } finally {
        clearTimeout(timerId);
      }
    }
  }

  // fixture/harness.ts
  window._retryablePavloviaPost = _retryablePavloviaPost;
  var url =
    window.FIXTURE_URL ?? new URLSearchParams(location.search).get("url") ?? "";
  if (url) {
    const statusEl = document.getElementById("status");
    const resultEl = document.getElementById("result");
    statusEl.textContent = "Saving your results, please wait\u2026";
    _retryablePavloviaPost(url, { key: "data", value: "test" })
      .then((resp) => {
        statusEl.textContent = "";
        resultEl.textContent = `success:${resp.status}`;
      })
      .catch((err) => {
        statusEl.textContent = "";
        resultEl.textContent = `error:${err.status ?? "network"}`;
      });
  }
})();
