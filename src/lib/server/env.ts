import "server-only";
import { supabaseOrigin } from "@/lib/supabase/origin";

/**
 * Backend selection.
 *
 * When real Supabase credentials are present, accounts, purchases and test
 * attempts live in Supabase (Auth + Postgres). Without them — e.g. on a fresh
 * checkout — the app falls back to a local JSON file under `.data/` so every
 * flow still works end-to-end in development.
 */
const PLACEHOLDER = /your-project|your-anon-key|your-service-role-key/;

export function supabaseConfig() {
  const url = supabaseOrigin(process.env.NEXT_PUBLIC_SUPABASE_URL);
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY ?? "";
  const ok = Boolean(url && anon && service) && !PLACEHOLDER.test(url + anon + service);
  return ok ? { url, anon, service } : null;
}

export const supabaseEnabled = () => supabaseConfig() !== null;

/**
 * Teacher access is granted by email allow-list (comma-separated), never by a
 * self-selected sign-up option — otherwise anyone could read the answer keys.
 * In local development with no list configured, every account is a teacher.
 */
/** Admins (ADMIN_EMAILS): full access — every test unlocked, Teacher Studio, admin console. */
export function isAdminEmail(email: string): boolean {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean)
    .includes(email.toLowerCase());
}

export function isTeacherEmail(email: string): boolean {
  if (isAdminEmail(email)) return true;
  const list = (process.env.TEACHER_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  if (!list.length) return process.env.NODE_ENV !== "production" && !supabaseEnabled();
  return list.includes(email.toLowerCase());
}
