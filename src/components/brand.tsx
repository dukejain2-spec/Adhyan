import Link from "next/link";
import { cn } from "@/lib/utils";
import { BRAND_NAME, BRAND_TAGLINE } from "@/lib/config";

/** Wordmark: square monogram + name. `tone="light"` for dark backgrounds. */
export function Brand({
  href = "/",
  tone = "dark",
  showTagline = false,
  className,
}: {
  href?: string;
  tone?: "dark" | "light";
  showTagline?: boolean;
  className?: string;
}) {
  return (
    <Link href={href} className={cn("flex items-center gap-2.5", className)}>
      <span
        className={cn(
          "flex h-8 w-8 items-center justify-center rounded-lg text-sm font-bold",
          tone === "light" ? "bg-white text-nav" : "bg-primary text-primary-foreground",
        )}
      >
        A
      </span>
      <span className="flex flex-col leading-none">
        <span
          className={cn(
            "text-[17px] font-semibold tracking-tight",
            tone === "light" ? "text-white" : "text-foreground",
          )}
        >
          {BRAND_NAME}
        </span>
        {showTagline && (
          <span
            className={cn(
              "mt-1 hidden text-[10px] font-medium uppercase tracking-[0.14em] sm:block",
              tone === "light" ? "text-nav-muted" : "text-muted-foreground",
            )}
          >
            {BRAND_TAGLINE}
          </span>
        )}
      </span>
    </Link>
  );
}
