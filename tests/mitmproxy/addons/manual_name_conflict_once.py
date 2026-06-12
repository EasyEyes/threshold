"""
Manual dev-testing addon: inject one name-conflict, then pass through.

Use this when running the app locally to test the auto-increment flow
with real Pavlovia credentials.

  mitmdump -p 8080 -s manual_name_conflict_once.py

Then configure your browser to use http://localhost:8080 as proxy and
trust the mitmproxy CA (run `mitmproxy` once and visit mitm.it in the
browser, or install ~/.mitmproxy/mitmproxy-ca-cert.pem).

Flow:
  1st POST /api/v4/projects → 400 "has already been taken"
  All subsequent requests  → pass through to real Pavlovia unchanged
"""

import json
from mitmproxy import http

TARGET = "/api/v4/projects"
_injected = False


def request(flow: http.HTTPFlow) -> None:
    global _injected

    if TARGET not in flow.request.pretty_url:
        return
    if flow.request.method != "POST":
        return
    if _injected:
        # Second attempt: let it reach real Pavlovia so a real project ID comes back.
        print("[manual] Passing through POST /projects to real Pavlovia")
        return

    _injected = True
    body = json.loads(flow.request.content.decode("utf-8"))
    name = body.get("name", "")
    print(f"[manual] Injecting 400 'already been taken' for name={name!r}")
    flow.response = http.Response.make(
        400,
        json.dumps({"message": {"name": ["has already been taken"]}}),
        {"access-control-allow-origin": "*", "content-type": "application/json"},
    )
