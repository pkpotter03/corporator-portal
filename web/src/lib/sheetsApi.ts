import "server-only";
import type { Person } from "./birthdayUtils";

/**
 * Reads the `People` tab via the authenticated Google Sheets API, never via
 * a public "publish to web" CSV link — that data is full name/DOB/address
 * for thousands of residents and must never be reachable by an
 * unauthenticated public URL. This module is `server-only`: if anything
 * tries to import it from client code, the build fails instead of silently
 * shipping the API key (or the data) to the browser.
 *
 * Pure helpers that client components also need (grouping, age calculation)
 * live in birthdayUtils.ts instead, which has no such restriction.
 */

const PEOPLE_RANGE = "People!A2:G";

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
  const apiKey = process.env.GOOGLE_SHEETS_API_KEY;
  const sheetId = process.env.PEOPLE_SHEET_ID;
  if (!apiKey || !sheetId) {
    throw new Error(
      "GOOGLE_SHEETS_API_KEY and PEOPLE_SHEET_ID must be set to read the People sheet."
    );
  }

  const url = `https://sheets.googleapis.com/v4/spreadsheets/${sheetId}/values/${encodeURIComponent(
    PEOPLE_RANGE
  )}?key=${apiKey}`;

  const res = await fetch(url, { next: { revalidate: 300 } });
  if (!res.ok) {
    throw new Error(`Failed to fetch People sheet (${res.status})`);
  }
  const data = (await res.json()) as { values?: string[][] };
  const rows = data.values ?? [];

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
