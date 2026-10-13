"use client";

import { useState, useTransition } from "react";
import { RefreshCw, Shuffle } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { previewQuestionVariants } from "@/app/actions";
import type { PreviewVariant } from "@/lib/data/store";

export const FORMAT_LABEL: Record<string, string> = {
  single: "Single choice",
  multiple: "Multiple choice",
  true_false: "True / False",
  integer: "Short answer (numeric)",
  fill_blank: "Short answer",
};

export function VariantPreview({
  questionId,
  number,
  prompt,
  answer,
  media,
}: {
  questionId: string;
  number?: number;
  prompt: string;
  answer?: string;
  media?: string;
}) {
  const [variants, setVariants] = useState<PreviewVariant[] | null>(null);
  const [pending, startTransition] = useTransition();

  const generate = () => {
    startTransition(async () => {
      setVariants(await previewQuestionVariants(questionId));
    });
  };

  return (
    <div className="rounded-xl border bg-surface p-4 sm:p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
        <div className="min-w-0">
          {number !== undefined && (
            <p className="text-xs font-medium text-muted-foreground">Question {number}</p>
          )}
          <p className="prompt-text mt-1 text-[15px] leading-relaxed">{prompt}</p>
          {media && (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={media}
              alt="Question figure"
              className="mt-3 w-full max-w-xs rounded-md border bg-white p-1.5"
            />
          )}
          {answer && (
            <p className="mt-3 text-sm">
              <span className="text-muted-foreground">Answer: </span>
              <span className="font-semibold text-success">{answer}</span>
            </p>
          )}
        </div>
        <Button size="sm" variant="outline" onClick={generate} disabled={pending} className="shrink-0 self-start">
          {variants ? <RefreshCw className="h-4 w-4" /> : <Shuffle className="h-4 w-4" />}
          {pending ? "Generating…" : variants ? "Regenerate" : "Preview variants"}
        </Button>
      </div>

      {variants && (
        <div className="mt-5 border-t pt-4">
          <p className="text-xs font-medium text-muted-foreground">
            Four students, four papers — values, format and option order change; the answer and
            solution are recomputed for each.
          </p>
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {variants.map((v, i) => (
              <div key={i} className="rounded-lg border bg-surface-muted/60 p-4">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold">Student {i + 1}</span>
                  <Badge variant="primary">{FORMAT_LABEL[v.renderedType] ?? v.renderedType}</Badge>
                </div>
                <p className="prompt-text mt-2 text-sm leading-relaxed">{v.prompt}</p>
                {v.options && (
                  <ol className="mt-2 space-y-1">
                    {v.options.map((o, j) => (
                      <li key={o.id} className="text-xs text-muted-foreground">
                        {String.fromCharCode(65 + j)}. {o.text}
                      </li>
                    ))}
                  </ol>
                )}
                <p className="mt-3 text-xs">
                  <span className="text-muted-foreground">Answer: </span>
                  <span className="font-semibold text-success">{v.correctAnswer}</span>
                </p>
                {v.explanation && (
                  <p className="mt-1 text-xs text-muted-foreground">Solution: {v.explanation}</p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
