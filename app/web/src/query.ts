/**
 * Build a URL query string, dropping undefined/null/empty values.
 *
 * Passing an object straight to URLSearchParams coerces `undefined` to the
 * literal string "undefined" — which the server then treats as a real filter
 * and returns nothing (this is why the Knowledge tab showed no entries while
 * Obsidian and the graph, which read the store directly, showed them all).
 * This keeps empty filters truly empty.
 */
export function qs(params: Record<string, string | undefined | null>): string {
  const p = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v != null && v !== '') p.set(k, v);
  }
  const s = p.toString();
  return s ? `?${s}` : '';
}
