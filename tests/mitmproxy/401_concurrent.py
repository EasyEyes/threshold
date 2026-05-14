"""
Scenario: Concurrent 401s — multiple in-flight requests all receive 401 simultaneously.

All first-round API requests get 401. The token refresh endpoint is allowed through.
All subsequent retries (after refresh) are allowed through.

Watch the mitmproxy log: you should see exactly ONE request hit the refresh endpoint,
confirming the refreshPromise guard serialises concurrent refresh attempts correctly.

Run:
    mitmproxy -s 401_concurrent.py

Then in DevTools console watch for:
    - Exactly one call to gitlab.pavlovia.org/oauth/token
    - All project-listing requests eventually succeed
"""

from mitmproxy import http

API_TARGET = "gitlab.pavlovia.org/api/v4"
REFRESH_TARGET = "gitlab.pavlovia.org/oauth/token"

_first_round_done: set[str] = set()
_refresh_count = 0


def response(flow: http.HTTPFlow) -> None:
    global _refresh_count
    url = flow.request.pretty_url

    if REFRESH_TARGET in url:
        _refresh_count += 1
        print(f"[401_concurrent] Token refresh hit #{_refresh_count} ← should be 1")
        return

    if API_TARGET not in url:
        return

    key = flow.request.path
    if key not in _first_round_done:
        _first_round_done.add(key)
        print(f"[401_concurrent] Injecting 401 (first round) → {key}")
        flow.response = http.Response.make(
            401,
            b'{"message":"401 Unauthorized (injected)"}',
            {"content-type": "application/json"},
        )
    else:
        print(f"[401_concurrent] Passing through (post-refresh retry) → {key}")
