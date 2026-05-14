"""
Scenario: Two HTTP 500s then success (per endpoint path).

Each matching API path receives 500 on its first two requests, then mitmproxy
lets the real Pavlovia response through on the third attempt.

Expected behaviour: apiRequest retries twice and resolves on the third attempt.
No visible error in the EasyEyes UI; project listing completes normally.

Run:
    mitmproxy -s 500_two_then_ok.py
    # or headless:
    mitmdump -s 500_two_then_ok.py
"""

from mitmproxy import http

TARGET = "gitlab.pavlovia.org/api/v4"
_counts: dict[str, int] = {}


def response(flow: http.HTTPFlow) -> None:
    if TARGET not in flow.request.pretty_url:
        return
    key = flow.request.path
    _counts[key] = _counts.get(key, 0) + 1
    attempt = _counts[key]
    if attempt <= 2:
        print(f"[500_two_then_ok] Injecting 500 (attempt {attempt}) → {key}")
        flow.response = http.Response.make(
            500,
            b'{"message":"500 Internal Server Error (injected)"}',
            {"content-type": "application/json"},
        )
    else:
        print(f"[500_two_then_ok] Passing through (attempt {attempt}) → {key}")
