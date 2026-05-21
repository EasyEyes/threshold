"""
TC-01 / TC-09 addon: two transient 504s then 200.

First 2 POSTs matching /results → 504.
Third and subsequent → 200 OK.
Used by TC-01 (resolves) and TC-09 (status message visibility).
"""

from mitmproxy import http

TARGET = "/results"
_count = 0
_CORS = {"access-control-allow-origin": "*"}


def request(flow: http.HTTPFlow) -> None:
    global _count
    if TARGET not in flow.request.pretty_url:
        return
    _count += 1
    if _count <= 2:
        print(f"[TC-01] Injecting 504 (attempt {_count})")
        flow.response = http.Response.make(
            504,
            b"Gateway Time-out (injected)",
            {"content-type": "text/plain", **_CORS},
        )
    else:
        print(f"[TC-01] Returning 200 (attempt {_count})")
        flow.response = http.Response.make(
            200,
            b'{"status":"ok"}',
            {"content-type": "application/json", **_CORS},
        )
