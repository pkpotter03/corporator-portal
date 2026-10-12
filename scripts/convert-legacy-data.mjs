#!/usr/bin/env node
/**
 * One-time converter: turns the raw `sample`-style text dump (Name / DOB
 * [+ phone] / Address, inconsistently separated by blank lines or split
 * across multiple address lines — see the real `sample` file in the repo
 * root) into a CSV matching the `People` tab columns
 * (ID, Name, DOB, Address, Ward, Phone, Notes), ready for
 * File > Import in Google Sheets.
 *
 * This doesn't rely on blank lines as delimiters (the real data is
 * inconsistent about them) — instead it finds every line that looks like a
 * DOB, treats the nearest preceding non-blank line as the Name, and
 * collects every non-blank line between that DOB and the next detected
 * Name as the Address (joined with ", " if split across multiple lines).
 *
 * Usage: node scripts/convert-legacy-data.mjs <input-file> [output-file]
 */

import { readFileSync, writeFileSync } from "node:fs";

const inputPath = process.argv[2];
const outputPath = process.argv[3] ?? "people-import.csv";

if (!inputPath) {
  console.error("Usage: node scripts/convert-legacy-data.mjs <input-file> [output-file]");
  process.exit(1);
}

const DOB_REGEX = /(\d{1,2})[/-](\d{1,2})[/-](\d{4})/;
const PHONE_REGEX = /(\d{7,})/;

const raw = readFileSync(inputPath, "utf-8");
const lines = raw.split(/\r?\n/).map((l) => l.trim());

const dobLineIndexes = [];
lines.forEach((line, i) => {
  if (DOB_REGEX.test(line)) dobLineIndexes.push(i);
});

function nearestNonBlankBefore(index) {
  for (let i = index - 1; i >= 0; i--) {
    if (lines[i]) return i;
  }
  return -1;
}

const records = [];
const warnings = [];

dobLineIndexes.forEach((dobIndex, blockIndex) => {
  const nameIndex = nearestNonBlankBefore(dobIndex);
  if (nameIndex === -1) {
    warnings.push(`Line ${dobIndex + 1}: found a DOB with no preceding name line, skipped.`);
    return;
  }
  const name = lines[nameIndex];

  const dobMatch = lines[dobIndex].match(DOB_REGEX);
  const [, dStr, mStr, yStr] = dobMatch;
  const day = parseInt(dStr, 10);
  const month = parseInt(mStr, 10);
  const year = parseInt(yStr, 10);
  if (month < 1 || month > 12 || day < 1 || day > 31) {
    warnings.push(`Line ${dobIndex + 1}: "${lines[dobIndex]}" has an out-of-range date, skipped.`);
    return;
  }
  const isoDob = `${year.toString().padStart(4, "0")}-${month.toString().padStart(2, "0")}-${day
    .toString()
    .padStart(2, "0")}`;

  const remainderAfterDob = lines[dobIndex].slice(dobMatch.index + dobMatch[0].length);
  const phoneMatch = remainderAfterDob.match(PHONE_REGEX);
  const phone = phoneMatch ? phoneMatch[1] : "";

  // Address = every non-blank line after the DOB line, up to (but not
  // including) the next block's name line.
  const nextDobIndex = dobLineIndexes[blockIndex + 1];
  const nextNameIndex = nextDobIndex !== undefined ? nearestNonBlankBefore(nextDobIndex) : lines.length;
  const addressLines = [];
  for (let i = dobIndex + 1; i < nextNameIndex; i++) {
    if (lines[i]) addressLines.push(lines[i]);
  }
  const address = addressLines.join(", ");

  if (!address) {
    warnings.push(`"${name}" (line ${nameIndex + 1}): no address lines found.`);
  }

  records.push({
    id: records.length + 1,
    name,
    dob: isoDob,
    address,
    ward: "",
    phone,
    notes: "",
  });
});

function csvEscape(value) {
  const str = String(value ?? "");
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

const header = ["ID", "Name", "DOB", "Address", "Ward", "Phone", "Notes"];
const csvLines = [header.join(",")];
for (const r of records) {
  csvLines.push(
    [r.id, r.name, r.dob, r.address, r.ward, r.phone, r.notes].map(csvEscape).join(",")
  );
}

writeFileSync(outputPath, csvLines.join("\n") + "\n", "utf-8");

console.log(`Converted ${records.length} record(s) from ${inputPath} -> ${outputPath}`);
if (warnings.length > 0) {
  console.log(`\n${warnings.length} warning(s) — review these rows manually before importing:`);
  warnings.forEach((w) => console.log(`  - ${w}`));
}
