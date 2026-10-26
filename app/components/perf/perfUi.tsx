import type { LucideIcon } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/utils";

export type Tone = "primary" | "success" | "warning" | "destructive" | "muted";

export const TONE_TEXT: Record<Tone, string> = {
  primary: "text-primary",
  success: "text-success",
  warning: "text-warning",
  destructive: "text-destructive",
  muted: "text-muted-foreground",
};

export const TONE_BADGE: Record<Tone, string> = {
  primary: "bg-primary/10 text-primary",
  success: "bg-success/12 text-success",
  warning: "bg-warning/12 text-warning",
  destructive: "bg-destructive/10 text-destructive",
  muted: "bg-muted text-muted-foreground",
};

const TONE_DOT: Record<Tone, string> = {
  primary: "bg-primary",
  success: "bg-success",
  warning: "bg-warning",
  destructive: "bg-destructive",
  muted: "bg-muted-foreground/50",
};

const finite = (value: number) => (Number.isFinite(value) ? value : 0);

export const fmtNum = (value: number) => finite(value).toLocaleString("en-IN");
export const fmtPct = (value: number) => `${finite(value).toFixed(1)}%`;
export const fmtMoney = (value: number) => `₹${finite(value).toLocaleString("en-IN")}`;
export const orDash = (value: string | undefined | null) => (value && value.trim() ? value : "--");

export function StatusDot({ tone = "primary", className }: { tone?: Tone; className?: string }) {
  return <span className={cn("inline-block size-2.5 shrink-0 rounded-full", TONE_DOT[tone], className)} />;
}

export function PanelHeading({ title, tone = "primary", children }: { title: string; tone?: Tone; children?: ReactNode }) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-3">
      <h2 className="flex min-w-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <StatusDot tone={tone} className="size-2" />
        <span className="truncate">{title}</span>
      </h2>
      {children}
    </div>
  );
}

export function MetricTile({
  icon: Icon,
  label,
  value,
  tone = "muted",
  valueTone,
  compact = false,
  className,
}: {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  tone?: Tone;
  valueTone?: Tone;
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "group/tile flex min-w-0 items-center rounded-lg border bg-card transition-all duration-200 hover:-translate-y-px hover:border-primary/40 hover:bg-accent/50 hover:shadow-sm dark:bg-muted/40 dark:hover:bg-accent/60",
        compact ? "gap-2 px-2.5 py-1" : "gap-2.5 px-3 py-1.5",
        className,
      )}
    >
      <Icon className={cn("shrink-0 transition-transform duration-200 group-hover/tile:scale-115", compact ? "size-3.5" : "size-4", TONE_TEXT[tone])} strokeWidth={1.75} />
      <div className="min-w-0">
        <div className="truncate text-[0.625rem] font-medium uppercase leading-4 tracking-wide text-muted-foreground" title={label}>
          {label}
        </div>
        <div
          className={cn(
            "truncate font-mono font-semibold tabular-nums",
            compact ? "text-xs leading-4" : "text-sm leading-5",
            valueTone ? TONE_TEXT[valueTone] : "text-foreground",
          )}
        >
          <span key={String(value)} className={cn(VALUE_POP, "block truncate")}>
            {value}
          </span>
        </div>
      </div>
    </div>
  );
}

export const PANEL =
  "gap-2 px-3 py-2.5 transition-shadow duration-300 hover:shadow-md hover:shadow-foreground/5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-2 motion-safe:duration-500";

export const VALUE_POP = "inline-block motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-300";

export const TAB_LIST = "h-8 w-full gap-1 bg-muted p-0.5 group-data-horizontal/tabs:h-8";

export const TAB_TRIGGER: Record<"primary" | "warning", string> = {
  primary:
    "h-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-primary data-[state=active]:ring-1 data-[state=active]:ring-primary/60 dark:data-[state=active]:bg-card dark:data-[state=active]:text-primary",
  warning:
    "h-full text-xs font-semibold data-[state=active]:bg-card data-[state=active]:text-warning data-[state=active]:ring-1 data-[state=active]:ring-warning/60 dark:data-[state=active]:bg-card dark:data-[state=active]:text-warning",
};
