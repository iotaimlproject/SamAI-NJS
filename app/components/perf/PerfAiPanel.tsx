"use client";

import { memo } from "react";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LabeledValue } from "@/lib/perfTypes";
import { cn } from "@/lib/utils";
import { PANEL, StatusDot, TAB_LIST, TAB_TRIGGER, fmtNum, fmtPct, orDash } from "./perfUi";

interface Props {
  predictedOEE: number;
  aiSuggestedSpeed: number;
  speedStatus: string;
  confidence: number;
  aiInsight: string;
  aiMaintenance: LabeledValue[];
  canApply: boolean;
  onApply: () => void;
  className?: string;
}

function Readouts({ rows }: { rows: LabeledValue[] }) {
  return (
    <dl className="space-y-1 rounded-lg border px-3 py-2 font-mono text-xs transition-colors hover:border-success/40">
      {rows.map((row) => (
        <div key={row.label} className="-mx-1 flex items-center justify-between gap-3 rounded px-1 transition-colors hover:bg-muted/60">
          <dt className="truncate text-muted-foreground">{row.label}:</dt>
          <dd className="shrink-0 font-semibold text-success">{orDash(row.value)}</dd>
        </div>
      ))}
    </dl>
  );
}

function PerfAiPanel(props: Props) {
  const readouts: LabeledValue[] = [
    { label: "Predicted OEE", value: fmtPct(props.predictedOEE) },
    { label: "AI Suggested Speed", value: fmtNum(props.aiSuggestedSpeed) },
    { label: "Speed Status", value: props.speedStatus },
  ];

  return (
    <Card className={cn(PANEL, "min-h-0", props.className)}>
      <Tabs defaultValue="oee" className="min-h-0 flex-1 gap-2">
        <TabsList className={TAB_LIST}>
          <TabsTrigger value="oee" className={TAB_TRIGGER.warning}>AI OEE Data</TabsTrigger>
          <TabsTrigger value="maintenance" className={TAB_TRIGGER.warning}>AI Maintenance</TabsTrigger>
        </TabsList>
        <TabsContent value="oee" className="min-h-0 space-y-2 overflow-y-auto">
          <div className="space-y-1.5 rounded-lg border px-3 py-2 transition-colors hover:border-warning/40">
            <div className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                <StatusDot tone="warning" className="size-2" />
                SAM Autonomous Agent
              </span>
              <span className="rounded-md bg-success/12 px-1.5 py-0.5 font-mono text-[0.6875rem] font-semibold text-success">
                {props.confidence > 0 ? `${props.confidence}% Conf.` : "-- Conf."}
              </span>
            </div>
            <p className="line-clamp-3 text-xs leading-snug text-muted-foreground">
              {props.aiInsight ? `“${props.aiInsight}”` : "Awaiting AI recommendations from Node-RED."}
            </p>
          </div>
          <Readouts rows={readouts} />
        </TabsContent>
        <TabsContent value="maintenance" className="min-h-0 overflow-y-auto">
          {props.aiMaintenance.length > 0 ? (
            <Readouts rows={props.aiMaintenance} />
          ) : (
            <div className="grid h-full min-h-32 place-items-center text-xs text-muted-foreground">No AI maintenance data received.</div>
          )}
        </TabsContent>
      </Tabs>
      <Button
        size="lg"
        className="group/apply h-9 w-full bg-warning text-xs font-bold uppercase tracking-wide text-warning-foreground transition-all hover:-translate-y-px hover:bg-warning/90 hover:shadow-lg hover:shadow-warning/30"
        disabled={!props.canApply}
        onClick={props.onApply}
      >
        <Sparkles className="transition-transform duration-500 group-hover/apply:rotate-12 group-hover/apply:scale-125" />
        Apply AI Optimal Parameters
      </Button>
    </Card>
  );
}

export default memo(PerfAiPanel);
