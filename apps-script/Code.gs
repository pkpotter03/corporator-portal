/**
 * Birthday reminder digest — bound to the "People" Google Sheet.
 *
 * Setup (one-time):
 *   1. Extensions > Apps Script, paste this file in as Code.gs.
 *   2. Project Settings > Script Properties, add:
 *        LEAD_DAYS            e.g. "7"
 *        RECIPIENT_EMAILS     comma-separated, e.g. "staff1@example.com,staff2@example.com"
 *        STAFF_CALENDAR_URL   (optional) link to the deployed /staff/birthdays page
 *   3. Run `setup` once from the editor (authorize when prompted) — installs
 *      the daily trigger.
 *   4. Run `sendDailyDigest` manually to send a test email immediately.
 *
 * Sheet layout expected on the "People" tab (row 1 = header):
 *   A: ID | B: Name | C: DOB | D: Address | E: Ward | F: Phone | G: Notes
 */

const PEOPLE_SHEET_NAME = "People";
const UPCOMING_SHEET_NAME = "Upcoming";
const DEFAULT_LEAD_DAYS = 7;

function setup() {
  // Avoid stacking duplicate triggers if run more than once.
  ScriptApp.getProjectTriggers()
    .filter((t) => t.getHandlerFunction() === "sendDailyDigest")
    .forEach((t) => ScriptApp.deleteTrigger(t));

  ScriptApp.newTrigger("sendDailyDigest")
    .timeBased()
    .everyDays(1)
    .atHour(7)
    .create();

  Logger.log("Daily trigger installed for sendDailyDigest at ~7am.");
}

function getConfig_() {
  const props = PropertiesService.getScriptProperties();
  const leadDaysRaw = props.getProperty("LEAD_DAYS");
  const leadDays = leadDaysRaw ? parseInt(leadDaysRaw, 10) : DEFAULT_LEAD_DAYS;
  const recipientsRaw = props.getProperty("RECIPIENT_EMAILS") || "";
  const recipients = recipientsRaw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
  const calendarUrl = props.getProperty("STAFF_CALENDAR_URL") || "";
  return { leadDays: leadDays > 0 ? leadDays : DEFAULT_LEAD_DAYS, recipients, calendarUrl };
}

/**
 * Parses a DOB cell value into { month, day, year } — handles real Date
 * objects (normal case, when the column is Date-formatted) and common
 * text formats (D/M/YYYY, DD-MM-YYYY) as a fallback. Returns null if the
 * cell can't be parsed, so the caller can skip that row instead of
 * crashing the whole run.
 */
function parseDob_(value) {
  if (value instanceof Date && !isNaN(value.getTime())) {
    return { month: value.getMonth() + 1, day: value.getDate(), year: value.getFullYear() };
  }
  if (typeof value === "string" && value.trim()) {
    const trimmed = value.trim();
    let match = trimmed.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
    if (match) {
      const day = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const year = parseInt(match[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { month, day, year };
      }
    }
    match = trimmed.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (match) {
      const year = parseInt(match[1], 10);
      const month = parseInt(match[2], 10);
      const day = parseInt(match[3], 10);
      if (month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        return { month, day, year };
      }
    }
  }
  return null;
}

/**
 * Returns people whose next birthday falls within [0, leadDays] days from
 * now, sorted soonest-first. Feb 29 is treated as Feb 28 in non-leap years
 * so those birthdays are never silently skipped.
 */
function getUpcomingBirthdays(leadDays) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(PEOPLE_SHEET_NAME);
  if (!sheet) throw new Error(`Sheet "${PEOPLE_SHEET_NAME}" not found.`);

  const values = sheet.getDataRange().getValues();
  const rows = values.slice(1); // skip header

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const results = [];

  rows.forEach((row) => {
    const [id, name, dobRaw, address, ward, phone] = row;
    if (!name) return;

    const dob = parseDob_(dobRaw);
    if (!dob) return; // skip missing/unparseable DOB rather than failing the run

    let month = dob.month;
    let day = dob.day;
    if (month === 2 && day === 29 && !isLeapYear_(today.getFullYear())) {
      day = 28;
    }

    let nextBirthday = new Date(today.getFullYear(), month - 1, day);
    if (nextBirthday < today) {
      nextBirthday = new Date(today.getFullYear() + 1, month - 1, day);
    }

    const daysUntil = Math.round((nextBirthday - today) / (1000 * 60 * 60 * 24));
    if (daysUntil >= 0 && daysUntil <= leadDays) {
      const age = dob.year ? nextBirthday.getFullYear() - dob.year : null;
      results.push({
        id,
        name,
        address: address || "",
        ward: ward || "",
        phone: phone || "",
        date: nextBirthday,
        daysUntil,
        age,
      });
    }
  });

  results.sort((a, b) => a.daysUntil - b.daysUntil);
  return results;
}

function isLeapYear_(year) {
  return (year % 4 === 0 && year % 100 !== 0) || year % 400 === 0;
}

function sendDailyDigest() {
  const { leadDays, recipients, calendarUrl } = getConfig_();

  if (recipients.length === 0) {
    Logger.log("No RECIPIENT_EMAILS configured in Script Properties — skipping send.");
    return;
  }

  const upcoming = getUpcomingBirthdays(leadDays);
  writeUpcomingSheet_(upcoming);

  const today = upcoming.filter((p) => p.daysUntil === 0);
  const later = upcoming.filter((p) => p.daysUntil > 0);

  const html = buildDigestHtml_(today, later, leadDays, calendarUrl);
  const subject =
    today.length > 0
      ? `Birthdays TODAY (${today.length}) + upcoming — ${formatDate_(new Date())}`
      : `Upcoming birthdays (next ${leadDays} days) — ${formatDate_(new Date())}`;

  MailApp.sendEmail({
    to: recipients.join(","),
    subject,
    htmlBody: html,
  });

  Logger.log(`Digest sent to ${recipients.join(", ")}: ${today.length} today, ${later.length} upcoming.`);
}

function writeUpcomingSheet_(upcoming) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(UPCOMING_SHEET_NAME);
  if (!sheet) sheet = ss.insertSheet(UPCOMING_SHEET_NAME);
  sheet.clear();

  const header = ["Name", "Date", "Days Away", "Turning Age", "Address", "Ward", "Phone"];
  const rows = upcoming.map((p) => [
    p.name,
    formatDate_(p.date),
    p.daysUntil,
    p.age ?? "",
    p.address,
    p.ward,
    p.phone,
  ]);
  sheet.getRange(1, 1, 1, header.length).setValues([header]);
  if (rows.length > 0) {
    sheet.getRange(2, 1, rows.length, header.length).setValues(rows);
  }
  sheet.setFrozenRows(1);
}

function buildDigestHtml_(today, later, leadDays, calendarUrl) {
  const rowHtml = (p) =>
    `<tr>
      <td style="padding:4px 8px;">${escapeHtml_(p.name)}${p.age !== null ? ` (turning ${p.age})` : ""}</td>
      <td style="padding:4px 8px;">${formatDate_(p.date)}</td>
      <td style="padding:4px 8px;">${escapeHtml_(p.address)}</td>
      <td style="padding:4px 8px;">${escapeHtml_(p.phone)}</td>
    </tr>`;

  const section = (title, people) =>
    people.length === 0
      ? ""
      : `<h3 style="margin:16px 0 4px;">${title}</h3>
         <table style="border-collapse:collapse;width:100%;font-family:sans-serif;font-size:14px;">
           <tr style="text-align:left;border-bottom:1px solid #ddd;">
             <th style="padding:4px 8px;">Name</th>
             <th style="padding:4px 8px;">Date</th>
             <th style="padding:4px 8px;">Address</th>
             <th style="padding:4px 8px;">Phone</th>
           </tr>
           ${people.map(rowHtml).join("")}
         </table>`;

  const linkHtml = calendarUrl
    ? `<p style="margin-top:16px;"><a href="${calendarUrl}">Browse the full birthday calendar →</a></p>`
    : "";

  return `
    <div style="font-family:sans-serif;">
      ${section(`🎂 Today (${today.length})`, today)}
      ${section(`Coming up in the next ${leadDays} days (${later.length})`, later)}
      ${today.length === 0 && later.length === 0 ? "<p>No birthdays in this window.</p>" : ""}
      ${linkHtml}
    </div>`;
}

function formatDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), "dd MMM yyyy");
}

function escapeHtml_(str) {
  return String(str || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}
