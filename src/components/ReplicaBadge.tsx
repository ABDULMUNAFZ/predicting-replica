/**
 * Small fixed disclosure on every page: this is an interview-assignment replica,
 * not the real predicting.top. The visual-diff eval masks this element so it
 * does not count against the pixel-match score (and says so in the report).
 */
export function ReplicaBadge() {
  return (
    <a
      href="/replica"
      data-testid="replica-badge"
      className="fixed bottom-3 right-3 z-50 rounded-full border border-border bg-card px-3 py-1 text-[11px] text-muted-foreground hover:text-foreground"
      title="Interview assignment replica of predicting.top. Not affiliated with predicting.top."
    >
      Interview replica · not affiliated
    </a>
  );
}
