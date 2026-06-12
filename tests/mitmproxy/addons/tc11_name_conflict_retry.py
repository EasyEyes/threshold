"""
TC-11 addon: name-conflict auto-increment on POST /api/v4/projects.

First POST (name "myExp1")  → 400 {"message":{"name":["has already been taken"]}}
Second POST (name "myExp2") → 201 {"id":99,"path":"myExp2","name":"myExp2"}

Writes request count + last attempted name to /tmp/tc11_count.json so the
spec can assert exactly two POSTs were made (one conflict, one success).

Handles the CORS preflight OPTIONS that Chromium sends before the cross-origin
JSON POST (fixture.test → gitlab.pavlovia.test).
"""

import json
from mitmproxy import http

TARGET = "/api/v4/projects"
COUNT_FILE = "/tmp/tc11_count.json"
_count = 0
_CORS = {
    "access-control-allow-origin": "*",
    "content-type": "application/json",
}


def request(flow: http.HTTPFlow) -> None:
    global _count

    if TARGET not in flow.request.pretty_url:
        return

    # Respond to CORS preflight before the actual POST arrives.
    if flow.request.method == "OPTIONS":
        flow.response = http.Response.make(
            200,
            b"",
            {
                "access-control-allow-origin": "*",
                "access-control-allow-methods": "POST, OPTIONS",
                "access-control-allow-headers": "content-type, authorization",
            },
        )
        return

    if flow.request.method != "POST":
        return

    body = json.loads(flow.request.content.decode("utf-8"))
    name = body.get("name", "")
    _count += 1

    with open(COUNT_FILE, "w") as f:
        json.dump({"count": _count, "lastName": name}, f)

    if name == "myExp1":
        print(f"[TC-11] Injecting 400 'already been taken' for name={name!r} (attempt {_count})")
        flow.response = http.Response.make(
            400,
            json.dumps({"message": {"name": ["has already been taken"]}}),
            _CORS,
        )
    else:
        print(f"[TC-11] Returning 201 for name={name!r} (attempt {_count})")
        flow.response = http.Response.make(
            201,
            json.dumps({"id": 99, "path": name, "name": name}),
            _CORS,
        )
