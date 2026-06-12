"""
TC-08: One 504 on both /results and /logs, then 200 on each.

Verifies that _retryablePavloviaPost retries independently on both the results
and the log upload paths (as called by ServerManager.uploadData and uploadLog).
"""

from mitmproxy import http

_CORS = {"access-control-allow-origin": "*"}
_counts: dict[str, int] = {}


def _is_target(url: str) -> bool:
    return "/results" in url or "/logs" in url


def request(flow: http.HTTPFlow) -> None:
    url = flow.request.pretty_url
    if not _is_target(url):
        return
    key = "/results" if "/results" in url else "/logs"
    _counts[key] = _counts.get(key, 0) + 1
    attempt = _counts[key]
    if attempt == 1:
        print(f"[TC-08] Injecting 504 on {key} (attempt 1)")
        flow.response = http.Response.make(
            504,
            b"Gateway Time-out (injected)",
            {"content-type": "text/plain", **_CORS},
        )
    else:
        print(f"[TC-08] Returning 200 on {key} (attempt {attempt})")
        flow.response = http.Response.make(
            200,
            b'{"status":"ok"}',
            {"content-type": "application/json", **_CORS},
        )
