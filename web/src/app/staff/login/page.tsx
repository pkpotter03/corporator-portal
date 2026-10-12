import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { STAFF_SESSION_COOKIE, verifySessionToken } from "@/lib/staffAuth";
import LoginForm from "./LoginForm";

export const metadata = {
  title: "Staff Login",
  robots: { index: false, follow: false },
};

export default async function StaffLoginPage() {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;
  if (verifySessionToken(token)) {
    redirect("/staff/birthdays");
  }

  return (
    <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center px-4 py-16 sm:px-6">
      <h1 className="text-xl font-bold tracking-tight">Staff Login</h1>
      <p className="mt-1 text-sm text-zinc-500">
        Office use only — ask the corporator&apos;s office for the password.
      </p>
      <LoginForm />
    </div>
  );
}
