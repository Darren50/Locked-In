import { cn } from "@/lib/utils";

export function GlassPanel({ className, ...props }) {
  return (
    <div
      className={cn(
        "rounded-2xl border border-white/30 bg-white/40 shadow-sm backdrop-blur-md dark:border-white/10 dark:bg-black/40",
        className,
      )}
      {...props}
    />
  );
}
