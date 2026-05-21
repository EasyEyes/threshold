# mitmproxy fault-injection scripts

End-to-end failure scenario testing for `GitLabOAuthClient.apiRequest` resilience.
Chrome traffic already routes through mitmproxy; load one script at a time to inject
a specific failure mode against `gitlab.pavlovia.org`.

## Prerequisites

```bash
pip install mitmproxy   # if not already installed
```

Chrome must be routing through mitmproxy and the mitmproxy CA cert must be trusted
(run `mitmproxy` once and visit `mitm.it` in Chrome to install it).

## How to run a scenario

```bash
cd threshold/tests/mitmproxy

# Interactive TUI (lets you see/edit each flow live):
mitmproxy -s <script>.py

# Headless (log output only — easier to read counts):
mitmdump -s <script>.py
```

Then in Chrome: open the EasyEyes Compiler, sign in to Pavlovia, and upload an
experiment file to trigger the "Listing resources…" flow.

---

## Scenarios

### Transient HTTP errors

| Script | What it injects | Expected outcome |
|--------|----------------|-----------------|
| `500_two_then_ok.py` | 500 on first 2 requests per path, then passes through | Loads successfully after ~0.6 s retry delay |
| `500_exhausted.py` | 500 on every request | Error after 3 attempts; UI should not freeze |
| `429_then_ok.py` | 429 on first request per path | Loads successfully after one retry |

### Network-level errors (TypeError / ERR_NETWORK_CHANGED)

| Script | What it injects | Expected outcome |
|--------|----------------|-----------------|
| `network_error_two_then_ok.py` | TCP RST on first 2 requests per path | Loads successfully after ~0.6 s retry delay |
| `network_error_exhausted.py` | TCP RST on every request | Network TypeError rethrown; UI should not freeze |

### 401 / token refresh

| Script | What it injects | Expected outcome |
|--------|----------------|-----------------|
| `401_refresh_ok.py` | 401 on first request, refresh allowed | Transparent recovery; loads normally |
| `401_refresh_fails.py` | 401 on all API calls + blocks token refresh | AUTH_TOKEN_INVALID thrown; clear auth error shown |
| `401_concurrent.py` | 401 on all first-round parallel requests | **Exactly one** `/oauth/token` call in the mitmproxy log; all requests eventually resolve |

---

## What to verify

### In the mitmproxy/mitmdump log
- `[script_name]` prefixed lines show injection counts per path.
- For `401_concurrent.py`: confirm `Token refresh hit #1` appears exactly once.

### In Chrome DevTools → Network tab
- For retry scenarios: the same URL appears multiple times (one failed, one/two succeeded).
- For exhaustion scenarios: the URL appears 3× with all failures, then the UI surfaces an error.
- For 401 concurrent: `oauth/token` appears once regardless of how many project pages loaded in parallel.

### In the EasyEyes UI
- Retry-ok scenarios: spinner resolves normally, no visible error.
- Exhaustion scenarios: Swal error dialog or console error — not a frozen spinner.
- Cancel button: visible throughout the spinner; clicking it returns to the table step cleanly.

---

## Resetting between runs

The scripts track per-path request counts in module-level dicts. Because mitmproxy
keeps the addon loaded across requests, you must **restart mitmproxy** between test
runs to reset the counters. Or reload the addon with `r` in the interactive TUI.

---

## Automated Pavlovia upload retry tests (TC-01 – TC-10)

The `addons/` and `specs/` subdirectories contain a self-contained Playwright
test suite for `_retryablePavloviaPost` and `quitPsychoJS`.  Unlike the manual
scripts above, these tests run fully automatically with no browser setup required.

### Prerequisites

```bash
pip install mitmproxy
npm install          # installs @playwright/test in the threshold package
npx playwright install chromium
```

### Running the suite

```bash
cd threshold        # the threshold package root

# Run all 10 test cases (TC-01 through TC-10):
npx playwright test --config tests/mitmproxy/playwright.config.ts

# Run a single test case by file:
npx playwright test --config tests/mitmproxy/playwright.config.ts \
  tests/mitmproxy/specs/tc01.spec.ts
```

Total runtime is ~60 s (TC-06 waits 15 s for the AbortController timeout).

### How it works

1. **Global setup** (`global-setup.ts`) bundles `_retryablePavloviaPost` and its
   `retry` utility into a self-contained browser script (`fixture/harness.bundle.js`).
2. Each spec starts its own `mitmdump` process with the matching addon script from
   `addons/`, then launches Chromium with that proxy configured.
3. The fixture page is served inline via `page.route()` (no external server needed).
   The page origin is `http://fixture.test` so `Access-Control-Allow-Origin: *`
   from the addons is accepted by the browser's CORS check.
4. The addon scripts synthesise every HTTP response — no real Pavlovia server is
   required.  Timing tests (TC-02, TC-06, TC-07) write request timestamps to
   `/tmp/tc0N_timestamps.json` for the spec to read and assert.
5. After the upload promise resolves or rejects, the spec asserts on the `#result`
   DOM element and, where applicable, the sidecar file.

### Test cases

| File | What it verifies |
|------|-----------------|
| `tc01.spec.ts` | 2 × 504 then 200 — resolves |
| `tc02.spec.ts` | 429 `Retry-After: 2` — second attempt ≥ 2 000 ms later, no jitter |
| `tc03.spec.ts` | 502 → 503 → 200 — all retried |
| `tc04.spec.ts` | 403 — immediate rejection, exactly 1 request |
| `tc05.spec.ts` | TCP RST (TypeError) — retried, resolves |
| `tc06.spec.ts` | Stalled connection — aborted after 15 s, second attempt succeeds |
| `tc07.spec.ts` | 503 `Retry-After: 3` — second attempt ≥ 3 000 ms later, no jitter |
| `tc08.spec.ts` | Both `/results` and `/logs` retry independently |
| `tc09.spec.ts` | "Saving your results, please wait…" visible during retry, clears on success |
| `tc10.spec.ts` | `skipSave: true` — exactly one POST to `/results` |

### CI integration

Add as a separate optional job (not blocking the main build):

```yaml
pavlovia-upload-retry-tests:
  runs-on: ubuntu-latest
  continue-on-error: true
  steps:
    - uses: actions/checkout@v4
    - run: pip install mitmproxy
    - run: npm ci
      working-directory: threshold
    - run: npx playwright install chromium
      working-directory: threshold
    - run: npx playwright test --config tests/mitmproxy/playwright.config.ts
      working-directory: threshold
```
