"use client";

import { useState } from "react";
import type { MonthDayIndex, Person } from "@/lib/birthdayUtils";
import { calculateAge } from "@/lib/birthdayUtils";

const MONTH_NAMES = [
  "January",
  "February",
  "March",
  "April",
  "May",
  "June",
  "July",
  "August",
  "September",
  "October",
  "November",
  "December",
];

// Feb kept at 29 so Feb-29 birthdays stay reachable from the picker.
const DAYS_IN_MONTH = [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31];

export default function CalendarBrowser({ index }: { index: MonthDayIndex }) {
  const [month, setMonth] = useState<number | null>(null);
  const [day, setDay] = useState<number | null>(null);

  const countForMonth = (m: number) =>
    Object.values(index[m] ?? {}).reduce((sum, people) => sum + people.length, 0);
  const countForDay = (m: number, d: number) => (index[m]?.[d] ?? []).length;

  if (month === null) {
    return (
      <div className="mt-8 grid grid-cols-3 gap-3 sm:grid-cols-4">
        {MONTH_NAMES.map((name, i) => {
          const m = i + 1;
          const count = countForMonth(m);
          return (
            <button
              key={m}
              onClick={() => setMonth(m)}
              className="flex flex-col items-center justify-center rounded-lg border border-black/10 bg-white py-6 text-sm font-medium transition-colors hover:border-accent hover:text-accent dark:border-white/10 dark:bg-black"
            >
              {name}
              <span className="mt-1 text-xs text-zinc-500">{count} people</span>
            </button>
          );
        })}
      </div>
    );
  }

  if (day === null) {
    const daysCount = DAYS_IN_MONTH[month - 1];
    return (
      <div>
        <BackButton onClick={() => setMonth(null)} label="← All months" />
        <h2 className="mt-4 text-lg font-semibold">{MONTH_NAMES[month - 1]}</h2>
        <div className="mt-4 grid grid-cols-7 gap-2 sm:grid-cols-10">
          {Array.from({ length: daysCount }, (_, i) => i + 1).map((d) => {
            const count = countForDay(month, d);
            return (
              <button
                key={d}
                onClick={() => setDay(d)}
                disabled={count === 0}
                className={`aspect-square rounded-md border text-sm transition-colors ${
                  count > 0
                    ? "border-accent/40 bg-accent/10 font-semibold hover:border-accent hover:bg-accent/20"
                    : "border-black/5 text-zinc-300 dark:border-white/5 dark:text-zinc-700"
                }`}
              >
                {d}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  const people: Person[] = index[month]?.[day] ?? [];
  const today = new Date();

  return (
    <div>
      <BackButton onClick={() => setDay(null)} label={`← ${MONTH_NAMES[month - 1]}`} />
      <h2 className="mt-4 text-lg font-semibold">
        {MONTH_NAMES[month - 1]} {day}
      </h2>
      {people.length === 0 ? (
        <p className="mt-4 text-sm text-zinc-500">No birthdays on this day.</p>
      ) : (
        <ol className="mt-4 space-y-3">
          {people.map((person, i) => {
            const age = calculateAge(person.dob, today);
            return (
              <li
                key={person.id || i}
                className="rounded-lg border border-black/10 p-3 text-sm dark:border-white/10"
              >
                <p className="font-semibold">
                  {i + 1}. {person.name}
                  {age !== null && (
                    <span className="ml-2 font-normal text-zinc-500">
                      turning {age}
                    </span>
                  )}
                </p>
                {person.address && (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">{person.address}</p>
                )}
                {person.phone && (
                  <p className="mt-1 text-zinc-600 dark:text-zinc-400">{person.phone}</p>
                )}
              </li>
            );
          })}
        </ol>
      )}
    </div>
  );
}

function BackButton({ onClick, label }: { onClick: () => void; label: string }) {
  return (
    <button onClick={onClick} className="text-sm text-accent hover:underline">
      {label}
    </button>
  );
}
