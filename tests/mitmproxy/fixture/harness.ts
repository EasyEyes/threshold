import { _retryablePavloviaPost } from "../../../psychojs/src/core/retryablePavloviaPost.js";

declare global {
  interface Window {
    FIXTURE_URL?: string;
    _retryablePavloviaPost: typeof _retryablePavloviaPost;
  }
}

// Expose for programmatic use from test specs (TC-10).
window._retryablePavloviaPost = _retryablePavloviaPost;

const url: string =
  window.FIXTURE_URL ?? new URLSearchParams(location.search).get("url") ?? "";

if (url) {
  const statusEl = document.getElementById("status")!;
  const resultEl = document.getElementById("result")!;

  statusEl.textContent = "Saving your results, please wait…";

  _retryablePavloviaPost(url, { key: "data", value: "test" })
    .then((resp: Response) => {
      statusEl.textContent = "";
      resultEl.textContent = `success:${resp.status}`;
    })
    .catch((err: { status?: number }) => {
      statusEl.textContent = "";
      resultEl.textContent = `error:${err.status ?? "network"}`;
    });
}
