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
