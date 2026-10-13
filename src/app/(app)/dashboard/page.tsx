import Link from "next/link";
import { redirect } from "next/navigation";
import { ArrowRight, ClipboardList, Clock, FileText, Lock, Target } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Ring } from "@/components/ui/ring";
import { DonutChart } from "@/components/charts";
import { Meter, PROFICIENCY_BAR, ProficiencyBadge, formatDuration } from "@/components/tests/bits";
import { StartTestButton } from "@/components/tests/start-test-button";
import { requireUser } from "@/lib/server/auth";
import { ELL_OFFER, getPerformance, listTests } from "@/lib/server/tests";
import { startTestAction } from "@/app/account-actions";
import { APP_MODE } from "@/lib/config";
import { cn } from "@/lib/utils";

export const metadata = { title: "Dashboard · Adhyan" };

const DONUT = {
  completed: "#a855f7",
  inProgress: "#f59e0b",
  todo: "#14b8c4",
};

export default async function DashboardPage() {
  if (APP_MODE !== "tests") redirect("/learn");
  const user = await requireUser();
  const [perf, listing] = await Promise.all([
    getPerformance(user, ELL_OFFER.id),
    listTests(user, ELL_OFFER.id),
  ]);
  const { tests, paid, offer } = listing!;
  const firstName = user.fullName.split(" ")[0];

  const completed = tests.filter((t) => t.status === "completed").length;
  const inProgress = tests.filter((t) => t.status === "in_progress").length;
  const todo = tests.length - completed - inProgress;

  const nextUp = [
    ...tests.filter((t) => t.status === "in_progress"),
    ...tests.filter((t) => t.status === "not_started" && !t.locked),
    ...tests.filter((t) => t.locked),
  ].slice(0, 4);

  const profile = [...perf.topics]
    .filter((t) => t.accuracy !== null)
    .sort((a, b) => b.attempted - a.attempted)
    .slice(0, 8);

  return (
    <div className="space-y-6">
      <div className="grid gap-6 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        {/* Left column: welcome + tiles */}
        <div className="flex flex-col gap-6">
          <Card className="flex items-center gap-4 p-5 sm:gap-6 sm:p-6">
            <div className="min-w-0 flex-1">
              <h1 className="text-xl font-semibold tracking-tight">Welcome back, {firstName}</h1>
              <p className="mt-2 text-sm leading-relaxed text-muted-foreground">
                {perf.avgScore !== null
                  ? `Your average score is ${perf.avgScore}%. ${perf.avgScore >= 75 ? "Excellent work, keep it up." : perf.avgScore >= 50 ? "Good progress. Target your weak topics next." : "Review the solutions of your last test, then try again."}`
                  : "You haven't submitted a test yet. Start with a free trial paper to see your analysis."}
              </p>
            </div>
            <Ring value={perf.avgScore ?? 0} size={104} stroke={10} label={perf.avgScore !== null ? `${perf.avgScore}%` : "—"} sublabel="avg. score" />
          </Card>

          <div className="grid grid-cols-2 gap-6">
            <div className="relative overflow-hidden rounded-xl bg-[#e8a33d] p-5 text-white shadow-sm">
              <p className="pr-8 text-sm font-medium text-white/90">Tests completed</p>
              <p className="mt-6 text-4xl font-semibold tabular-nums">
                {perf.completedTests}
                <span className="text-lg text-white/80"> / {offer.testCount}</span>
              </p>
              <ClipboardList className="absolute right-3 top-3 h-7 w-7 text-white/30 sm:right-4 sm:top-4 sm:h-10 sm:w-10" />
            </div>
            <div className="relative overflow-hidden rounded-xl bg-primary p-5 text-white shadow-sm">
              <p className="pr-8 text-sm font-medium text-white/90">Questions solved</p>
              <p className="mt-6 text-4xl font-semibold tabular-nums">{perf.questionsSolved}</p>
              <Target className="absolute right-3 top-3 h-7 w-7 text-white/30 sm:right-4 sm:top-4 sm:h-10 sm:w-10" />
            </div>
          </div>
        </div>

        {/* Learner profile: topic accuracy */}
        <Card className="p-6">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold">Topic proficiency</h2>
            <Link href="/analytics" className="text-sm font-medium text-primary hover:underline">
              All topics
            </Link>
          </div>
          {profile.length ? (
            <div className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {profile.map((t) => (
                <div key={t.topicId} className="text-sm">
                  <div className="flex items-baseline justify-between gap-2">
                    <span className="truncate text-[13px] font-medium">{t.title}</span>
                    <span className="tabular-nums text-muted-foreground">{t.accuracy}%</span>
                  </div>
                  <div className="mt-1.5">
                    <Meter value={t.accuracy ?? 0} className={PROFICIENCY_BAR[t.level]} />
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="mt-5 text-sm text-muted-foreground">
              Accuracy for each of the {offer.topicCount} topics appears here after your first test.
            </p>
          )}
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Best performance */}
        <Card className="overflow-hidden">
          <div className="p-6 pb-4">
            <h2 className="font-semibold">Best performance</h2>
          </div>
          {perf.best.length ? (
            <div className="overflow-x-auto"><table className="w-full text-sm">
              <thead className="border-y bg-surface-muted/60 text-left text-xs text-muted-foreground">
                <tr>
                  <th className="px-4 py-2.5 font-medium sm:px-6">Test</th>
                  <th className="px-3 py-2.5 text-right font-medium">Score</th>
                  <th className="hidden px-3 py-2.5 text-right font-medium sm:table-cell">Accuracy</th>
                  <th className="px-6 py-2.5 font-medium">Proficiency</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {perf.best.map((b) => (
                  <tr key={b.attemptId}>
                    <td className="px-4 py-3 sm:px-6">
                      <Link href={`/results/${b.attemptId}`} className="font-medium hover:text-primary">
                        {b.title}
                      </Link>
                    </td>
                    <td className="px-3 py-3 text-right tabular-nums">{b.score}%</td>
                    <td className="hidden px-3 py-3 text-right tabular-nums sm:table-cell">{b.accuracy}%</td>
                    <td className="px-6 py-3"><ProficiencyBadge level={b.level} /></td>
                  </tr>
                ))}
              </tbody>
            </table></div>
          ) : (
            <p className="px-6 pb-6 text-sm text-muted-foreground">Your top results will be listed here.</p>
          )}
          <div className="border-t px-6 py-3 text-center">
            <Link href="/analytics" className="inline-flex items-center gap-1 text-sm font-medium text-primary">
              View all <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </Card>

        {/* Test distribution */}
        <Card className="p-6">
          <h2 className="font-semibold">Test distribution</h2>
          <div className="mt-4 flex flex-col items-center gap-8 sm:flex-row sm:justify-around">
            <DonutChart
              centerValue={offer.testCount}
              centerLabel="tests"
              data={[
                { name: "Completed", value: completed, color: DONUT.completed },
                { name: "In progress", value: inProgress, color: DONUT.inProgress },
                { name: "To do", value: todo, color: DONUT.todo },
              ]}
            />
            <ul className="space-y-4">
              {[
                ["Completed", completed, DONUT.completed],
                ["In progress", inProgress, DONUT.inProgress],
                ["To do", todo, DONUT.todo],
              ].map(([k, v, c]) => (
                <li key={k as string} className="flex items-center gap-3">
                  <span className="h-3.5 w-3.5 rounded" style={{ background: c as string }} />
                  <span className="w-28 text-sm text-muted-foreground">{k}</span>
                  <span className="text-2xl font-semibold tabular-nums">{String(v).padStart(2, "0")}</span>
                </li>
              ))}
            </ul>
          </div>
        </Card>
      </div>

      {/* Tests for you to take */}
      <section>
        <div className="flex items-center justify-between">
          <h2 className="font-semibold">Tests for you to take</h2>
          <Link href={`/learn/${offer.id}`} className="text-sm font-medium text-primary hover:underline">
            All tests
          </Link>
        </div>
        <div className="mt-4 grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
          {nextUp.map((t, i) => {
            const band = ["bg-[#22a06b]", "bg-primary", "bg-[#e8a33d]", "bg-[#2f6fb8]"][i % 4];
            return (
              <Card key={t.index} className="flex flex-col overflow-hidden">
                <div className={cn("flex items-center justify-between px-4 py-2 text-xs font-medium text-white", t.locked ? "bg-muted-foreground" : band)}>
                  <span>{offer.subject}</span>
                  <span>{t.locked ? "Locked" : t.trial ? "Free trial" : t.status === "in_progress" ? "In progress" : "Full test"}</span>
                </div>
                <div className="flex flex-1 flex-col p-4">
                  <h3 className="font-semibold">{t.title}</h3>
                  <dl className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <dt className="text-muted-foreground">Questions</dt>
                      <dd className="mt-0.5 inline-flex items-center gap-1 font-medium"><FileText className="h-3.5 w-3.5" /> {t.questionCount}</dd>
                    </div>
                    <div>
                      <dt className="text-muted-foreground">Time</dt>
                      <dd className="mt-0.5 inline-flex items-center gap-1 font-medium"><Clock className="h-3.5 w-3.5" /> {formatDuration(t.durationSec)}</dd>
                    </div>
                  </dl>
                  <div className="mt-4 flex-1" />
                  {t.locked ? (
                    <Button asChild variant="outline" size="sm">
                      <Link href={`/checkout/${offer.id}?plan=full`}><Lock className="h-3.5 w-3.5" /> Unlock · ₹{offer.prices.full.toLocaleString("en-IN")}</Link>
                    </Button>
                  ) : (
                    <StartTestButton
                      title={t.trial ? `${t.title} · Free trial` : t.title}
                      questionCount={t.questionCount}
                      durationSec={t.durationSec}
                      topicCount={offer.topicCount}
                      trial={t.trial}
                      resume={t.status === "in_progress"}
                      variant="outline"
                      className="h-9 w-full"
                      action={startTestAction.bind(null, offer.id, "full", t.index)}
                    />
                  )}
                </div>
              </Card>
            );
          })}
          {nextUp.length === 0 && (
            <Card className="p-6 text-sm text-muted-foreground sm:col-span-2 xl:col-span-4">
              {paid ? "You've attempted every test. Retake any test for a fresh paper." : "You've completed both trial papers."}{" "}
              <Link href={`/learn/${offer.id}`} className="font-medium text-primary hover:underline">
                Go to tests
              </Link>
            </Card>
          )}
        </div>
      </section>
    </div>
  );
}
