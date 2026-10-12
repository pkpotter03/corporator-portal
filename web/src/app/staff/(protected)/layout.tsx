import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { STAFF_SESSION_COOKIE, verifySessionToken } from "@/lib/staffAuth";
import { logout } from "../actions";

export default async function ProtectedStaffLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const cookieStore = await cookies();
  const token = cookieStore.get(STAFF_SESSION_COOKIE)?.value;

  if (!verifySessionToken(token)) {
    redirect("/staff/login");
  }

  return (
    <div>
      <div className="flex justify-end border-b border-black/10 px-4 py-2 dark:border-white/10">
        <form action={logout}>
          <button type="submit" className="text-xs text-zinc-500 hover:text-accent hover:underline">
            Log out
          </button>
        </form>
      </div>
      {children}
    </div>
  );
}
