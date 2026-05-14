"""
Scenario: Three HTTP 500s — retry exhaustion.

Every request to the Pavlovia API returns 500. apiRequest should exhaust all
3 attempts and throw. The EasyEyes UI should surface an error (Swal alert or
console) rather than freezing permanently on the spinner.

Run:
    mitmproxy -s 500_exhausted.py
"""

from mitmproxy import http

TARGET = "gitlab.pavlovia.org/api/v4"
_counts: dict[str, int] = {}


def response(flow: http.HTTPFlow) -> None:
    if TARGET not in flow.request.pretty_url:
        return
    key = flow.request.path
    _counts[key] = _counts.get(key, 0) + 1
    print(f"[500_exhausted] Injecting 500 (attempt {_counts[key]}) → {key}")
    flow.response = http.Response.make(
        500,
        b'{"message":"500 Internal Server Error (injected)"}',
        {"content-type": "application/json"},
    )
