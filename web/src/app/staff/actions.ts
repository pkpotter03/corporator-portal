"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  STAFF_SESSION_COOKIE,
  getExpectedSessionToken,
  sessionCookieOptions,
  verifyPassword,
} from "@/lib/staffAuth";

export type LoginState = { error?: string };

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = formData.get("password");
  if (typeof password !== "string" || password.length === 0) {
    return { error: "Enter the password." };
  }

  let valid: boolean;
  try {
    valid = verifyPassword(password);
  } catch {
    return { error: "Staff login isn't configured yet (missing STAFF_PASSWORD)." };
  }

  if (!valid) {
    return { error: "Incorrect password." };
  }

  const cookieStore = await cookies();
  cookieStore.set(STAFF_SESSION_COOKIE, getExpectedSessionToken(), sessionCookieOptions);
  redirect("/staff/birthdays");
}

export async function logout() {
  const cookieStore = await cookies();
  cookieStore.delete(STAFF_SESSION_COOKIE);
  redirect("/staff/login");
}
