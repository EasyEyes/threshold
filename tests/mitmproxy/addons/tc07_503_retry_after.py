"""
TC-07: 503 with Retry-After: 3, then 200.

Same structure as TC-02 but uses 503 instead of 429.
Records request timestamps so the spec can assert a ≥ 3 000 ms gap and that
jitter was NOT applied to the server-supplied value.
"""

import time
import json
from mitmproxy import http

TARGET = "/results"
TIMESTAMPS_FILE = "/tmp/tc07_timestamps.json"
_times: list[float] = []
_CORS = {"access-control-allow-origin": "*"}


def request(flow: http.HTTPFlow) -> None:
    if TARGET not in flow.request.pretty_url:
        return
    _times.append(time.time())
    with open(TIMESTAMPS_FILE, "w") as f:
        json.dump(_times, f)

    if len(_times) == 1:
        print("[TC-07] Injecting 503 with Retry-After: 3")
        flow.response = http.Response.make(
            503,
            b"Service Unavailable (injected)",
            {
                "content-type": "text/plain",
                "retry-after": "3",
                # Expose Retry-After to JS; without this CORS hides it from fetch().
                "access-control-expose-headers": "retry-after",
                **_CORS,
            },
        )
    else:
        print(f"[TC-07] Returning 200 (attempt {len(_times)})")
        flow.response = http.Response.make(
            200,
            b'{"status":"ok"}',
            {"content-type": "application/json", **_CORS},
        )
