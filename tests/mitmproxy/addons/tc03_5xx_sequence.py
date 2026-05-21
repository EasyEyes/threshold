"""
TC-03: 502, then 503, then 200.

Verifies that each of these retryable status codes is handled correctly in
sequence by _retryablePavloviaPost.
"""

from mitmproxy import http

TARGET = "/results"
_SEQUENCE = [502, 503, 200]
_count = 0
_CORS = {"access-control-allow-origin": "*"}


def request(flow: http.HTTPFlow) -> None:
    global _count
    if TARGET not in flow.request.pretty_url:
        return
    status = _SEQUENCE[min(_count, len(_SEQUENCE) - 1)]
    _count += 1
    print(f"[TC-03] Returning {status} (attempt {_count})")
    body = b"error (injected)" if status != 200 else b'{"status":"ok"}'
    flow.response = http.Response.make(
        status,
        body,
        {"content-type": "application/json" if status == 200 else "text/plain", **_CORS},
    )
