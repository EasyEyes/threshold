"""
TC-10: Count total POSTs to /results.

Always returns 200. Writes the running request count to /tmp/tc10_count.json
so the spec can assert that exactly one POST was made (skipSave: true prevents
a duplicate save after the first successful upload).
"""

import json
from mitmproxy import http

TARGET = "/results"
COUNT_FILE = "/tmp/tc10_count.json"
_count = 0
_CORS = {"access-control-allow-origin": "*"}


def request(flow: http.HTTPFlow) -> None:
    global _count
    if TARGET not in flow.request.pretty_url:
        return
    _count += 1
    with open(COUNT_FILE, "w") as f:
        json.dump({"count": _count}, f)
    print(f"[TC-10] POST #{_count} to /results → 200")
    flow.response = http.Response.make(
        200,
        b'{"status":"ok"}',
        {"content-type": "application/json", **_CORS},
    )
