import "server-only";
import { JWT } from "google-auth-library";
import type { Person } from "./birthdayUtils";

/**
 * Reads the `People` tab via the authenticated Google Sheets API, never via
 * a public "publish to web" CSV link — that data is full name/DOB/address
 * for thousands of residents and must never be reachable by an
 * unauthenticated public URL. This module is `server-only`: if anything
 * tries to import it from client code, the build fails instead of silently
 * shipping credentials (or the data) to the browser.
 *
 * Auth is a Google Cloud *service account*, not a plain API key. A bare API
 * key has no identity of its own — it can only read a Sheet that's shared
 * "anyone with the link," which would defeat the point of keeping `People`
 * private. The service account is instead added to the Sheet's sharing list
 * like any other collaborator (Viewer), so the Sheet stays restricted to
 * named people/accounts while the server can still read it.
 *
 * Pure helpers that client components also need (grouping, age calculation)
 * live in birthdayUtils.ts instead, which has no such restriction.
 */

const PEOPLE_RANGE = "People!A2:G";

let jwtClient: JWT | null = null;

function getClient(): JWT {
  if (jwtClient) return jwtClient;
  const email = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL;
  const rawKey = process.env.GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY;
  if (!email || !rawKey) {
    throw new Error(
      "GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_SERVICE_ACCOUNT_PRIVATE_KEY must be set to read the People sheet."
    );
  }
  jwtClient = new JWT({
    email,
    // Env vars store the private key as a single line with literal "\n"
    // sequences; the PEM format needs those turned back into real newlines.
    key: rawKey.replace(/\\n/g, "\n"),
    scopes: ["https://www.googleapis.com/auth/spreadsheets.readonly"],
  });
  return jwtClient;
}

function parseDob(raw: string): Person["dob"] | null {
  const trimmed = raw.trim();
  // Accepts D/M/YYYY, DD-MM-YYYY, or an ISO-ish YYYY-MM-DD (Sheets API can
  // return either depending on column formatting).
  let match = trimmed.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{4})$/);
  if (match) {
    const [, d, m, y] = match;
    return { day: Number(d), month: Number(m), year: Number(y) };
  }
  match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
  if (match) {
    const [, y, m, d] = match;
    return { day: Number(d), month: Number(m), year: Number(y) };
  }
  return null;
}

export async function fetchPeople(): Promise<Person[]> {
  const sheetId = process.env.PEOPLE_SHEET_ID;
  if (!sheetId) {
    throw new Error("PEOPLE_SHEET_ID must be set to read the People sheet.");
  }

  const client = getClient();
  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    PEOPLE_RANGE
  )}`;

  let rows: string[][];
  try {
    const res = await client.request<{ values?: string[][] }>({ url });
    rows = res.data.values ?? [];
  } catch (e) {
    const status = (e as { response?: { status?: number } })?.response?.status;
    throw new Error(
      status
        ? `Failed to fetch People sheet (${status}). Confirm the service account email has been added as a Viewer on the Sheet.`
        : `Failed to fetch People sheet: ${e instanceof Error ? e.message : String(e)}`
    );
  }

  const people: Person[] = [];
  for (const row of rows) {
    const [id, name, dobRaw, address, ward, phone, notes] = row;
    if (!name || !dobRaw) continue;
    const dob = parseDob(dobRaw);
    if (!dob) continue; // skip rows with missing/unparseable DOB
    people.push({
      id: id ?? "",
      name: name.trim(),
      dob,
      address: (address ?? "").trim(),
      ward: (ward ?? "").trim(),
      phone: (phone ?? "").trim(),
      notes: (notes ?? "").trim(),
    });
  }
  return people;
}

export { groupByMonthDay } from "./birthdayUtils";
export type { Person, MonthDayIndex } from "./birthdayUtils";
