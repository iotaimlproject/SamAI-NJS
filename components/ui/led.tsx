import type { CSSProperties } from "react";
import { cn } from "@/lib/utils";

export type LedColor = "green" | "red" | "amber" | "blue";

const LED_VAR: Record<LedColor, string> = {
  green: "var(--success)",
  red: "var(--destructive)",
  amber: "var(--warning)",
  blue: "var(--primary)",
};

export function Led({ on, color = "green", pulse = false, label, className }: { on: boolean; color?: LedColor; pulse?: boolean; label?: string; className?: string }) {
  return (
    <span
      data-slot="led"
      data-on={on}
      role="img"
      aria-label={label}
      style={{ "--led": LED_VAR[color] } as CSSProperties}
      className={cn(
        "relative inline-block size-4 shrink-0 rounded-full ring-1 ring-black/25 transition-[background,box-shadow] duration-300 dark:ring-white/10",
        "bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklch,var(--muted-foreground)_45%,white),var(--muted)_70%)]",
        "data-[on=true]:bg-[radial-gradient(circle_at_35%_30%,color-mix(in_oklch,var(--led)_35%,white),var(--led)_45%,color-mix(in_oklch,var(--led)_60%,black)_100%)]",
        "data-[on=true]:shadow-[0_0_0.6em_0.15em_color-mix(in_oklch,var(--led)_55%,transparent)]",
        on && pulse && "motion-safe:animate-pulse",
        className,
      )}
    />
  );
}
