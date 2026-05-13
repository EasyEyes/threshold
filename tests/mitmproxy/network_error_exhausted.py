"""
Scenario: Three network errors — retry exhaustion.

Every request to the Pavlovia API has its connection killed. apiRequest should
exhaust all 3 attempts and rethrow the TypeError. The EasyEyes UI should show
an error rather than spinning forever.

Run:
    mitmproxy -s network_error_exhausted.py
"""

from mitmproxy import http

TARGET = "gitlab.pavlovia.org/api/v4"
_counts: dict[str, int] = {}


def request(flow: http.HTTPFlow) -> None:
    if TARGET not in flow.request.pretty_url:
        return
    key = flow.request.path
    _counts[key] = _counts.get(key, 0) + 1
    print(f"[network_exhausted] Killing connection (attempt {_counts[key]}) → {key}")
    flow.kill()
