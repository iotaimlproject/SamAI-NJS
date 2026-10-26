"use client";

import { memo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import type { AlertItem } from "@/lib/perfTypes";
import { cn } from "@/lib/utils";
import { StatusDot, type Tone } from "./perfUi";

const CHIP: Record<Tone, string> = {
  primary: "border-primary/25 bg-primary/5 [&>b]:text-primary",
  success: "border-success/25 bg-success/5 [&>b]:text-success",
  warning: "border-warning/30 bg-warning/8 [&>b]:text-warning",
  destructive: "border-destructive/30 bg-destructive/5 [&>b]:text-destructive",
  muted: "border-border bg-muted [&>b]:text-muted-foreground",
};

function levelTone(level: string): Tone {
  const l = level.toLowerCase();
  if (/err|fault|crit|alarm/.test(l)) return "destructive";
  if (/ai|warn|notice/.test(l)) return "warning";
  if (/ok|success/.test(l)) return "success";
  return "primary";
}

interface Props {
  alerts: AlertItem[];
  error: string | null;
  onAcknowledge: () => void;
  className?: string;
}

function PerfMessagesAlerts({ alerts, error, onAcknowledge, className }: Props) {
  const [acknowledged, setAcknowledged] = useState<AlertItem[] | null>(null);
  const visible = [...(error ? [{ level: "error", text: error }] : []), ...(alerts === acknowledged ? [] : alerts)];

  const acknowledge = () => {
    setAcknowledged(alerts);
    onAcknowledge();
  };

  return (
    <Card className={cn("flex-row items-center gap-2 px-3 py-1.5", className)}>
      <span className="flex shrink-0 items-center gap-2 text-xs font-semibold uppercase tracking-wide">
        <StatusDot tone={visible.length > 0 ? "warning" : "muted"} className="size-2" />
        System Telemetry & Alerts:
      </span>
      <div className="no-scrollbar flex min-w-0 flex-1 gap-1.5 overflow-x-auto">
        {visible.length === 0 ? (
          <span className="py-0.5 text-xs text-muted-foreground">No active alerts.</span>
        ) : (
          visible.map((alert, index) => (
            <span
              key={`${index}-${alert.text}`}
              className={cn("max-w-md shrink-0 truncate rounded-md border px-2 py-0.5 font-mono text-[0.6875rem] text-muted-foreground transition-all duration-200 hover:-translate-y-px hover:text-foreground hover:shadow-sm motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-right-2", CHIP[levelTone(alert.level)])}
              title={alert.text}
            >
              <b className="font-semibold">[{alert.level.toUpperCase()}]</b> {alert.text}
            </span>
          ))
        )}
      </div>
      <Button variant="outline" size="sm" className="shrink-0" disabled={alerts.length === 0 || alerts === acknowledged} onClick={acknowledge}>
        Acknowledge All
      </Button>
    </Card>
  );
}

export default memo(PerfMessagesAlerts);
