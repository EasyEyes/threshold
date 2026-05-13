"""
Scenario: 401, then token refresh itself fails → AUTH_TOKEN_INVALID thrown.

Every API request returns 401. The OAuth token refresh endpoint also returns 401
(or 400). apiRequest should throw AUTH_TOKEN_INVALID and the UI should surface
a clear auth error, not a frozen spinner.

Run:
    mitmproxy -s 401_refresh_fails.py
"""

from mitmproxy import http

API_TARGET = "gitlab.pavlovia.org/api/v4"
REFRESH_TARGET = "gitlab.pavlovia.org/oauth/token"


def response(flow: http.HTTPFlow) -> None:
    url = flow.request.pretty_url
    if REFRESH_TARGET in url:
        print(f"[401_refresh_fails] Blocking token refresh → 401")
        flow.response = http.Response.make(
            401,
            b'{"error":"invalid_grant","error_description":"Token is expired (injected)"}',
            {"content-type": "application/json"},
        )
        return
    if API_TARGET in url:
        print(f"[401_refresh_fails] Injecting 401 → {flow.request.path}")
        flow.response = http.Response.make(
            401,
            b'{"message":"401 Unauthorized (injected)"}',
            {"content-type": "application/json"},
        )
