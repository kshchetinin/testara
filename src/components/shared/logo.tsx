import { cn } from "@/lib/utils";

// The star mark is the actual TESTARA brand asset (Optimal group brand guide,
// public/brand/testara-star.png) — cropped from the source file, not redrawn.
export function Logo({ size = "sm", className }: { size?: "sm" | "lg"; className?: string }) {
  return (
    <img
      src="/brand/testara-star.png"
      alt=""
      className={cn("shrink-0 object-contain", size === "lg" ? "h-12 w-12" : "h-9 w-9", className)}
      aria-hidden
    />
  );
}
