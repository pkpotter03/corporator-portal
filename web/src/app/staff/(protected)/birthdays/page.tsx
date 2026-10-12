import { fetchPeople, groupByMonthDay } from "@/lib/sheetsApi";
import CalendarBrowser from "./CalendarBrowser";

export const metadata = {
  title: "Birthday Calendar (Staff)",
  robots: { index: false, follow: false },
};

export default async function StaffBirthdaysPage() {
  let error: string | null = null;
  let index: ReturnType<typeof groupByMonthDay> = {};

  try {
    const people = await fetchPeople();
    index = groupByMonthDay(people);
  } catch (e) {
    error = e instanceof Error ? e.message : "Failed to load People sheet.";
  }

  return (
    <div className="mx-auto w-full max-w-4xl px-4 py-10 sm:px-6">
      <h1 className="text-2xl font-bold tracking-tight">Birthday Calendar</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Staff-only tool — contains residents&apos; personal information, please
        don&apos;t share access outside the office.
      </p>
      {error ? (
        <p className="mt-6 rounded border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900 dark:bg-red-950 dark:text-red-300">
          {error}
        </p>
      ) : (
        <CalendarBrowser index={index} />
      )}
    </div>
  );
}
