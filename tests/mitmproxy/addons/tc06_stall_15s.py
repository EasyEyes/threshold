"""
TC-06: Stall the first /results request indefinitely (60 s sleep).

The browser's AbortController fires after 15 s, aborting the first attempt.
_retryablePavloviaPost then retries; the second request is returned 200.

Records the wall-clock times of each request arrival so the spec can confirm
that the second attempt arrives ≥ 15 000 ms after the first.
"""

import asyncio
import time
import json
from mitmproxy import http

TARGET = "/results"
TIMESTAMPS_FILE = "/tmp/tc06_timestamps.json"
_times: list[float] = []
_CORS = {"access-control-allow-origin": "*"}


async def request(flow: http.HTTPFlow) -> None:
    if TARGET not in flow.request.pretty_url:
        return
    _times.append(time.time())
    with open(TIMESTAMPS_FILE, "w") as f:
        json.dump(_times, f)

    if len(_times) == 1:
        print("[TC-06] Stalling first request for 60 s (AbortController should fire at 15 s)")
        await asyncio.sleep(60)
        # After 60 s the flow is abandoned; Chrome has already moved on.
        print("[TC-06] Stall ended (connection was likely aborted by browser)")
    else:
        print(f"[TC-06] Returning 200 (attempt {len(_times)})")
        flow.response = http.Response.make(
            200,
            b'{"status":"ok"}',
            {"content-type": "application/json", **_CORS},
        )
