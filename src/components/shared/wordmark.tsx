// Brand guide: "TE" and "A" in Optimal Blue, "STAR" in Optimal Teal.
export function Wordmark({ className }: { className?: string }) {
  return (
    <span className={className}>
      <span className="text-primary">TE</span>
      <span className="text-accent">STAR</span>
      <span className="text-primary">A</span>
    </span>
  );
}
