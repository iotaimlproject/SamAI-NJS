"use client";

import { memo, useSyncExternalStore } from "react";
import { Info, RefreshCcw } from "lucide-react";
import { Bar, BarChart, CartesianGrid, Cell, LabelList, ResponsiveContainer, Tooltip as ChartTooltip, XAxis, YAxis } from "recharts";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Card } from "@/components/ui/card";
import type { ChartPoint } from "@/lib/perfTypes";
import { cn } from "@/lib/utils";
import { PANEL, PanelHeading, TONE_TEXT, orDash } from "./perfUi";

const SERIES = [
  { key: "current", name: "Current", color: "var(--chart-current)" },
  { key: "predicted", name: "Predicted", color: "var(--chart-predicted)" },
  { key: "target", name: "Target", color: "var(--chart-target)" },
] as const;

const AXIS_TICK = { fontSize: "0.625rem", fill: "var(--muted-foreground)" };

function niceMax(max: number) {
  if (!(max > 0)) return 100;
  const padded = max * 1.15;
  const step = 10 ** Math.floor(Math.log10(padded)) / 2;
  return Math.ceil(padded / step) * step;
}

function subscribeResize(onChange: () => void) {
  window.addEventListener("resize", onChange);
  return () => window.removeEventListener("resize", onChange);
}

const rootFontSize = () => parseFloat(getComputedStyle(document.documentElement).fontSize) || 16;

const compactTick = (value: number) => (value >= 1000 ? `${Math.round(value / 100) / 10}k` : String(value));

interface ChartSpec {
  title: string;
  hint: string;
  data: ChartPoint[];
  percent?: boolean;
  format: (value: number) => string;
}

function latestBars(data: ChartPoint[]) {
  const last = data.at(-1);
  return SERIES.map((series) => ({
    name: series.name,
    color: series.color,
    value: last ? Number((series.key === "target" ? (last.target ?? last.applied) : last[series.key]) ?? 0) : 0,
  }));
}

function VarianceChart({ title, hint, data, percent, format }: ChartSpec) {
  const bars = latestBars(data);
  const rem = useSyncExternalStore(subscribeResize, rootFontSize, () => 16);
  const hasData = data.length > 0;
  const delta = bars[1]!.value - bars[0]!.value;

  return (
    <div className="group/chart flex min-h-0 min-w-0 flex-col gap-1.5 rounded-lg border px-2.5 py-2 transition-all duration-200 hover:border-primary/30 hover:shadow-md hover:shadow-foreground/5">
      <div className="flex items-center gap-1.5 text-[0.6875rem] font-semibold uppercase tracking-wide">
        {title}
        <Tooltip>
          <TooltipTrigger asChild>
            <button type="button" aria-label={`About ${title}`} className="rounded-full text-muted-foreground transition-colors hover:text-primary">
              <Info className="size-3" />
            </button>
          </TooltipTrigger>
          <TooltipContent className="max-w-56">{hint}</TooltipContent>
        </Tooltip>
        <span className={cn("ml-auto font-mono normal-case tracking-normal", hasData ? TONE_TEXT[delta >= 0 ? "success" : "destructive"] : "text-muted-foreground")} title="Predicted vs current">
          Δ {hasData ? `${delta >= 0 ? "+" : "-"}${format(Math.abs(delta))}` : "--"}
        </span>
      </div>
      <div className="relative h-40 xl:h-auto xl:min-h-24 xl:flex-1">
        <div className="absolute inset-0">
          <ResponsiveContainer width="100%" height="100%">
            <BarChart data={bars} margin={{ top: 16, right: 2, left: -12, bottom: -4 }} barCategoryGap="18%">
              <CartesianGrid vertical={false} stroke="var(--border)" />
              <XAxis dataKey="name" tick={AXIS_TICK} axisLine={false} tickLine={false} />
              <YAxis
                tick={AXIS_TICK}
                width={Math.round(rem * (percent ? 2.5 : 2.9))}
                axisLine={false}
                tickLine={false}
                domain={percent ? [0, 100] : [0, niceMax]}
                tickCount={5}
                tickFormatter={compactTick}
              />
              <ChartTooltip
                cursor={{ fill: "var(--accent)", radius: 6 }}
                formatter={(value: number) => [format(value), "Value"]}
                contentStyle={{ background: "var(--popover)", border: "1px solid var(--border)", borderRadius: 8, fontSize: "0.6875rem", color: "var(--popover-foreground)", boxShadow: "0 8px 24px -12px rgb(0 0 0 / 0.35)" }}
                labelStyle={{ fontWeight: 600, color: "var(--popover-foreground)" }}
                itemStyle={{ color: "var(--popover-foreground)" }}
              />
              <Bar dataKey="value" activeBar={{ fillOpacity: 0.85 }} radius={[6, 6, 0, 0]} maxBarSize={72} isAnimationActive={false}>
                {bars.map((bar) => (
                  <Cell key={bar.name} fill={bar.color} />
                ))}
                {hasData && (
                  <LabelList dataKey="value" position="top" formatter={(value: number) => format(value)} style={{ fontSize: "0.6875rem", fontWeight: 700, fill: "var(--foreground)", fontFamily: "var(--font-mono)" }} />
                )}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}

interface Props {
  oee: ChartPoint[];
  speed: ChartPoint[];
  profit: ChartPoint[];
  syncRate: string;
  aiSimulation: string;
  className?: string;
}

const pct = (value: number) => `${Math.round(value * 10) / 10}%`;
const plain = (value: number) => (Math.round(value * 10) / 10).toLocaleString("en-IN");
const money = (value: number) => `₹${value >= 1000 ? `${Math.round(value / 100) / 10}k` : Math.round(value)}`;

function PerfProductionCharts({ oee, speed, profit, syncRate, aiSimulation, className }: Props) {
  return (
    <Card className={cn(PANEL, className)}>
      <PanelHeading title="Predictive Telemetry & AI Variances" tone="success">
        <span className="ml-auto truncate font-mono text-[0.6875rem] text-muted-foreground">AI Simulation: {orDash(aiSimulation)}</span>
        <span className="flex items-center gap-1.5 rounded-md bg-success/12 px-2 py-0.5 font-mono text-[0.6875rem] font-semibold text-success">
          <RefreshCcw className={cn("size-3", syncRate && "motion-safe:animate-spin [animation-duration:3s]")} />
          Sync {orDash(syncRate)}
        </span>
      </PanelHeading>
      <div className="grid grid-cols-1 gap-1.5 md:grid-cols-3 xl:min-h-0 xl:flex-1 xl:grid-rows-[minmax(0,1fr)]">
        <VarianceChart title="OEE Variance" hint="Latest OEE: current vs AI-predicted vs target." data={oee} percent format={pct} />
        <VarianceChart title="Speed" hint="Line speed: current vs AI-suggested vs target." data={speed} format={plain} />
        <VarianceChart title="Profit (₹/h)" hint="Hourly profit: current vs predicted vs target." data={profit} format={money} />
      </div>
    </Card>
  );
}

export default memo(PerfProductionCharts);
