import { cn } from "@/lib/utils";

export function Logo({ size = "sm", className }: { size?: "sm" | "lg"; className?: string }) {
  return (
    <div
      className={cn(
        "flex shrink-0 items-center justify-center rounded-lg bg-primary font-mono font-bold tracking-tighter text-primary-foreground",
        size === "lg" ? "h-12 w-12 rounded-xl text-xl" : "h-9 w-9 text-sm",
        className
      )}
      aria-hidden
    >
      [T]
    </div>
  );
}
