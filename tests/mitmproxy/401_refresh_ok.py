"""
Scenario: Single 401, token refresh succeeds, one-shot retry resolves.

The first API request to each path gets a 401. The OAuth token refresh endpoint
is allowed through unchanged. The one-shot retry after refresh is also allowed
through. Expected: transparent recovery — user sees no error.

To trigger this realistically: let your Pavlovia token expire (or manually edit
storage in DevTools to an expired token) then upload a file.

Run:
    mitmproxy -s 401_refresh_ok.py
"""

from mitmproxy import http

API_TARGET = "gitlab.pavlovia.org/api/v4"
_first_401_done: set[str] = set()


def response(flow: http.HTTPFlow) -> None:
    url = flow.request.pretty_url
    if API_TARGET not in url:
        return
    key = flow.request.path
    if key not in _first_401_done:
        _first_401_done.add(key)
        print(f"[401_refresh_ok] Injecting 401 (first request) → {key}")
        flow.response = http.Response.make(
            401,
            b'{"message":"401 Unauthorized (injected)"}',
            {"content-type": "application/json"},
        )
    else:
        print(f"[401_refresh_ok] Passing through (retry after refresh) → {key}")
