# Portal Launch Plan

Everything left between the committed codebase and a live, password-protected
site your friend's office can run day to day — Google Sheet setup through
deployment, plus what to hand over at the end.

Status: code is built, tested, and committed locally (commit `1300305`).
Nothing has been pushed to GitHub or deployed yet. The phases below pick up
from there. Budget roughly 2-3 hours of active work, most of it waiting on
Google/Vercel UI steps rather than anything technical.

---

## Phase A — Set up the Google Sheet

This Sheet is the entire database — `People`, `Content`, `Gallery` tabs,
matching the headers in `sheets-templates/`.

- [x] Create a new Google Sheet. Create three tabs named exactly `People`,
      `Content`, `Gallery`. (An `Upcoming` tab gets created automatically
      later, by the Apps Script.)
- [x] Import each `sheets-templates/*.csv` file into its matching tab so
      column headers match exactly (File > Import > Upload > Insert new
      sheet).
- [x] Share the Sheet with office staff as **Editor**. This sharing
      permission is the entire access-control model for the data layer — no
      separate accounts.
- [x] Format `People` column C (DOB) as **Date** — Format > Number > Date.
- [x] Convert the real resident data and review the warnings before
      importing:
      ```sh
      node scripts/convert-legacy-data.mjs sample people-import.csv
      ```
      Import `people-import.csv` into `People` via File > Import, appending
      below the header row — don't replace it.
- [x] Publish **only** the `Content` and `Gallery` tabs to the web as CSV —
      File > Share > Publish to web > select tab > CSV. Copy each URL; these
      become `CONTENT_CSV_URL` and `GALLERY_CSV_URL`. **Do not** publish
      `People` this way — that's resident PII and goes through the
      authenticated API path in Phase B instead.
- [x] Create a shared Drive folder for gallery photos. Per photo: upload >
      Share > "Anyone with the link" > Viewer > copy link > add a row to
      `Gallery` with that link and captions.
      **Checked in error** — the Gallery tab currently still only has the
      placeholder template row (`EXAMPLE_FILE_ID` / "Public event"). Add a
      real photo before this is actually done.
- [x] Fill in the `Content` tab: `name`, `tagline`, `biography`,
      `officePhone`, `officeEmail`, `officeAddress` — both EN and MR columns.
      **Checked in error** — the Content tab currently still has the
      template's placeholder values (`Full Name`, `office@example.com`,
      etc.), not real content yet.

## Phase B — Google Sheets access for `People` (service account)

For the `People` tab only — read server-side, never via a public CSV link,
because it's full name/DOB/address for thousands of residents.

**Revised:** a plain API key turned out not to work — it has no identity of
its own, so it can only read a Sheet that's link-shared publicly, which this
one deliberately isn't (confirmed with a live test: the original API key
request came back `403 PERMISSION_DENIED`). Switched to a **service
account** instead, which gets added to the Sheet's sharing list like any
other collaborator, keeping `People` genuinely private. `src/lib/sheetsApi.ts`
has already been updated for this — these steps replace the old ones.

- [x] In [Google Cloud Console](https://console.cloud.google.com/), create or
      reuse a project, then enable the **Google Sheets API**.
- [x] IAM & Admin > Service Accounts > Create Service Account (any name, no
      project-level roles needed).
- [x] Open the service account > Keys > Add Key > Create new key > **JSON**.
      Downloads a credentials file — keep it private.
- [x] Open the Sheet > Share > add the service account's email (the
      `client_email` field in that JSON) as a **Viewer**.
- [x] From the JSON, copy `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL` and
      `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (the whole value,
      `\n` sequences and all) into `.env.local`.
- [x] Copy the Sheet ID out of its URL into `PEOPLE_SHEET_ID`:
      `docs.google.com/spreadsheets/d/THE_ID_IS_HERE/edit`
- [x] Verify it actually works — run the app locally and confirm
      `/staff/birthdays` loads real data instead of a fetch error.

## Phase C — Apps Script (daily reminder email)

Runs entirely inside Google. It keeps sending reminders even if the website
is ever down.

- [x] In the Sheet: Extensions > Apps Script. Replace the default code with
      `apps-script/Code.gs` from the repo.
- [x] Project Settings > Script Properties — add:

      | Property | Example |
      |---|---|
      | `LEAD_DAYS` | `7` |
      | `RECIPIENT_EMAILS` | `staff1@example.com,staff2@example.com` |
      | `STAFF_CALENDAR_URL` | fill in after Phase F — leave blank for now |

- [x] Run `setup` once from the editor and authorize when prompted —
      installs the daily trigger (~7am).
- [x] Run `sendDailyDigest` manually. Confirm a test email arrives and the
      `Upcoming` tab populates.
- [x] Check the clock icon (Triggers) — confirm the daily trigger is listed.

## Phase D — Local configuration & smoke test

Prove it works on your machine before anything goes near the internet.

- [x] Copy the env template and fill in all seven values from Phases A, B,
      and your chosen staff password:
      ```sh
      cd web
      cp .env.local.example .env.local
      ```
- [x] Install and build:
      ```sh
      npm install
      npm run build && npm start
      ```
      On Windows, prefer `build && start` over `npm run dev` — Turbopack's
      dev-mode file watching can hit Windows file-lock errors that don't
      affect the production build.
- [x] Visit `/en` and `/mr` — confirm the tagline, biography, and gallery
      photos pull from the Sheet correctly.
- [x] Click **Staff Use** in the header > log in with `STAFF_PASSWORD` >
      browse the birthday calendar > log out > confirm it redirects back to
      the login screen.

## Phase E — Push to GitHub

A private repo is the sensible default here — no PII is committed, but it's
still a client project.

- [x] Create a new empty repository on GitHub (don't initialize it with a
      README — this repo already has one).
- [ ] Add the remote and push:
      ```sh
      git remote add origin https://github.com/<you>/<repo>.git
      git push -u origin main
      ```

## Phase F — Deploy: Vercel & domain

Free Hobby tier comfortably covers this project's traffic.

- [ ] Import the repo at [vercel.com/new](https://vercel.com/new). Set the
      project root directory to `web/`.
- [ ] Add all seven env vars under Project Settings > Environment Variables,
      then deploy:

      | Variable | Source |
      |---|---|
      | `CONTENT_CSV_URL` | Phase A |
      | `GALLERY_CSV_URL` | Phase A |
      | `GOOGLE_SERVICE_ACCOUNT_EMAIL` | Phase B |
      | `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` | Phase B — paste with the literal `\n` sequences intact |
      | `PEOPLE_SHEET_ID` | Phase B |
      | `STAFF_PASSWORD` | your choice |
      | `SESSION_SECRET` | e.g. `openssl rand -hex 32` |

- [ ] Visit the `*.vercel.app` URL and repeat Phase D's smoke test against
      production.
- [ ] Buy the domain, add it under the Vercel project's Domains settings,
      and follow the DNS instructions at the registrar.
- [ ] Once DNS resolves, confirm `https://yourdomain` loads over HTTPS.
- [ ] Back in Script Properties (Phase C), set `STAFF_CALENDAR_URL` to the
      real domain, then re-run `sendDailyDigest` to confirm the link renders
      correctly in the email.

## Phase G — Launch QA

Run this against the live domain, not localhost, right before telling anyone
it's ready.

- [ ] EN and MR both render with no missing translation keys and correct
      Devanagari glyphs.
- [ ] Home/About/Gallery content matches what's currently in the Sheet.
- [ ] Editing a `Content` or `Gallery` row shows up on the live site within
      the hour (ISR revalidate window), with no redeploy.
- [ ] Unauthenticated visit to `/staff/birthdays` redirects to
      `/staff/login`, in a fresh/incognito window.
- [ ] Wrong password is rejected with a clear message; correct password logs
      in and the session survives a reload.
- [ ] Birthday calendar month → day → list drill-down matches real `People`
      rows; an empty day shows a clear empty state, not an error.
- [ ] Apps Script: test rows at day 0 / 3 / 7 (boundary) / 8 behave
      correctly; a blank or Feb 29 DOB doesn't break the run.
- [ ] Domain resolves over HTTPS with no certificate warnings.

## Phase H — Client handover

What to hand the office, and what to teach them, so the site doesn't
quietly depend on you forever.

### Access to hand over

- **Google Sheet** — Editor access for whoever updates resident data and
  site content day to day.
- **Drive photo folder** — same staff, for gallery uploads.
- **Staff login password** — share verbally or via a secure channel, not
  plain SMS/email.
- **Domain registrar login** — recommend the office (or your friend) owns
  this directly, so renewal never depends on a third party.
- **Vercel project** — add your friend as a collaborator if he wants
  visibility into deploys.
- **GitHub repo** — only if someone else may need to maintain the code
  later.

### Stays with you (for now)

- Apps Script Properties — changing the reminder lead-time or recipient
  list requires opening the script editor, not just the Sheet.
- Any code change — new sections, design tweaks, new languages.
- Rotating `SESSION_SECRET` if you ever need to force every staff member to
  log in again.
- Vercel/DNS troubleshooting if the domain ever stops resolving.

### Office quick-reference

Plain-language answers for whoever runs this day to day — no code, no
jargon.

| Task | How |
|---|---|
| Add a new resident | Sheet > `People` tab > add a row: Name, DOB, Address, Phone (optional). |
| Update the About text | Sheet > `Content` tab > edit the `biography` row, EN and MR columns. Shows up within the hour. |
| Add a gallery photo | Upload to the shared Drive folder > share "Anyone with the link" > copy link > add a row in `Gallery` with captions. |
| Check upcoming birthdays | Either the `Upcoming` tab in the Sheet, or the website > **Staff Use** > password > browse by month and day. |
| Change reminder timing or recipients | Needs the developer — lives in the Apps Script editor, not the Sheet itself. |
| Something looks broken | Contact your developer with what page, what you expected, what you saw instead. |

**Worth saying out loud at handover:** two things the office should never
do — rename the Sheet tabs, and delete/reorder the header columns. Both will
quietly break the reminders and the website at the same time, with no error
message pointing back to the cause.
