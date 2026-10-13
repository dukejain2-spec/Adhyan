import Link from "next/link";
import {
  ArrowRight,
  BarChart3,
  Check,
  ClipboardCheck,
  Clock,
  FileQuestion,
  Layers,
  ShieldCheck,
  Shuffle,
  Target,
} from "lucide-react";
import { Brand } from "@/components/brand";
import { Button } from "@/components/ui/button";
import { getCurrentUser } from "@/lib/server/auth";
import { listCourses } from "@/lib/server/tests";

export default async function LandingPage() {
  const user = await getCurrentUser();
  const courses = listCourses();
  const totals = {
    courses: courses.length,
    questions: courses.reduce((s, c) => s + c.questionBank, 0),
    tests: courses.reduce((s, c) => s + c.testCount, 0),
  };

  return (
    <div className="min-h-dvh bg-surface">
      {/* Header */}
      <header className="sticky top-0 z-30 border-b bg-surface/90 backdrop-blur">
        <div className="mx-auto flex h-16 max-w-7xl items-center gap-4 px-4 sm:gap-8 sm:px-6">
          <Brand showTagline />
          <nav className="hidden items-center gap-6 text-sm text-muted-foreground md:flex">
            <a href="#features" className="hover:text-foreground">Features</a>
            <a href="#how" className="hover:text-foreground">How it works</a>
            <a href="#courses" className="hover:text-foreground">Courses</a>
          </nav>
          <div className="ml-auto flex items-center gap-2">
            {user ? (
              <Button asChild>
                <Link href="/dashboard">Go to dashboard</Link>
              </Button>
            ) : (
              <>
                <Button asChild variant="ghost">
                  <Link href="/login">Log in</Link>
                </Button>
                <Button asChild>
                  <Link href="/register">Register</Link>
                </Button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden bg-nav text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage:
              "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)",
            backgroundSize: "48px 48px",
          }}
        />
        <div className="relative mx-auto grid max-w-7xl items-center gap-10 px-4 py-12 sm:px-6 sm:py-20 lg:grid-cols-[1.1fr_1fr] lg:gap-12 lg:py-24">
          <div>
            <p className="inline-flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-3 py-1 text-xs font-medium text-nav-muted">
              <span className="h-1.5 w-1.5 rounded-full bg-accent" /> Online test series · Enhanced Learning
            </p>
            <h1 className="mt-5 text-[32px] font-semibold leading-[1.12] tracking-tight sm:text-5xl">
              Exam-grade prep tests,
              {" "}<br className="hidden sm:block" />
              with analysis that tells you
              {" "}<br className="hidden sm:block" />
              <span className="text-accent">what to study next.</span>
            </h1>
            <p className="mt-5 max-w-xl text-base leading-relaxed text-nav-muted">
              Full-length, timed prep tests for every course you study. Every paper is unique to
              you, and every assessment comes with topic-wise accuracy, percentile and
              solutions for questions you answered incorrectly.
            </p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Button asChild size="lg" variant="accent">
                <Link href={user ? "/learn" : "/register?plan=trial"}>
                  Try for free <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              {!user && (
                <Button
                  asChild
                  size="lg"
                  variant="outline"
                  className="border-white/20 bg-transparent text-white hover:bg-white/10"
                >
                  <Link href="/login">Log in</Link>
                </Button>
              )}
            </div>
          </div>

          {/* Product preview */}
          <div className="rounded-2xl border border-white/10 bg-white p-5 text-foreground shadow-2xl">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-xs text-muted-foreground">Test 3 · Result</p>
                <p className="mt-0.5 font-semibold">Score 72 / 100</p>
              </div>
              <span className="rounded-full bg-success-soft px-2.5 py-1 text-xs font-medium text-success">
                91.4 percentile · 1,500 students
              </span>
            </div>
            <div className="mt-4 grid grid-cols-3 gap-2 text-center text-xs">
              {[
                ["Accuracy", "81%"],
                ["Attempted", "89 / 100"],
                ["Avg. time", "58 s"],
              ].map(([k, v]) => (
                <div key={k} className="rounded-lg bg-surface-muted px-2 py-2.5">
                  <p className="text-muted-foreground">{k}</p>
                  <p className="mt-0.5 text-sm font-semibold">{v}</p>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs font-medium text-muted-foreground">Topic-wise accuracy</p>
            <div className="mt-2 space-y-2.5">
              {[
                ["Topic 1", 92, "bg-success"],
                ["Topic 2", 78, "bg-success"],
                ["Topic 3", 61, "bg-accent"],
                ["Topic 4", 38, "bg-danger"],
              ].map(([name, v, c]) => (
                <div key={name as string} className="text-xs">
                  <div className="flex justify-between">
                    <span>{name}</span>
                    <span className="tabular-nums text-muted-foreground">{v}%</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-surface-muted">
                    <div className={`h-full rounded-full ${c}`} style={{ width: `${v}%` }} />
                  </div>
                </div>
              ))}
            </div>
            <p className="mt-5 text-xs font-medium text-muted-foreground">Question map</p>
            <div className="mt-2 grid grid-cols-10 gap-1">
              {Array.from({ length: 30 }, (_, i) => {
                const s = [3, 8, 14, 21, 26].includes(i) ? "bg-danger" : [11, 19].includes(i) ? "bg-border" : "bg-success";
                return <span key={i} className={`h-4 rounded-[3px] ${s}`} />;
              })}
            </div>
          </div>
        </div>
      </section>

      {/* Stats strip */}
      <section className="border-b">
        <div className="mx-auto grid max-w-7xl grid-cols-2 gap-6 px-4 py-8 sm:px-6 md:grid-cols-4">
          {[
            [String(totals.courses), totals.courses === 1 ? "course live" : "courses live"],
            [totals.questions.toLocaleString("en-IN"), "questions in the bank"],
            [String(totals.tests), "full-length tests"],
            ["100%", "of the syllabus in every test"],
          ].map(([v, k]) => (
            <div key={k}>
              <p className="text-2xl font-semibold tracking-tight">{v}</p>
              <p className="text-sm text-muted-foreground">{k}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Features */}
      <section id="features" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Features</p>
        <h2 className="mt-2 max-w-2xl text-3xl font-semibold tracking-tight">
          Built like the real exam, analysed like a coach would.
        </h2>
        <div className="mt-10 grid gap-x-8 gap-y-10 md:grid-cols-3">
          {[
            [Layers, "Full syllabus in every test", "Each test draws questions from every topic of the course, in syllabus order, so every sitting is a complete revision."],
            [Shuffle, "A unique paper for you", "Questions vary between students: values are re-computed, formats change between single choice, true/false and short answer, and options are shuffled."],
            [Clock, "Real exam conditions", "A server-timed paper with a question palette, mark-for-review and autosave, just like a computer-based exam."],
            [BarChart3, "Standard performance analysis", "Score, accuracy, attempt rate, time per question and percentile rank against everyone who took the same test."],
            [Target, "Topic-wise strengths", "Every topic is classified as strong, average or weak, so you know exactly where to spend your next hour."],
            [ShieldCheck, "Solutions", "For every question you answered incorrectly, see the correct answer with a step-by-step solution."],
          ].map(([Icon, title, body]) => {
            const I = Icon as typeof Layers;
            return (
              <div key={title as string}>
                <span className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary-soft text-primary">
                  <I className="h-5 w-5" />
                </span>
                <h3 className="mt-4 font-semibold">{title as string}</h3>
                <p className="mt-1.5 text-sm leading-relaxed text-muted-foreground">{body as string}</p>
              </div>
            );
          })}
        </div>
      </section>

      {/* How it works */}
      <section id="how" className="border-y bg-background">
        <div className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
          <p className="text-xs font-semibold uppercase tracking-wider text-primary">How it works</p>
          <h2 className="mt-2 text-3xl font-semibold tracking-tight">Three steps to your first analysis</h2>
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              [ClipboardCheck, "1. Create your free account", "Register with your name, email, mobile and field of study."],
              [FileQuestion, "2. Pick a course and try it free", "Every course comes with free trial papers, so you can try the tests before you pay."],
              [BarChart3, "3. Review and unlock", "Study your analysis, then unlock the full test series of the course with a one-time payment."],
            ].map(([Icon, title, body]) => {
              const I = Icon as typeof Layers;
              return (
                <div key={title as string} className="rounded-xl border bg-surface p-6">
                  <I className="h-5 w-5 text-primary" />
                  <h3 className="mt-4 font-semibold">{title as string}</h3>
                  <p className="mt-1.5 text-sm text-muted-foreground">{body as string}</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Courses */}
      <section id="courses" className="mx-auto max-w-7xl px-4 py-14 sm:px-6 sm:py-20">
        <p className="text-xs font-semibold uppercase tracking-wider text-primary">Courses</p>
        <h2 className="mt-2 text-3xl font-semibold tracking-tight">Choose your course</h2>
        <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
          Start every course with free trial papers. Unlock its complete test series with a one-time
          payment. More courses are being added.
        </p>
        <div className="mt-10 grid gap-6 md:grid-cols-2 lg:grid-cols-3">
          {courses.map((c) => (
            <div key={c.id} className="flex flex-col rounded-2xl border p-6">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                {c.subject}
              </p>
              <h3 className="mt-1 text-lg font-semibold">{c.title}</h3>
              <ul className="mt-5 flex-1 space-y-2.5 text-sm">
                {[
                  `Full Test: ${c.testCount} full tests × ${c.questionsPerTest} questions · ₹${c.prices.full.toLocaleString("en-IN")}`,
                  `Part Test: ${c.topicCount} topics × ${c.partQuestions} questions · ₹${c.prices.partTopic} a topic or ₹${c.prices.partPass.toLocaleString("en-IN")} for all`,
                  `Complete Bundle (both): ₹${c.prices.bundle.toLocaleString("en-IN")}`,
                  `Free trial papers in both modes`,
                ].map((f) => (
                  <li key={f} className="flex gap-2">
                    <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              <div className="mt-6 flex items-end justify-between gap-3 border-t pt-5">
                <div>
                  <p className="text-xs text-muted-foreground">from</p>
                  <p className="text-2xl font-semibold tracking-tight">₹{c.prices.partTopic}</p>
                </div>
                <Button asChild>
                  <Link href={user ? `/learn/${c.id}` : "/register?plan=trial"}>Try for free</Link>
                </Button>
              </div>
            </div>
          ))}
          <div className="flex flex-col justify-center rounded-2xl border border-dashed p-6 text-sm text-muted-foreground">
            <p className="font-medium text-foreground">More courses coming soon</p>
            <p className="mt-1">New subjects are added regularly. Register to be notified.</p>
          </div>
        </div>
      </section>

      <footer className="border-t">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-8 text-sm text-muted-foreground sm:px-6">
          <Brand />
          <p>© {new Date().getFullYear()} Adhyan · Enhanced Learning</p>
        </div>
      </footer>
    </div>
  );
}
