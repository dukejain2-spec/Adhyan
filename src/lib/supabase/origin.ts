/** Reduce a Supabase project URL to its origin: a pasted ".../rest/v1/" breaks every call. */
export function supabaseOrigin(raw: string | undefined): string {
  const v = (raw ?? "").trim().replace(/^["']|["']$/g, "");
  try {
    return new URL(v).origin;
  } catch {
    return "";
  }
}
