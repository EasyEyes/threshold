"""
Scenario: Two network-level errors (ERR_NETWORK_CHANGED / TypeError) then success.

mitmproxy kills the TCP connection before the server responds on the first two
attempts. Chrome's fetch rejects with a TypeError, which apiRequest should retry.
On the third request the connection is allowed through normally.

Expected behaviour: project listing completes normally after a brief pause.

Run:
    mitmproxy -s network_error_two_then_ok.py

Note: flow.kill() sends a TCP RST. Chrome will report net::ERR_CONNECTION_RESET,
which surfaces in JavaScript as `new TypeError("Failed to fetch")`.
"""

from mitmproxy import http

TARGET = "gitlab.pavlovia.org/api/v4"
_counts: dict[str, int] = {}


def request(flow: http.HTTPFlow) -> None:
    if TARGET not in flow.request.pretty_url:
        return
    key = flow.request.path
    _counts[key] = _counts.get(key, 0) + 1
    attempt = _counts[key]
    if attempt <= 2:
        print(f"[network_error] Killing connection (attempt {attempt}) → {key}")
        flow.kill()
    else:
        print(f"[network_error] Allowing through (attempt {attempt}) → {key}")
