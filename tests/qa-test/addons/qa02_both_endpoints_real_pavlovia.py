"""
QA-02: One transient 504 on both /results and /logs, then real Pavlovia pass-through.

First POST to /results  -> 504 (injected).
First POST to /logs     -> 504 (injected).
Subsequent requests to each endpoint -> forwarded to the real Pavlovia server.

Purpose: verify that _retryablePavloviaPost retries independently on both
upload paths and that the real Pavlovia server commits both the .csv (via
/results) and the .log.gz (via /logs) after a transient failure on each.

Usage:
    mitmdump -s qa02_both_endpoints_real_pavlovia.py

Restart mitmdump between runs to reset the request counters.
"""

from mitmproxy import http

_counts: dict[str, int] = {}


def _endpoint(url: str) -> str | None:
    if "/results" in url:
        return "/results"
    if "/logs" in url:
        return "/logs"
    return None


def request(flow: http.HTTPFlow) -> None:
    key = _endpoint(flow.request.pretty_url)
    if key is None:
        return
    _counts[key] = _counts.get(key, 0) + 1
    attempt = _counts[key]
    if attempt == 1:
        print(f"[QA-02] Injecting 504 on {key} (attempt 1) — request blocked")
        flow.response = http.Response.make(
            504,
            b"Gateway Time-out (injected by QA-02)",
            {"content-type": "text/plain", "access-control-allow-origin": "*"},
        )
    else:
        print(f"[QA-02] Passing through to real Pavlovia on {key} (attempt {attempt})")
        # flow.response is not set — mitmproxy forwards the request normally
