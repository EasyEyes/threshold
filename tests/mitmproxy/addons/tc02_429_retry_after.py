"""
TC-02: 429 with Retry-After: 2, then 200.

Records the wall-clock timestamps of the first two POSTs to /results into
/tmp/tc02_timestamps.json so the Playwright spec can assert the gap is ≥ 2 000 ms
and that no jitter was applied to the server-supplied delay.
"""

import time
import json
from mitmproxy import http

TARGET = "/results"
TIMESTAMPS_FILE = "/tmp/tc02_timestamps.json"
_times: list[float] = []
_CORS = {"access-control-allow-origin": "*"}


def request(flow: http.HTTPFlow) -> None:
    if TARGET not in flow.request.pretty_url:
        return
    _times.append(time.time())
    with open(TIMESTAMPS_FILE, "w") as f:
        json.dump(_times, f)

    if len(_times) == 1:
        print("[TC-02] Injecting 429 with Retry-After: 2")
        flow.response = http.Response.make(
            429,
            b"Too Many Requests (injected)",
            {
                "content-type": "text/plain",
                "retry-after": "2",
                # Expose Retry-After to JS; without this CORS hides it from fetch().
                "access-control-expose-headers": "retry-after",
                **_CORS,
            },
        )
    else:
        print(f"[TC-02] Returning 200 (attempt {len(_times)})")
        flow.response = http.Response.make(
            200,
            b'{"status":"ok"}',
            {"content-type": "application/json", **_CORS},
        )
