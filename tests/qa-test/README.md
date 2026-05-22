# QA Tests — Real Pavlovia Integration

These tests require a live Pavlovia account and a real experiment session.
They are **not** part of the automated CI suite (`tests/mitmproxy/`) and are
intended to be run manually by QA staff.

---

## Prerequisites

- `mitmproxy` installed: `pip install mitmproxy`
- mitmproxy CA certificate trusted in the browser (visit `http://mitm.it` in
  the browser you'll use and follow the instructions — required once per machine)
- Browser proxy configured to `localhost:8080` (or use a system proxy setting)
- An active Pavlovia account with a runnable experiment

---

## QA-01 — Transient 504 with real Pavlovia pass-through

**What it tests:** After two injected 504 errors on the `/results` endpoint,
the retry mechanism successfully delivers the CSV data to the real Pavlovia
server. Both the `.csv` and `.log.gz` must appear in the experiment's GitLab
data folder.

**Why this matters:** The automated TC-01 test verifies that `_retryablePavloviaPost`
retries correctly, but uses a synthesized 200 response — it never reaches
Pavlovia. This QA test confirms that the retried request is structurally valid
and that Pavlovia actually commits the file.

### Steps

1. Start the addon:

   ```bash
   mitmdump -s tests/qa-test/addons/qa01_real_pavlovia_retry.py
   ```

2. Open your browser (with proxy pointing to `localhost:8080`), sign in to
   Pavlovia, and run the experiment to completion.

3. Watch the `mitmdump` terminal. You should see:

   ```
   [QA-01] Injecting 504 (attempt 1) — request blocked
   [QA-01] Injecting 504 (attempt 2) — request blocked
   [QA-01] Passing through to real Pavlovia (attempt 3)
   ```

4. The experiment UI should show a "saving" status, then complete normally
   (no error dialog).

5. On Pavlovia, open the experiment's **Data** tab (or check the GitLab repo
   under `data/`). Verify:

   - [ ] A `.csv` file with the participant's session name and timestamp is present
   - [ ] A `.log.gz` file with a matching name is present

### What a failure looks like

- `.log.gz` present but **no `.csv`** — the retry succeeded from the browser's
  perspective but the data never reached Pavlovia. Check that `attempt 3` was
  logged as "Passing through" (not "Injecting 504").
- Both files missing — the experiment may have been in pilot mode or
  `skipSave: true` was set.

### Resetting between runs

The request counter is global per `mitmdump` process. **Restart `mitmdump`**
before each test run to reset it.

---

## QA-02 — One 504 on both endpoints, then real Pavlovia pass-through

**What it tests:** After one injected 504 on both `/results` and `/logs`
independently, the retry mechanism delivers both the CSV and the log to
Pavlovia. Mirrors automated TC-08 but with real server-side verification.

**Why this matters:** TC-08 uses synthesized 200s on both endpoints. This QA
test confirms both upload paths produce files that Pavlovia actually commits.

### Steps

1. Start the addon:

   ```bash
   mitmdump -s tests/qa-test/addons/qa02_both_endpoints_real_pavlovia.py
   ```

2. Run the experiment to completion with the browser proxied through
   `localhost:8080`.

3. Watch the `mitmdump` terminal. You should see one 504 then one pass-through
   for each endpoint:

   ```
   [QA-02] Injecting 504 on /results (attempt 1) — request blocked
   [QA-02] Injecting 504 on /logs (attempt 1) — request blocked
   [QA-02] Passing through to real Pavlovia on /results (attempt 2)
   [QA-02] Passing through to real Pavlovia on /logs (attempt 2)
   ```

   (Order of `/results` and `/logs` lines may interleave.)

4. On Pavlovia, verify:

   - [ ] `.csv` file present in the experiment's data folder
   - [ ] `.log.gz` file present in the experiment's data folder

### Resetting between runs

**Restart `mitmdump`** between runs to reset both endpoint counters.
