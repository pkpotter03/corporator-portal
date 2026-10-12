export type Person = {
  id: string;
  name: string;
  dob: { month: number; day: number; year: number | null };
  address: string;
  ward: string;
  phone: string;
  notes: string;
};

export type MonthDayIndex = Record<number, Record<number, Person[]>>;

export function groupByMonthDay(people: Person[]): MonthDayIndex {
  const index: MonthDayIndex = {};
  for (const person of people) {
    const { month, day } = person.dob;
    index[month] ??= {};
    index[month][day] ??= [];
    index[month][day].push(person);
  }
  return index;
}

export function calculateAge(dob: Person["dob"], onDate: Date): number | null {
  if (dob.year === null) return null;
  let age = onDate.getFullYear() - dob.year;
  const hasHadBirthdayThisYear =
    onDate.getMonth() + 1 > dob.month ||
    (onDate.getMonth() + 1 === dob.month && onDate.getDate() >= dob.day);
  if (!hasHadBirthdayThisYear) age -= 1;
  return age;
}
