"""
TC-05: TCP RST on first /results POST, then 200 on the second.

flow.kill() causes Chrome to receive ERR_CONNECTION_RESET, surfacing as a
TypeError("Failed to fetch") — which _retryablePavloviaPost must retry.
"""

from mitmproxy import http

TARGET = "/results"
_killed = False
_CORS = {"access-control-allow-origin": "*"}


def request(flow: http.HTTPFlow) -> None:
    global _killed
    if TARGET not in flow.request.pretty_url:
        return
    if not _killed:
        _killed = True
        print("[TC-05] Killing first connection (TCP RST)")
        flow.kill()
    else:
        print("[TC-05] Second request: returning 200")
        flow.response = http.Response.make(
            200,
            b'{"status":"ok"}',
            {"content-type": "application/json", **_CORS},
        )
