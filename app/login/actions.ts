"use server";

import { timingSafeEqual } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { SESSION_COOKIE, SESSION_TTL_SECONDS, createSessionToken } from "@/lib/auth/session";

export interface LoginState {
  error?: string;
  attempt: number;
}

const CODE_PATTERN = /^\d{6}$/;
const MAX_FAILURES = 5;
const LOCKOUT_MS = 5 * 60 * 1000;
const failures = new Map<string, { count: number; resetAt: number }>();

function lockedFor(client: string, now: number) {
  const entry = failures.get(client);
  if (!entry || entry.resetAt <= now) return 0;
  return entry.count >= MAX_FAILURES ? entry.resetAt - now : 0;
}

function recordFailure(client: string, now: number) {
  if (failures.size > 5000) for (const [key, entry] of failures) if (entry.resetAt <= now) failures.delete(key);
  const entry = failures.get(client);
  if (!entry || entry.resetAt <= now) failures.set(client, { count: 1, resetAt: now + LOCKOUT_MS });
  else entry.count += 1;
}

function codeMatches(input: string, expected: string) {
  const a = Buffer.from(input);
  const b = Buffer.from(expected);
  return a.length === b.length && timingSafeEqual(a, b);
}

const safeNext = (value: FormDataEntryValue | null) =>
  typeof value === "string" && value.startsWith("/") && !value.startsWith("//") ? value : "/";

export async function login(previous: LoginState, formData: FormData): Promise<LoginState> {
  const attempt = previous.attempt + 1;
  const code = String(formData.get("code") ?? "");
  const expected = process.env.DASHBOARD_ACCESS_CODE ?? "";
  const client = (await headers()).get("x-forwarded-for")?.split(",")[0]?.trim() || "local";
  const now = Date.now();

  const wait = lockedFor(client, now);
  if (wait > 0) return { attempt, error: `Too many attempts. Try again in ${Math.ceil(wait / 60000)} min.` };
  if (!CODE_PATTERN.test(expected)) return { attempt, error: "Access code is not configured on the server." };
  if (!CODE_PATTERN.test(code)) return { attempt, error: "Enter the 6-digit access code." };
  if (!codeMatches(code, expected)) {
    recordFailure(client, now);
    return { attempt, error: "Invalid access code." };
  }

  failures.delete(client);
  (await cookies()).set(SESSION_COOKIE, await createSessionToken(now), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: SESSION_TTL_SECONDS,
  });
  redirect(safeNext(formData.get("next")));
}

export async function logout() {
  (await cookies()).delete(SESSION_COOKIE);
  redirect("/login");
}
