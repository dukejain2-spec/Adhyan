import "server-only";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { cache } from "react";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createServerClient } from "@supabase/ssr";
import type { EmailOtpType } from "@supabase/supabase-js";
import { isAdminEmail, isTeacherEmail, supabaseConfig } from "./env";
import { repo, type UserProfile } from "./repo";

export interface SessionUser extends UserProfile {
  isTeacher: boolean;
  isAdmin: boolean;
}

export interface SignUpInput {
  fullName: string;
  email: string;
  mobile: string;
  country: string;
  userType: string;
  field: string;
  password: string;
}

export type AuthResult =
  | { ok: true; needsConfirmation?: boolean }
  | { ok: false; error: string };

// ───────────────────────── Supabase (production) ─────────────────────────

async function supabaseAuthClient() {
  const cfg = supabaseConfig()!;
  const store = await cookies();
  return createServerClient(cfg.url, cfg.anon, {
    cookies: {
      getAll: () => store.getAll(),
      setAll: (toSet) => {
        try {
          toSet.forEach(({ name, value, options }) => store.set(name, value, options));
        } catch {
          // Server Component render — the proxy refreshes the session cookie.
        }
      },
    },
  });
}

async function siteOrigin() {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "localhost:3000";
  const proto = h.get("x-forwarded-proto") ?? (host.startsWith("localhost") ? "http" : "https");
  return `${proto}://${host}`;
}

// ───────────────────────── Local (development fallback) ─────────────────────────
// Passwords are scrypt-hashed; the session is an HMAC-signed, httpOnly cookie.

const DATA_DIR = path.join(process.cwd(), ".data");
const AUTH_FILE = path.join(DATA_DIR, "auth.json");
const SESSION_COOKIE = "adhyan_session";
const SESSION_DAYS = 30;

interface LocalCred {
  id: string;
  email: string;
  salt: string;
  hash: string;
}
interface LocalAuth {
  secret: string;
  users: LocalCred[];
}

const ga = globalThis as unknown as { __adhyanAuth?: LocalAuth };

function authDb(): LocalAuth {
  if (ga.__adhyanAuth) return ga.__adhyanAuth;
  let data: LocalAuth | null = null;
  try {
    data = JSON.parse(fs.readFileSync(AUTH_FILE, "utf8"));
  } catch {
    // first run
  }
  ga.__adhyanAuth = data ?? { secret: crypto.randomBytes(32).toString("hex"), users: [] };
  saveAuthDb();
  return ga.__adhyanAuth;
}

function saveAuthDb() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
  fs.writeFileSync(AUTH_FILE, JSON.stringify(ga.__adhyanAuth));
}

const secret = () => process.env.AUTH_SECRET || authDb().secret;
const hashPassword = (pw: string, salt: string) =>
  crypto.scryptSync(pw, salt, 64).toString("hex");
const sign = (payload: string) =>
  crypto.createHmac("sha256", secret()).update(payload).digest("base64url");

async function setLocalSession(userId: string) {
  const exp = Date.now() + SESSION_DAYS * 86400_000;
  const payload = `${userId}.${exp}`;
  (await cookies()).set(SESSION_COOKIE, `${payload}.${sign(payload)}`, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    expires: new Date(exp),
  });
}

async function localSessionUserId(): Promise<string | null> {
  const raw = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!raw) return null;
  const [id, exp, sig] = raw.split(".");
  if (!id || !exp || !sig) return null;
  const expected = sign(`${id}.${exp}`);
  const ok =
    expected.length === sig.length &&
    crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  if (!ok || Number(exp) < Date.now()) return null;
  return id;
}

// ───────────────────────── Public API ─────────────────────────

/**
 * The local JSON fallback writes to disk, which serverless hosts (Vercel)
 * forbid. There, missing Supabase variables must surface as a clear error
 * instead of crashing the page.
 */
const NOT_CONFIGURED: AuthResult = {
  ok: false,
  error:
    "Sign-up is unavailable: the server is missing its Supabase settings (NEXT_PUBLIC_SUPABASE_URL, NEXT_PUBLIC_SUPABASE_ANON_KEY, SUPABASE_SERVICE_ROLE_KEY).",
};
const localModeForbidden = () => !supabaseConfig() && Boolean(process.env.VERCEL);

export async function signUp(input: SignUpInput): Promise<AuthResult> {
  if (localModeForbidden()) return NOT_CONFIGURED;
  const email = input.email.trim().toLowerCase();
  const profileBase = {
    email,
    fullName: input.fullName.trim(),
    mobile: input.mobile.trim(),
    country: input.country,
    userType: input.userType,
    field: input.field,
    createdAt: new Date().toISOString(),
  };

  if (supabaseConfig()) {
    const supabase = await supabaseAuthClient();
    const { data, error } = await supabase.auth.signUp({
      email,
      password: input.password,
      options: {
        emailRedirectTo: `${await siteOrigin()}/dashboard`,
        data: { full_name: profileBase.fullName },
      },
    });
    if (error) return { ok: false, error: error.message };
    if (!data.user) return { ok: false, error: "Could not create the account." };
    // An already-registered email comes back as a user with no identities.
    if (data.user.identities && data.user.identities.length === 0) {
      return { ok: false, error: "An account with this email already exists. Please log in." };
    }
    await repo().saveProfile({ id: data.user.id, ...profileBase });
    return { ok: true, needsConfirmation: !data.session };
  }

  const db = authDb();
  if (db.users.some((u) => u.email === email)) {
    return { ok: false, error: "An account with this email already exists. Please log in." };
  }
  const id = crypto.randomUUID();
  const salt = crypto.randomBytes(16).toString("hex");
  db.users.push({ id, email, salt, hash: hashPassword(input.password, salt) });
  saveAuthDb();
  await repo().saveProfile({ id, ...profileBase });
  await setLocalSession(id);
  return { ok: true };
}

export async function signIn(emailRaw: string, password: string): Promise<AuthResult> {
  if (localModeForbidden()) return NOT_CONFIGURED;
  const email = emailRaw.trim().toLowerCase();
  if (supabaseConfig()) {
    const supabase = await supabaseAuthClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      return {
        ok: false,
        error: /confirm/i.test(error.message)
          ? "Please verify your email first — check your inbox for the confirmation link."
          : "Incorrect email or password.",
      };
    }
    return { ok: true };
  }

  const user = authDb().users.find((u) => u.email === email);
  if (!user) return { ok: false, error: "Incorrect email or password." };
  const given = Buffer.from(hashPassword(password, user.salt), "hex");
  if (!crypto.timingSafeEqual(given, Buffer.from(user.hash, "hex"))) {
    return { ok: false, error: "Incorrect email or password." };
  }
  await setLocalSession(user.id);
  return { ok: true };
}

export async function signOut() {
  if (supabaseConfig()) {
    await (await supabaseAuthClient()).auth.signOut();
  }
  (await cookies()).delete(SESSION_COOKIE);
}

/** Exchange the email-confirmation code for a session (Supabase only). */
export async function exchangeCode(code: string): Promise<boolean> {
  if (!supabaseConfig()) return false;
  const { error } = await (await supabaseAuthClient()).auth.exchangeCodeForSession(code);
  return !error;
}

/** Verify an emailed token hash (works across devices) and start a session. */
export async function verifyEmailToken(tokenHash: string, type: EmailOtpType): Promise<boolean> {
  if (!supabaseConfig()) return false;
  const { error } = await (await supabaseAuthClient()).auth.verifyOtp({ token_hash: tokenHash, type });
  return !error;
}

/** The signed-in user (memoised per request), or null. */
export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  let id: string | null = null;
  let email = "";
  let fallbackName = "";
  if (supabaseConfig()) {
    const { data } = await (await supabaseAuthClient()).auth.getUser();
    if (!data.user) return null;
    id = data.user.id;
    email = data.user.email ?? "";
    fallbackName = (data.user.user_metadata?.full_name as string | undefined) ?? "";
  } else {
    id = await localSessionUserId();
    if (!id) return null;
  }
  const profile = await repo().getProfile(id);
  const merged: UserProfile = profile ?? {
    id,
    email,
    fullName: fallbackName || email.split("@")[0],
    mobile: "",
    country: "",
    userType: "",
    field: "",
    createdAt: new Date().toISOString(),
  };
  return { ...merged, isTeacher: isTeacherEmail(merged.email), isAdmin: isAdminEmail(merged.email) };
});

/** For pages/actions that need an account: redirect to login otherwise. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return user;
}

export async function requireAdmin(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isAdmin) redirect("/dashboard");
  return user;
}

export async function requireTeacher(): Promise<SessionUser> {
  const user = await requireUser();
  if (!user.isTeacher) redirect("/dashboard");
  return user;
}
