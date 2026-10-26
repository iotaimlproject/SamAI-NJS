"use client";

import { memo, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Zap } from "lucide-react";
import { Card } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { LabeledValue } from "@/lib/perfTypes";
import { cn } from "@/lib/utils";
import { MetricTile, PANEL, TAB_LIST, TAB_TRIGGER, orDash, type Tone } from "./perfUi";

export interface MetricItem {
  icon: LucideIcon;
  label: string;
  value: string;
  tone?: Tone;
}

interface Props {
  items: MetricItem[];
  energy: LabeledValue[];
  busInfo: string;
  jitter: string;
  className?: string;
}

const SCROLL_AREA = "-m-1 min-h-0 max-h-72 overflow-y-auto overscroll-contain p-1 xl:max-h-none";

function TileGrid({ children }: { children: ReactNode }) {
  return <div className="grid grid-cols-2 gap-1.5 xl:min-h-full xl:auto-rows-[minmax(min-content,1fr)] [&>:last-child:nth-child(odd)]:col-span-2">{children}</div>;
}

function PerfMetricList({ items, energy, busInfo, jitter, className }: Props) {
  return (
    <Card className={cn(PANEL, "min-h-0", className)}>
      <Tabs defaultValue="oee" className="min-h-0 flex-1 gap-2">
        <TabsList className={TAB_LIST}>
          <TabsTrigger value="oee" className={TAB_TRIGGER.primary}>OEE Data</TabsTrigger>
          <TabsTrigger value="energy" className={TAB_TRIGGER.primary}>Energy Data</TabsTrigger>
        </TabsList>
        <TabsContent value="oee" className={SCROLL_AREA}>
          <TileGrid>
            {items.map((item) => (
              <MetricTile key={item.label} compact icon={item.icon} label={item.label} value={item.value} tone={item.tone ?? "primary"} valueTone={item.tone === "destructive" ? "destructive" : undefined} />
            ))}
          </TileGrid>
        </TabsContent>
        <TabsContent value="energy" className={SCROLL_AREA}>
          {energy.length > 0 ? (
            <TileGrid>
              {energy.map((item) => (
                <MetricTile key={item.label} compact icon={Zap} tone="warning" label={item.label} value={orDash(item.value)} />
              ))}
            </TileGrid>
          ) : (
            <div className="grid h-full min-h-32 place-items-center text-xs text-muted-foreground">No energy data received from Node-RED.</div>
          )}
        </TabsContent>
      </Tabs>
      <div className="flex items-center justify-between gap-3 border-t pt-1.5 font-mono text-[0.6875rem] text-muted-foreground">
        <span className="truncate">Bus: {orDash(busInfo)}</span>
        <span className="shrink-0 text-primary">Jitter: {orDash(jitter)}</span>
      </div>
    </Card>
  );
}

export default memo(PerfMetricList);
