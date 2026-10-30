"use client";

import { memo, useEffect, useState } from "react";
import { Card } from "@/components/ui/card";
import { Item, ItemContent, ItemDescription, ItemMedia, ItemTitle } from "@/components/ui/item";
import { Led } from "@/components/ui/led";
import { cn } from "@/lib/utils";
import PerfGauge from "./PerfGauge";
import { PANEL, PanelHeading, TONE_TEXT, fmtNum, fmtPct, type Tone } from "./perfUi";

interface Props {
  availability: number;
  performance: number;
  quality: number;
  oee: number;
  availabilityNote: string;
  performanceNote: string;
  qualityNote: string;
  oeeNote: string;
  machineOn: boolean;
  powerOn: boolean;
  productionOn: boolean;
  stopped: boolean;
  progress: number;
  predictedProgress: number;
  partsProduced: number;
  productionQuantity: number;
  updatedAt: number | null;
  className?: string;
}

interface StatusState {
  label: string;
  detail: string;
  tone: Tone;
}

const clampPct = (value: number) => (Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0);

function machineState({ machineOn, powerOn }: Props): StatusState {
  if (!machineOn) return { label: "Off", detail: "Switched off", tone: "muted" };
  return powerOn ? { label: "Running", detail: "Power nominal", tone: "success" } : { label: "No Power", detail: "Power LED off", tone: "destructive" };
}

function productionState({ machineOn, stopped, productionOn }: Props): StatusState {
  if (!machineOn) return { label: "Idle", detail: "Machine off", tone: "muted" };
  if (stopped) return { label: "Stopped", detail: "Stop signal", tone: "destructive" };
  return productionOn ? { label: "Active", detail: "Line producing", tone: "success" } : { label: "Halted", detail: "No output", tone: "destructive" };
}

function RefreshedAgo({ updatedAt }: { updatedAt: number | null }) {
  const [now, setNow] = useState(() => Date.now());

  useEffect(() => {
    if (updatedAt === null) return;
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, [updatedAt]);

  if (updatedAt === null) return <span className="font-mono text-[0.6875rem] text-muted-foreground">Awaiting data</span>;
  const seconds = Math.max(0, (now - updatedAt) / 1000);
  const label = seconds < 60 ? `${seconds.toFixed(seconds < 10 ? 1 : 0)}s` : `${Math.floor(seconds / 60)}m`;
  return <span className="font-mono text-[0.6875rem] text-muted-foreground">Refreshed: {label} ago</span>;
}

// Each status gets its own box, tinted by state, filling half the cell.
const STATUS_BOX: Record<Tone, string> = {
  primary: "border-primary/30 bg-primary/5",
  success: "border-success/35 bg-success/5",
  warning: "border-warning/35 bg-warning/5",
  destructive: "border-destructive/35 bg-destructive/5",
  muted: "",
};

function StatusItem({ title, state }: { title: string; state: StatusState }) {
  const lit = state.tone === "success" || state.tone === "destructive";
  return (
    <Item size="xs" className={cn("group/status h-full gap-3 rounded-lg border px-3 py-2 transition-colors hover:bg-muted/60", STATUS_BOX[state.tone])}>
      <ItemMedia className="transition-transform duration-200 group-hover/status:scale-110">
        <Led on={lit} color={state.tone === "destructive" ? "red" : "green"} pulse={state.tone === "success"} label={`${title} ${state.label}`} className="size-10" />
      </ItemMedia>
      <ItemContent className="min-w-0 gap-0.5">
        <ItemTitle className="text-base font-bold uppercase tracking-wide">{title}</ItemTitle>
        <ItemDescription className={cn("truncate text-sm font-medium", TONE_TEXT[state.tone])}>{state.detail}</ItemDescription>
      </ItemContent>
    </Item>
  );
}

function PerfOeeOverview(props: Props) {
  const progress = clampPct(props.progress);
  const predicted = clampPct(props.predictedProgress);

  return (
    <Card className={cn(PANEL, props.className)}>
      <PanelHeading title="Overall Equipment Effectiveness (OEE) Real-Time Arcs" tone="success">
        <RefreshedAgo updatedAt={props.updatedAt} />
      </PanelHeading>

      <div className="grid grid-cols-2 gap-1.5 md:grid-cols-4 xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,13.5rem)] 2xl:grid-cols-[repeat(4,minmax(0,1fr))_minmax(0,15rem)]">
        <PerfGauge title="Availability" value={props.availability} note={props.availabilityNote} color="var(--primary)" />
        <PerfGauge title="Performance" value={props.performance} note={props.performanceNote} color="var(--gauge-performance)" />
        <PerfGauge title="Quality" value={props.quality} note={props.qualityNote} color="var(--warning)" />
        <PerfGauge title="Overall OEE" value={props.oee} note={props.oeeNote} color="var(--chart-predicted)" />
        <div className="col-span-2 grid grid-cols-2 gap-1.5 md:col-span-4 xl:col-span-1 xl:grid-cols-1 xl:grid-rows-2">
          <StatusItem title="Machine" state={machineState(props)} />
          <StatusItem title="Production" state={productionState(props)} />
        </div>
      </div>

      <div className="rounded-lg border px-3 py-1.5">
        <div className="flex flex-wrap items-center justify-between gap-x-4">
          <h3 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
            <span className="size-2 rounded-full bg-chart-predicted" />
            Production Progress
          </h3>
          <span className="font-mono text-[0.6875rem] text-muted-foreground">
            Progress: <span className={cn("font-semibold", TONE_TEXT.primary)}>{fmtPct(progress)}</span>
            <span className="mx-2">|</span>
            Completed: <span className={cn("font-semibold", TONE_TEXT.primary)}>{fmtNum(props.partsProduced)}</span> / {fmtNum(props.productionQuantity)} units
          </span>
        </div>
        <div
          className="relative mt-1 h-2 overflow-hidden rounded-full bg-muted ring-1 ring-border ring-inset"
          role="progressbar"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          aria-label="Production progress"
        >
          <div className="absolute inset-y-0 left-0 rounded-full bg-warning transition-[width] duration-500" style={{ width: `${Math.max(predicted, progress)}%` }} />
          <div className="absolute inset-y-0 left-0 overflow-hidden rounded-full bg-linear-to-r from-chart-predicted to-primary transition-[width] duration-700" style={{ width: `${progress}%` }}>
            {progress > 0 && progress < 100 && <span className="absolute inset-y-0 w-1/3 bg-linear-to-r from-transparent via-white/45 to-transparent motion-safe:animate-shimmer" />}
          </div>
        </div>
      </div>
    </Card>
  );
}

export default memo(PerfOeeOverview);
