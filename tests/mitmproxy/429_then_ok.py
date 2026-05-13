"""
Scenario: HTTP 429 Too Many Requests, then success.

Returns 429 on the first request to each API endpoint. apiRequest should treat
429 the same as 5xx and retry. The second attempt is allowed through.

Run:
    mitmproxy -s 429_then_ok.py
"""

from mitmproxy import http

TARGET = "gitlab.pavlovia.org/api/v4"
_counts: dict[str, int] = {}


def response(flow: http.HTTPFlow) -> None:
    if TARGET not in flow.request.pretty_url:
        return
    key = flow.request.path
    _counts[key] = _counts.get(key, 0) + 1
    if _counts[key] == 1:
        print(f"[429_then_ok] Injecting 429 → {key}")
        flow.response = http.Response.make(
            429,
            b"Too Many Requests (injected)",
            {"content-type": "text/plain", "retry-after": "1"},
        )
    else:
        print(f"[429_then_ok] Passing through → {key}")
