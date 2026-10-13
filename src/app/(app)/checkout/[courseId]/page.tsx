import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, CheckCircle2, Info } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/page-header";
import { PayButton } from "@/components/tests/pay-button";
import { requireUser } from "@/lib/server/auth";
import { getAccess, getCourseOffer, quote, topicTitle, type Quote } from "@/lib/server/tests";
import type { Plan } from "@/lib/server/repo";
import { ELL1000_TOPICS } from "@/lib/data/ell1000";
import { purchaseAction } from "@/app/account-actions";
import { cn } from "@/lib/utils";

export const metadata = { title: "Checkout · Adhyan" };

const inr = (n: number) => `₹${n.toLocaleString("en-IN")}`;
const PLANS: Plan[] = ["full", "part_topic", "part_pass", "bundle"];

export default async function CheckoutPage({
  params,
  searchParams,
}: {
  params: Promise<{ courseId: string }>;
  searchParams: Promise<{ plan?: string; topic?: string }>;
}) {
  const { courseId } = await params;
  const sp = await searchParams;
  const user = await requireUser();
  const offer = getCourseOffer(courseId);
  if (!offer) notFound();
  const access = await getAccess(user, courseId);

  const plan: Plan = PLANS.includes(sp.plan as Plan) ? (sp.plan as Plan) : "bundle";
  // Default topic for a single Part Test: the one asked for, else the first not yet owned.
  const firstFree = ELL1000_TOPICS.find((t) => !access.partAll && !access.topics.has(t.id));
  const topicId =
    sp.topic && ELL1000_TOPICS.some((t) => t.id === sp.topic) ? sp.topic : (firstFree?.id ?? ELL1000_TOPICS[0].id);

  const q = {
    full: quote(offer, access, "full"),
    part_topic: quote(offer, access, "part_topic", topicId),
    part_pass: quote(offer, access, "part_pass"),
    bundle: quote(offer, access, "bundle"),
  } satisfies Record<Plan, Quote>;
  const selected = q[plan];

  const details: Record<Plan, { blurb: string; features: string[] }> = {
    full: {
      blurb: "Exam rehearsal across the whole syllabus",
      features: [
        `${offer.testCount} full tests × ${offer.questionsPerTest} questions`,
        `Every test covers all ${offer.topicCount} topics`,
        "2-hour papers, percentile and rank",
      ],
    },
    part_topic: {
      blurb: "Practise one topic you need",
      features: [
        `${offer.partQuestions} questions from one topic`,
        `${Math.round(offer.partDurationSec / 60)}-minute paper, unlimited retakes`,
        `Counts towards the Pass within ${offer.passCreditDays} days`,
      ],
    },
    part_pass: {
      blurb: `Part Tests for all ${offer.topicCount} topics`,
      features: [
        `${offer.topicCount} topic tests × ${offer.partQuestions} questions`,
        "Fresh paper on every retake",
        "Topic-wise percentile and trend",
      ],
    },
    bundle: {
      blurb: "Everything in this course",
      features: [
        `All ${offer.testCount} Full Tests`,
        `All ${offer.topicCount} Part Tests`,
        `Save ${inr(offer.prices.full + offer.prices.partPass - offer.prices.bundle)} on buying both`,
      ],
    },
  };

  const href = (p: Plan) =>
    `/checkout/${courseId}?plan=${p}${p === "part_topic" ? `&topic=${topicId}` : ""}`;

  return (
    <div className="mx-auto max-w-5xl space-y-8">
      <PageHeader
        back={{ href: `/learn/${courseId}`, label: "Back to tests" }}
        eyebrow="Checkout"
        title="Choose your plan"
        description={`${offer.title} · one-time payment, 12 months' access`}
      />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {PLANS.map((p) => {
          const item = q[p];
          const active = p === plan;
          return (
            <Link
              key={p}
              href={href(p)}
              aria-current={active}
              className={cn(
                "relative flex flex-col rounded-xl border bg-surface p-5 transition-shadow hover:shadow-md",
                active && "border-primary ring-1 ring-primary",
              )}
            >
              {p === "bundle" && (
                <span className="absolute -top-2.5 left-5 rounded-full bg-accent px-2.5 py-0.5 text-xs font-medium text-white">
                  Best value
                </span>
              )}
              <p className="font-semibold">{item.name.replace(/^Part Test: (?!All).*/, "Part Test: single topic")}</p>
              <p className="mt-0.5 text-xs text-muted-foreground">{details[p].blurb}</p>
              <p className="mt-4 text-2xl font-semibold tracking-tight">{inr(item.price)}</p>
              {item.credit > 0 && !item.owned && (
                <p className="text-xs text-success">You pay {inr(item.payable)} after credit</p>
              )}
              <ul className="mt-4 flex-1 space-y-2 text-xs">
                {details[p].features.map((f) => (
                  <li key={f} className="flex gap-1.5">
                    <Check className="mt-0.5 h-3.5 w-3.5 shrink-0 text-success" /> {f}
                  </li>
                ))}
              </ul>
              {item.owned && (
                <p className="mt-4 inline-flex items-center gap-1 text-xs font-medium text-success">
                  <CheckCircle2 className="h-4 w-4" /> Already unlocked
                </p>
              )}
            </Link>
          );
        })}
      </div>

      <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_360px] [&>*]:min-w-0">
        <Card className="p-6">
          <p className="font-semibold">{selected.name}</p>
          <p className="mt-1 text-sm text-muted-foreground">{details[plan].blurb}</p>

          {plan === "part_topic" && (
            <div className="mt-5">
              <p className="text-sm font-medium">Choose a topic</p>
              <div className="mt-2 grid max-h-80 grid-cols-1 gap-1.5 overflow-y-auto pr-1 sm:grid-cols-2">
                {ELL1000_TOPICS.map((t, i) => {
                  const owned = access.partAll || access.topics.has(t.id);
                  return (
                    <Link
                      key={t.id}
                      href={`/checkout/${courseId}?plan=part_topic&topic=${t.id}`}
                      className={cn(
                        "flex items-center gap-2 rounded-lg border px-3 py-2 text-sm",
                        t.id === topicId ? "border-primary bg-primary-soft" : "hover:bg-surface-muted",
                        owned && "text-muted-foreground",
                      )}
                    >
                      <span className="w-5 shrink-0 text-xs tabular-nums text-muted-foreground">{i + 1}</span>
                      <span className="min-w-0 flex-1 truncate">{t.title}</span>
                      {owned && <CheckCircle2 className="h-4 w-4 shrink-0 text-success" />}
                    </Link>
                  );
                })}
              </div>
            </div>
          )}

          <ul className="mt-5 space-y-2.5 text-sm">
            {details[plan].features.map((f) => (
              <li key={f} className="flex gap-2.5">
                <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> {f}
              </li>
            ))}
            <li className="flex gap-2.5">
              <Check className="mt-0.5 h-4 w-4 shrink-0 text-success" /> Solutions for every question you
              answered incorrectly
            </li>
          </ul>
        </Card>

        <Card className="h-fit p-6">
          <p className="font-semibold">Order summary</p>
          <dl className="mt-4 space-y-2 text-sm">
            <div className="flex justify-between gap-3">
              <dt className="text-muted-foreground">
                {plan === "part_topic" ? `Part Test: ${topicTitle(topicId)}` : selected.name}
              </dt>
              <dd className="shrink-0">{inr(selected.price)}</dd>
            </div>
            {selected.credit > 0 && (
              <div className="flex justify-between gap-3 text-success">
                <dt>Credit from earlier purchases</dt>
                <dd className="shrink-0">−{inr(selected.credit)}</dd>
              </div>
            )}
            <div className="flex justify-between">
              <dt className="text-muted-foreground">Taxes</dt>
              <dd>Included</dd>
            </div>
            <div className="flex justify-between border-t pt-3 text-base font-semibold">
              <dt>Total</dt>
              <dd>{inr(selected.payable)}</dd>
            </div>
          </dl>
          <p className="mt-4 text-xs text-muted-foreground">
            Billed to {user.fullName} ({user.email}). One-time payment, no subscription.
          </p>
          {selected.owned ? (
            <Button asChild className="mt-5 w-full" size="lg" variant="outline">
              <Link href={`/learn/${courseId}?mode=${plan === "full" || plan === "bundle" ? "full" : "part"}`}>
                Already unlocked: go to tests
              </Link>
            </Button>
          ) : (
            <form action={purchaseAction.bind(null, offer.id, plan, plan === "part_topic" ? topicId : "")} className="mt-5">
              <PayButton amount={selected.payable} />
            </form>
          )}
          <p className="mt-4 flex gap-2 rounded-lg bg-surface-muted p-3 text-xs text-muted-foreground">
            <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            Test mode: no money is charged. Online payment (UPI / cards) will be enabled at launch.
          </p>
        </Card>
      </div>
    </div>
  );
}
