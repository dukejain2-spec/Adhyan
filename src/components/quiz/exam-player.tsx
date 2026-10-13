"use client";

import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { ChevronLeft, ChevronRight, Clock, LayoutGrid, Loader2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn, formatClock } from "@/lib/utils";
import type { PublicVariant } from "@/lib/domain/types";
import type { SubmittedAnswer } from "@/lib/domain/grading";
import { saveAnswersAction, submitTestAction } from "@/app/account-actions";

type Answers = Record<string, SubmittedAnswer>;
type PaletteState = "not_visited" | "not_answered" | "answered" | "review" | "answered_review";

const FORMAT_LABEL: Record<string, string> = {
  single: "Single choice",
  multiple: "Multiple choice — select all that apply",
  true_false: "True / False",
  integer: "Numeric answer",
  fill_blank: "Short answer",
};

const PALETTE_STYLE: Record<PaletteState, string> = {
  not_visited: "border bg-surface text-foreground",
  not_answered: "bg-danger text-white",
  answered: "bg-success text-white",
  review: "bg-primary text-white",
  answered_review: "bg-primary text-white ring-2 ring-success ring-offset-1 ring-offset-surface",
};

const LEGEND: [PaletteState, string][] = [
  ["answered", "Answered"],
  ["not_answered", "Not answered"],
  ["not_visited", "Not visited"],
  ["review", "Marked for review"],
  ["answered_review", "Answered & marked"],
];

function hasAnswer(a: SubmittedAnswer | undefined) {
  if (!a) return false;
  return a.kind === "options" ? a.optionIds.length > 0 : a.value.trim() !== "";
}

export function ExamPlayer({
  attemptId,
  title,
  remainingSec,
  variants,
  initialAnswers,
}: {
  attemptId: string;
  title: string;
  remainingSec: number;
  variants: PublicVariant[];
  initialAnswers: Answers;
}) {
  const [index, setIndex] = useState(0);
  const [answers, setAnswers] = useState<Answers>(initialAnswers);
  const [visited, setVisited] = useState<Set<number>>(() => new Set([0]));
  const [review, setReview] = useState<Set<number>>(() => new Set());
  const [deadline] = useState(() => Date.now() + remainingSec * 1000);
  const [secondsLeft, setSecondsLeft] = useState(remainingSec);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [paletteOpen, setPaletteOpen] = useState(false);
  const [submitting, startSubmit] = useTransition();

  const timeSpent = useRef<Record<string, number>>({});
  const shownAt = useRef(0);
  const submitted = useRef(false);

  const total = variants.length;
  const current = variants[index];

  /** Credit time on screen to the question being viewed. */
  const flushTime = useCallback(() => {
    const qid = variants[index]?.questionId;
    if (!qid) return;
    const now = Date.now();
    timeSpent.current[qid] = (timeSpent.current[qid] ?? 0) + (now - shownAt.current) / 1000;
    shownAt.current = now;
  }, [index, variants]);

  const goTo = useCallback(
    (i: number) => {
      if (i < 0 || i >= total) return;
      flushTime();
      setIndex(i);
      setVisited((v) => new Set(v).add(i));
      setPaletteOpen(false);
    },
    [flushTime, total],
  );

  const submit = useCallback(() => {
    if (submitted.current) return;
    submitted.current = true;
    flushTime();
    startSubmit(async () => {
      await submitTestAction(attemptId, answers, timeSpent.current);
    });
  }, [answers, attemptId, flushTime]);

  useEffect(() => {
    shownAt.current = Date.now();
  }, []);

  // Countdown against an absolute deadline (survives tab sleep); auto-submit at zero.
  useEffect(() => {
    const id = setInterval(() => {
      const left = Math.max(0, Math.round((deadline - Date.now()) / 1000));
      setSecondsLeft(left);
      if (left <= 0) {
        clearInterval(id);
        submit();
      }
    }, 1000);
    return () => clearInterval(id);
  }, [deadline, submit]);

  // Autosave answers (debounced) so a refresh or crash loses nothing.
  const firstSave = useRef(true);
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false;
      return;
    }
    const t = setTimeout(() => void saveAnswersAction(attemptId, answers), 1200);
    return () => clearTimeout(t);
  }, [answers, attemptId]);

  // Warn before leaving mid-test.
  useEffect(() => {
    const warn = (e: BeforeUnloadEvent) => {
      if (!submitted.current) e.preventDefault();
    };
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, []);

  const setAnswer = (a: SubmittedAnswer | null) =>
    setAnswers((prev) => {
      const next = { ...prev };
      if (a && hasAnswer(a)) next[current.questionId] = a;
      else delete next[current.questionId];
      return next;
    });

  const stateOf = useCallback(
    (i: number): PaletteState => {
      const answered = hasAnswer(answers[variants[i].questionId]);
      if (review.has(i)) return answered ? "answered_review" : "review";
      if (answered) return "answered";
      return visited.has(i) ? "not_answered" : "not_visited";
    },
    [answers, review, variants, visited],
  );

  const counts = useMemo(() => {
    const c: Record<PaletteState, number> = {
      not_visited: 0,
      not_answered: 0,
      answered: 0,
      review: 0,
      answered_review: 0,
    };
    for (let i = 0; i < total; i++) c[stateOf(i)]++;
    return c;
  }, [stateOf, total]);
  const answeredCount = counts.answered + counts.answered_review;

  const toggleReviewAndNext = () => {
    setReview((r) => {
      const n = new Set(r);
      if (n.has(index)) n.delete(index);
      else n.add(index);
      return n;
    });
    if (index < total - 1) goTo(index + 1);
  };

  const lowTime = secondsLeft <= 300;

  const palette = (
    <div className="flex h-full flex-col">
      <div className="grid grid-cols-2 gap-x-3 gap-y-2 border-b p-4 text-xs">
        {LEGEND.map(([s, label]) => (
          <div key={s} className="flex items-center gap-2">
            <span className={cn("flex h-6 w-6 shrink-0 items-center justify-center rounded text-[11px] font-medium", PALETTE_STYLE[s])}>
              {counts[s]}
            </span>
            <span className="text-muted-foreground">{label}</span>
          </div>
        ))}
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        <p className="mb-3 text-xs font-medium text-muted-foreground">Questions</p>
        <div className="grid grid-cols-5 gap-2 sm:grid-cols-6 lg:grid-cols-5">
          {variants.map((v, i) => (
            <button
              key={v.questionId}
              onClick={() => goTo(i)}
              aria-label={`Question ${i + 1}`}
              aria-current={i === index}
              className={cn(
                "h-9 rounded-md text-xs font-medium tabular-nums transition-transform hover:scale-105",
                PALETTE_STYLE[stateOf(i)],
                i === index && "outline outline-2 outline-offset-2 outline-foreground",
              )}
            >
              {i + 1}
            </button>
          ))}
        </div>
      </div>
      <div className="border-t p-4">
        <Button variant="primary" className="w-full" onClick={() => setConfirmOpen(true)} disabled={submitting}>
          Submit test
        </Button>
      </div>
    </div>
  );

  return (
    <div className="flex h-dvh flex-col bg-background">
      {/* Exam header */}
      <header className="flex h-14 shrink-0 items-center gap-4 bg-nav px-4 text-white sm:px-6">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-semibold">{title}</p>
          <p className="text-xs text-nav-muted">
            {answeredCount} of {total} answered
          </p>
        </div>
        <div
          className={cn(
            "flex items-center gap-2 rounded-lg px-3 py-1.5 font-mono text-sm tabular-nums",
            lowTime ? "bg-danger text-white" : "bg-white/10",
          )}
          aria-live="polite"
        >
          <Clock className="h-4 w-4" />
          <span className="sr-only">Time left</span>
          {secondsLeft >= 3600
            ? `${Math.floor(secondsLeft / 3600)}:${formatClock(secondsLeft % 3600).padStart(5, "0")}`
            : formatClock(secondsLeft)}
        </div>
        <button
          onClick={() => setPaletteOpen(true)}
          className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 lg:hidden"
          aria-label="Open question palette"
        >
          <LayoutGrid className="h-4 w-4" />
        </button>
      </header>

      <div className="flex min-h-0 flex-1">
        {/* Question area */}
        <main className="flex min-w-0 flex-1 flex-col">
          <div className="flex items-center justify-between gap-3 border-b bg-surface px-4 py-3 sm:px-8">
            <p className="text-sm font-semibold">
              Question {index + 1}
              <span className="font-normal text-muted-foreground"> / {total}</span>
            </p>
            <div className="flex items-center gap-3 text-xs text-muted-foreground">
              <span className="rounded-full bg-surface-muted px-2.5 py-1">
                {FORMAT_LABEL[current.renderedType] ?? current.renderedType}
              </span>
              <span className="hidden sm:inline">+1 mark</span>
            </div>
          </div>

          <div className="no-select flex-1 overflow-y-auto px-4 py-5 sm:px-8 sm:py-6" onContextMenu={(e) => e.preventDefault()}>
            <div className="mx-auto max-w-3xl">
              <QuestionBody
                key={current.questionId}
                variant={current}
                answer={answers[current.questionId]}
                onAnswer={setAnswer}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-2 border-t bg-surface px-3 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:flex sm:items-center sm:px-8">
            <Button variant="outline" onClick={toggleReviewAndNext} className="px-3">
              <span className="sm:hidden">{review.has(index) ? "Unmark" : "Mark & next"}</span>
              <span className="hidden sm:inline">
                {review.has(index) ? "Unmark review" : "Mark for review & next"}
              </span>
            </Button>
            <Button
              variant="ghost"
              onClick={() => setAnswer(null)}
              disabled={!hasAnswer(answers[current.questionId])}
              className="px-3"
            >
              Clear<span className="hidden sm:inline">&nbsp;response</span>
            </Button>
            <div className="col-span-2 grid grid-cols-2 gap-2 sm:ml-auto sm:flex">
              <Button variant="outline" onClick={() => goTo(index - 1)} disabled={index === 0}>
                <ChevronLeft className="h-4 w-4" /> Previous
              </Button>
              {index < total - 1 ? (
                <Button onClick={() => goTo(index + 1)}>
                  Save & next <ChevronRight className="h-4 w-4" />
                </Button>
              ) : (
                <Button onClick={() => setConfirmOpen(true)}>Submit test</Button>
              )}
            </div>
          </div>
        </main>

        {/* Palette (desktop) */}
        <aside className="hidden w-80 shrink-0 border-l bg-surface lg:block">{palette}</aside>
      </div>

      {/* Palette (mobile drawer) */}
      {paletteOpen && (
        <div className="fixed inset-0 z-40 bg-black/40 lg:hidden" onClick={() => setPaletteOpen(false)}>
          <div className="absolute inset-y-0 right-0 w-80 max-w-[85vw] bg-surface" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between border-b px-4 py-3">
              <p className="text-sm font-semibold">Question palette</p>
              <button onClick={() => setPaletteOpen(false)} aria-label="Close palette" className="-m-2 rounded-lg p-2 hover:bg-surface-muted">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="h-[calc(100%-49px)]">{palette}</div>
          </div>
        </div>
      )}

      {/* Submit confirmation */}
      {(confirmOpen || submitting) && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-2xl bg-surface p-6 shadow-2xl">
            {submitting ? (
              <div className="flex flex-col items-center py-6 text-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="mt-4 font-semibold">Submitting and grading your test…</p>
                <p className="mt-1 text-sm text-muted-foreground">Preparing your analysis.</p>
              </div>
            ) : (
              <>
                <h2 className="text-lg font-semibold">Submit test?</h2>
                <p className="mt-1 text-sm text-muted-foreground">
                  You can&apos;t change your answers after submitting.
                </p>
                <dl className="mt-5 divide-y rounded-lg border text-sm">
                  {[
                    ["Answered", answeredCount],
                    ["Not answered", total - answeredCount],
                    ["Marked for review", counts.review + counts.answered_review],
                    ["Time left", formatClock(secondsLeft)],
                  ].map(([k, v]) => (
                    <div key={k} className="flex justify-between px-4 py-2.5">
                      <dt className="text-muted-foreground">{k}</dt>
                      <dd className="font-medium tabular-nums">{v}</dd>
                    </div>
                  ))}
                </dl>
                <div className="mt-6 flex gap-3">
                  <Button variant="outline" className="flex-1" onClick={() => setConfirmOpen(false)}>
                    Back to test
                  </Button>
                  <Button className="flex-1" onClick={submit}>
                    Submit
                  </Button>
                </div>
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function QuestionBody({
  variant,
  answer,
  onAnswer,
}: {
  variant: PublicVariant;
  answer: SubmittedAnswer | undefined;
  onAnswer: (a: SubmittedAnswer | null) => void;
}) {
  const isValue = variant.renderedType === "integer" || variant.renderedType === "fill_blank";
  const isMultiple = variant.renderedType === "multiple";
  const selected = answer?.kind === "options" ? new Set(answer.optionIds) : new Set<string>();

  const choose = (id: string) => {
    if (isMultiple) {
      const n = new Set(selected);
      if (n.has(id)) n.delete(id);
      else n.add(id);
      onAnswer({ kind: "options", optionIds: [...n] });
    } else {
      onAnswer({ kind: "options", optionIds: [id] });
    }
  };

  return (
    <div>
      {variant.renderedType === "true_false" && (
        <p className="mb-2 text-xs font-semibold uppercase tracking-wider text-primary">
          Is the following statement true or false?
        </p>
      )}
      <p className="prompt-text text-base leading-relaxed sm:text-[17px]">{variant.prompt}</p>

      {variant.media && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={variant.media}
          alt="Figure for this question"
          className="mt-5 max-h-80 w-auto max-w-full rounded-lg border bg-white p-2"
        />
      )}

      {isValue ? (
        <div className="mt-8 max-w-sm">
          <label htmlFor="value-answer" className="text-sm font-medium">
            Your answer
          </label>
          <div className="mt-2 flex items-stretch overflow-hidden rounded-lg border bg-surface focus-within:border-primary focus-within:ring-2 focus-within:ring-primary/15">
            <input
              id="value-answer"
              inputMode="decimal"
              autoComplete="off"
              placeholder="Enter a number"
              value={answer?.kind === "value" ? answer.value : ""}
              onChange={(e) => onAnswer({ kind: "value", value: e.target.value })}
              className="h-12 min-w-0 flex-1 bg-transparent px-4 text-lg tabular-nums outline-none"
            />
            {variant.unit && (
              <span className="flex items-center border-l bg-surface-muted px-4 text-sm text-muted-foreground">
                {variant.unit}
              </span>
            )}
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            Numbers only. Give decimals to 3 places, e.g. 16.667.
          </p>
        </div>
      ) : (
        <div className="mt-8 space-y-3">
          {variant.options?.map((o, i) => {
            const on = selected.has(o.id);
            return (
              <button
                key={o.id}
                type="button"
                role={isMultiple ? "checkbox" : "radio"}
                aria-checked={on}
                onClick={() => choose(o.id)}
                className={cn(
                  "flex w-full items-center gap-4 rounded-lg border bg-surface px-4 py-3.5 text-left text-[15px] transition-colors",
                  on ? "border-primary bg-primary-soft" : "hover:border-primary/40 hover:bg-surface-muted/50",
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-full border text-xs font-semibold",
                    isMultiple && "rounded-md",
                    on ? "border-primary bg-primary text-primary-foreground" : "text-muted-foreground",
                  )}
                >
                  {variant.renderedType === "true_false" ? (o.id === "true" ? "T" : "F") : String.fromCharCode(65 + i)}
                </span>
                <span>{o.text}</span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
