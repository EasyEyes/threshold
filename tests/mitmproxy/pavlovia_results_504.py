"""Return HTTP 504 for every request to Pavlovia.

The request hook responds before requests reach pavlovia.org or any of its
subdomains. Requests to unrelated domains pass through unchanged.

Run from the EasyEyes workspace root:
    mitmdump -p 8080 -s website/docs/experiment/threshold/tests/mitmproxy/pavlovia_results_504.py
"""

from mitmproxy import http


def request(flow: http.HTTPFlow) -> None:
    request = flow.request
    host = request.host.lower().rstrip(".")

    if host != "pavlovia.org" and not host.endswith(".pavlovia.org"):
        return

    print(f"[pavlovia_results_504] Injecting 504 -> {request.method} {host}")

    headers = {
        "content-type": "text/plain; charset=utf-8",
        "cache-control": "no-store",
    }
    origin = request.headers.get("origin")
    if origin:
        headers["access-control-allow-origin"] = origin
        headers["vary"] = "Origin"

    flow.response = http.Response.make(
        504,
        b"504 Gateway Time-out",
        headers,
    )
