"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireUser, signIn, signOut, signUp } from "@/lib/server/auth";
import {
  completeSimulatedPurchase,
  getCourseOffer,
  saveAnswers,
  startTest,
  submitTest,
} from "@/lib/server/tests";
import type { SubmittedAnswer } from "@/lib/domain/grading";
import type { Plan, TestKind } from "@/lib/server/repo";
import { COUNTRIES, FIELDS, USER_TYPES } from "@/lib/profile-options";

export interface FormState {
  error?: string;
  fieldErrors?: Record<string, string>;
  notice?: string;
  values?: Record<string, string>;
}

/** Only allow same-site relative paths as post-login destinations. */
function safeNext(raw: FormDataEntryValue | null): string {
  const s = typeof raw === "string" ? raw : "";
  return s.startsWith("/") && !s.startsWith("//") ? s : "/dashboard";
}

const registerSchema = z
  .object({
    fullName: z.string().trim().min(2, "Enter your full name."),
    email: z.string().trim().email("Enter a valid email address."),
    mobile: z
      .string()
      .trim()
      .regex(/^\+?[0-9][0-9\s-]{7,15}$/, "Enter a valid mobile number."),
    country: z.enum(COUNTRIES, { message: "Select your country." }),
    userType: z.enum(USER_TYPES, { message: "Select what describes you." }),
    field: z.enum(FIELDS, { message: "Select your field of study." }),
    password: z.string().min(8, "Use at least 8 characters."),
    confirm: z.string(),
    terms: z.literal("on", { message: "Please accept the terms to continue." }),
  })
  .refine((v) => v.password === v.confirm, {
    path: ["confirm"],
    message: "Passwords do not match.",
  });

export async function registerAction(_prev: FormState, form: FormData): Promise<FormState> {
  const raw = Object.fromEntries(
    ["fullName", "email", "mobile", "country", "userType", "field", "password", "confirm", "terms"].map(
      (k) => [k, String(form.get(k) ?? "")],
    ),
  );
  const { password: _p, confirm: _c, ...values } = raw;
  void _p;
  void _c;
  const parsed = registerSchema.safeParse(raw);
  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      fieldErrors[key] ??= issue.message;
    }
    return { fieldErrors, values };
  }

  let res: Awaited<ReturnType<typeof signUp>>;
  try {
    res = await signUp(parsed.data);
  } catch (e) {
    console.error("registerAction failed", e);
    return { error: `Registration failed on the server: ${e instanceof Error ? e.message : String(e)}`, values };
  }
  if (!res.ok) return { error: res.error, values };
  if (res.needsConfirmation) {
    return {
      notice: `We've sent a confirmation link to ${parsed.data.email}. Open it to activate your account, then log in.`,
    };
  }
  redirect(safeNext(form.get("next")));
}

export async function loginAction(_prev: FormState, form: FormData): Promise<FormState> {
  const email = String(form.get("email") ?? "");
  const password = String(form.get("password") ?? "");
  if (!email || !password) return { error: "Enter your email and password.", values: { email } };
  let res: Awaited<ReturnType<typeof signIn>>;
  try {
    res = await signIn(email, password);
  } catch (e) {
    console.error("loginAction failed", e);
    return { error: `Login failed on the server: ${e instanceof Error ? e.message : String(e)}`, values: { email } };
  }
  if (!res.ok) return { error: res.error, values: { email } };
  redirect(safeNext(form.get("next")));
}

export async function logoutAction() {
  await signOut();
  redirect("/");
}

// ───────────────────────── Tests ─────────────────────────

export async function startTestAction(courseId: string, kind: TestKind, testIndex: number) {
  const user = await requireUser();
  const res = await startTest(user, courseId, kind === "part" ? "part" : "full", testIndex);
  if (!res.ok) {
    redirect(res.reason === "locked" ? `/checkout/${courseId}` : `/learn/${courseId}`);
  }
  redirect(`/quiz/${res.attemptId}`);
}

export async function saveAnswersAction(attemptId: string, answers: Record<string, SubmittedAnswer>) {
  const user = await requireUser();
  await saveAnswers(user, attemptId, answers);
}

export async function submitTestAction(
  attemptId: string,
  answers: Record<string, SubmittedAnswer>,
  timeSpent: Record<string, number>,
) {
  const user = await requireUser();
  await submitTest(user, attemptId, answers, timeSpent);
  revalidatePath("/dashboard");
  revalidatePath("/analytics");
  redirect(`/results/${attemptId}`);
}

const PLANS: Plan[] = ["full", "part_pass", "part_topic", "bundle"];

/** Simulated payment for one plan (and topic, for a single Part Test). */
export async function purchaseAction(courseId: string, plan: Plan, topicId: string) {
  const user = await requireUser();
  if (!getCourseOffer(courseId) || !PLANS.includes(plan)) redirect("/learn");
  await completeSimulatedPurchase(user, courseId, plan, topicId);
  revalidatePath(`/learn/${courseId}`);
  const mode = plan === "part_pass" || plan === "part_topic" ? "part" : "full";
  redirect(`/learn/${courseId}?mode=${mode}&purchased=${plan}`);
}
