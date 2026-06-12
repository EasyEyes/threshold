"""
QA-01: Transient 504 with real Pavlovia pass-through.

First 2 POSTs to /results -> 504 (injected, never reaches Pavlovia).
Third and subsequent -> forwarded to the real Pavlovia server unchanged.

Purpose: verify that after two transient 504s the retry mechanism delivers
both .csv (via /results) and .log.gz (via /logs, never intercepted) to the
Pavlovia GitLab repository.

Usage:
    mitmdump -s qa01_real_pavlovia_retry.py

Restart mitmdump between runs to reset the request counter.
"""

from mitmproxy import http

TARGET = "/results"
_count = 0


def request(flow: http.HTTPFlow) -> None:
    global _count
    if TARGET not in flow.request.pretty_url:
        return
    _count += 1
    if _count <= 2:
        print(f"[QA-01] Injecting 504 (attempt {_count}) — request blocked")
        flow.response = http.Response.make(
            504,
            b"Gateway Time-out (injected by QA-01)",
            {"content-type": "text/plain", "access-control-allow-origin": "*"},
        )
    else:
        print(f"[QA-01] Passing through to real Pavlovia (attempt {_count})")
        # flow.response is not set — mitmproxy forwards the request normally
