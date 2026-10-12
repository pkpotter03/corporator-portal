# Corporator Portal

Bilingual (English/Marathi) portfolio website + birthday reminder system for a
municipal corporator's office. Everything that isn't code lives in one Google
Sheet + a Drive folder, so office staff — who already know Sheets — can run
this without any admin panel or login system.

## Repo layout

- `web/` — the Next.js bilingual site + staff-only birthday calendar
- `apps-script/Code.gs` — paste into the Sheet's Apps Script editor; sends the
  daily birthday-reminder email
- `scripts/convert-legacy-data.mjs` — one-time converter for the raw data dump
  format into a `People`-tab-ready CSV
- `sheets-templates/` — the exact column headers each Sheet tab needs
  (`People.csv`, `Content.csv`, `Gallery.csv`)

## 1. Set up the Google Sheet

1. Create a new Google Sheet. Create three tabs named exactly `People`,
   `Content`, `Gallery` (the `Upcoming` tab gets created automatically by the
   Apps Script on first run).
2. Import each `sheets-templates/*.csv` file into its matching tab (File >
   Import > Upload > Insert new sheet, or paste the header + example row
   manually) so the column headers match exactly what the code expects.
3. Share the Sheet with office staff as **Editor** — that sharing permission
   *is* the access control for this whole project, no separate accounts
   needed.
4. For the `People` tab, after importing real data, double-check column C
   (DOB) is formatted as **Date** (Format > Number > Date) so both the
   website and Apps Script parse it reliably.

### Loading the existing 5k-20k records

The real data (see `sample` in the repo) isn't in CSV form — run:

```sh
node scripts/convert-legacy-data.mjs sample people-import.csv
```

Review the console warnings (rows with no address, out-of-range dates, etc.)
before importing `people-import.csv` into the `People` tab via File > Import
(append, don't replace the header row).

### Publishing Content/Gallery (public, no API key needed)

For the `Content` and `Gallery` tabs only:
File > Share > Publish to web > select the tab > CSV format > Publish. Copy
each resulting URL — these become `CONTENT_CSV_URL` and `GALLERY_CSV_URL`.

**Do not** do this for the `People` tab — that data is sensitive (see below).

### Gallery photos (via Drive, not file upload)

Create a shared Drive folder for photos. To add a photo: upload it to that
folder, right-click > Share > "Anyone with the link" > Viewer, copy the link,
and add a row to the `Gallery` tab with that link + captions.

## 2. Google Sheets access for the sensitive `People` data

The public site never reads `People` directly — only the staff calendar page
does, server-side, via the Sheets API. This uses a **service account**, not a
plain API key — a bare API key has no identity of its own and can only read a
Sheet that's shared "anyone with the link," which would defeat the point of
keeping `People` private. A service account instead gets added to the Sheet's
sharing list like any other collaborator.

1. In [Google Cloud Console](https://console.cloud.google.com/), create a
   project (or reuse one), enable the **Google Sheets API**.
2. IAM & Admin > Service Accounts > Create Service Account. Any name is fine;
   no roles need to be granted at the project level.
3. Open the new service account > Keys > Add Key > Create new key > **JSON**.
   This downloads a JSON file — keep it private, it's a credential.
4. Open the Sheet > Share, and add the service account's email (the
   `client_email` field in that JSON, looks like
   `name@project.iam.gserviceaccount.com`) as a **Viewer**.
5. From the downloaded JSON, copy:
   - `client_email` → `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` → `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY` (copy the whole
     value including the `-----BEGIN/END PRIVATE KEY-----` lines and `\n`
     sequences, exactly as it appears in the JSON, wrapped in quotes)
6. Copy the Sheet's ID from its URL
   (`docs.google.com/spreadsheets/d/THE_ID_IS_HERE/edit`) → `PEOPLE_SHEET_ID`.

### Staff login

The "Staff Use" link in the site nav leads to a password gate
(`src/lib/staffAuth.ts`) in front of the birthday calendar — one shared
password for the office, not individual accounts. Set:

- `STAFF_PASSWORD` — whatever password the office will use
- `SESSION_SECRET` — any long random string (signs the login cookie; nobody
  types this one). Generate one with, e.g., `openssl rand -hex 32`.

To change the password later, just update `STAFF_PASSWORD` and redeploy —
everyone's existing login cookie keeps working since it's not derived from
the password itself (see `src/lib/staffAuth.ts` for why). If you want to
force everyone to log in again, rotate `SESSION_SECRET` too.

## 3. Apps Script (daily reminder email)

1. In the Sheet: Extensions > Apps Script, replace the default code with
   `apps-script/Code.gs`.
2. Project Settings > Script Properties, add:
   - `LEAD_DAYS` — e.g. `7`
   - `RECIPIENT_EMAILS` — comma-separated staff emails
   - `STAFF_CALENDAR_URL` — (optional, fill in after deploying) the
     `/staff/birthdays` URL, included as a convenience link in the email
3. Run `setup` once from the editor and authorize when prompted — installs
   the daily trigger.
4. Run `sendDailyDigest` manually to send a test email right away.

This runs entirely inside Google — it keeps working even if the website is
ever down.

## 4. Website — local development

```sh
cd web
cp .env.local.example .env.local   # fill in the values from steps 1-2
npm install
npm run dev
```

Visit `http://localhost:3000/en` or `/mr`. The staff calendar is behind
"Staff Use" in the nav, or directly at `/staff/birthdays` (redirects to
`/staff/login` if you're not signed in).

## 5. Deploy

1. Push this repo to GitHub.
2. Import it into [Vercel](https://vercel.com/new), set the project root to
   `web/`.
3. Add all seven env vars from `.env.local.example` in Vercel's project
   settings. For `GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY`, paste it exactly as
   it is in `.env.local` (with the literal `\n` sequences) — Vercel's env
   var editor stores it as given, and the app converts `\n` back to real
   newlines at runtime.
4. Deploy. Vercel's free Hobby tier covers this comfortably.
5. Buy a domain and connect it under the Vercel project's Domains settings.
6. Go back to the Sheet's Script Properties and fill in `STAFF_CALENDAR_URL`
   with the real deployed URL (e.g. `https://yourdomain.com/staff/birthdays`).

## Notes

- The Marathi strings in `web/messages/mr.json` and any Marathi content typed
  into the `Content` tab are a first-pass translation — have someone from the
  office review tone/accuracy before treating the site as final.
- The staff calendar is gated by one shared office password, not individual
  accounts — simple on purpose. If the office ever outgrows that (wants an
  audit trail of who logged in, or per-person access control), that's a
  bigger change (real user accounts) rather than a tweak to this setup.
