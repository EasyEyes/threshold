"""
TC-04: Non-retryable 403 — immediate hard stop.

Every POST to /results returns 403.  _retryablePavloviaPost must reject
immediately without any retry.  The addon counts requests into
/tmp/tc04_count.json so the spec can assert exactly one request was made.
"""

import json
from mitmproxy import http

TARGET = "/results"
COUNT_FILE = "/tmp/tc04_count.json"
_count = 0
_CORS = {"access-control-allow-origin": "*"}


def request(flow: http.HTTPFlow) -> None:
    global _count
    if TARGET not in flow.request.pretty_url:
        return
    _count += 1
    with open(COUNT_FILE, "w") as f:
        json.dump({"count": _count}, f)
    print(f"[TC-04] Returning 403 (attempt {_count})")
    flow.response = http.Response.make(
        403,
        b"Forbidden (injected)",
        {"content-type": "text/plain", **_CORS},
    )
