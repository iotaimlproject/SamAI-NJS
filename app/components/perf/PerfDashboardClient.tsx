"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Boxes,
  CalendarClock,
  CalendarRange,
  CheckCircle2,
  Clock,
  Gauge,
  Hourglass,
  Package,
  PackageCheck,
  RotateCw,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  UserRoundCog,
  Wrench,
  XCircle,
} from "lucide-react";
import PerfHeader from "./PerfHeader";
import PerfLiveBatch from "./PerfLiveBatch";
import PerfOeeOverview from "./PerfOeeOverview";
import PerfMetricList, { type MetricItem } from "./PerfMetricList";
import PerfProductionCharts from "./PerfProductionCharts";
import PerfAiPanel from "./PerfAiPanel";
import PerfMessagesAlerts from "./PerfMessagesAlerts";
import PerfDataPanel from "./PerfDataPanel";
import PerfVoiceOrb from "./PerfVoiceOrb";
import PerfCctvWindow from "./PerfCctvWindow";
import { fmtMoney, fmtNum, orDash } from "./perfUi";
import { usePerfDashboardSocket } from "@/hooks/usePerfDashboardSocket";
import { EMPTY_DASHBOARD, type DashboardData } from "@/lib/perfTypes";
import { DashboardLayout, type PanelLayouts } from "@/lib/perfLayout";
import { ResizableHandle, ResizablePanel, ResizablePanelGroup } from "@/components/ui/resizable";
import { cn } from "@/lib/utils";

function metricItems(view: DashboardData): MetricItem[] {
  return [
    { icon: CalendarClock, label: "Planned Time", value: orDash(view.plannedTime) },
    { icon: Hourglass, label: "Remaining Time", value: orDash(view.plannedTimeRemaining), tone: "destructive" },
    { icon: Boxes, label: "Production Qty", value: fmtNum(view.productionQuantity) },
    { icon: Target, label: "Planned Profit", value: fmtMoney(view.plannedProfit) },
    { icon: Package, label: "Raw Materials", value: fmtNum(view.rawMaterials) },
    { icon: Wrench, label: "On Job Part", value: fmtNum(view.onJobPart) },
    { icon: PackageCheck, label: "Parts Produced", value: fmtNum(view.partsProduced) },
    { icon: RotateCw, label: "Cycle Time", value: fmtNum(view.cycleTime) },
    { icon: XCircle, label: "Rejected Parts", value: fmtNum(view.rejectedParts), tone: "destructive" },
    { icon: CheckCircle2, label: "Good Parts", value: fmtNum(view.goodParts), tone: "success" },
    { icon: TrendingUp, label: "Actual Profit", value: fmtMoney(view.actualProfit), tone: "success" },
    { icon: TrendingDown, label: "Capital Loss", value: fmtMoney(view.capitalLoss), tone: "destructive" },
    { icon: UserRoundCog, label: "Operator Delay", value: fmtNum(view.operatorDelay) },
    { icon: Timer, label: "Prod. Delay", value: fmtNum(view.productionDelay) },
    { icon: CalendarRange, label: "Planned Duration", value: orDash(view.plannedDuration) },
    { icon: Clock, label: "Current Duration", value: orDash(view.currentDuration) },
    { icon: Gauge, label: "Operating Loss / min", value: fmtMoney(view.operatingLossPerMinute), tone: "destructive" },
  ];
}

const VISIBLE = { overflow: "visible" } as const;

const HANDLE =
  "w-2 bg-transparent aria-[orientation=horizontal]:h-2 [&>div]:h-8 [&>div]:bg-muted-foreground/40 [&>div]:transition-all [&>div]:duration-200 hover:[&>div]:h-10 hover:[&>div]:bg-primary data-[separator=active]:[&>div]:h-10 data-[separator=active]:[&>div]:bg-primary focus-visible:ring-0 data-[separator=focus]:[&>div]:bg-primary";

function PanelHandle() {
  return <ResizableHandle withHandle className={HANDLE} />;
}

const scrollToData = () => document.getElementById("perf-data-panel")?.scrollIntoView({ behavior: "smooth", block: "start" });

export default function PerfDashboardClient({ cctvUrl, layouts }: { cctvUrl: string; layouts: PanelLayouts }) {
  const { data, machines, machine, selectMachine, connected, connecting, error, updatedAt, sendCommand } = usePerfDashboardSocket();
  const view = data ?? EMPTY_DASHBOARD;
  const items = useMemo(() => metricItems(view), [view]);
  const [cctvOpen, setCctvOpen] = useState(false);
  const cctvStream = cctvUrl || view.cctvUrl;
  const toggleCctv = useCallback(() => setCctvOpen((open) => !open), []);
  const closeCctv = useCallback(() => setCctvOpen(false), []);
  const [layout] = useState(() => new DashboardLayout(layouts));
  const [layoutVersion, setLayoutVersion] = useState(0);
  const resetLayout = useCallback(() => {
    layout.reset();
    setLayoutVersion((version) => version + 1);
  }, [layout]);

  const loadAll = useCallback(() => sendCommand("load-all"), [sendCommand]);
  const acknowledgeAlerts = useCallback(() => sendCommand("acknowledge-alerts"), [sendCommand]);
  const applyAi = useCallback(() => sendCommand("set-speed", { speed: view.aiSuggestedSpeed }), [sendCommand, view.aiSuggestedSpeed]);

  const info = useMemo(
    () => [
      { label: "Batch Part No", value: view.batchPartNo, tone: "primary" as const },
      { label: "Customer ID", value: view.customerId },
      { label: "Project", value: view.project },
      { label: "Assembly", value: view.assembly },
      { label: "Component", value: view.component, tone: "warning" as const },
      { label: "Supervisor ID", value: view.supervisorId, tone: "success" as const },
      { label: "Operator ID", value: view.operatorId },
    ],
    [view.batchPartNo, view.customerId, view.project, view.assembly, view.component, view.supervisorId, view.operatorId],
  );

  return (
    <div
      className={cn(
        "flex min-h-dvh flex-col gap-2 p-2 pb-16 xl:h-[max(100dvh,48rem)] xl:pb-2",
        "max-xl:[&_[data-group]]:contents! max-xl:[&_[data-panel]]:contents! max-xl:[&_[data-panel]>div]:contents! max-xl:[&_[data-separator]]:hidden!",
      )}
    >
      <PerfHeader
        connected={connected}
        connecting={connecting}
        machineName={machine ?? ""}
        machines={machines}
        plc={view.plc}
        systemStatus={view.systemStatus}
        cycleTime={view.cycleTime}
        aiModel={view.aiModel}
        cctvAvailable={Boolean(cctvStream)}
        alertCount={view.alerts.length + (error ? 1 : 0)}
        onSelectMachine={selectMachine}
        onProductionData={scrollToData}
        onCctv={toggleCctv}
        onResetLayout={resetLayout}
      />

      <ResizablePanelGroup key={layoutVersion} id="group-root" orientation="vertical" defaultLayout={layout.get("group-root")} onLayoutChanged={layout.persist("group-root")} className="min-h-0 flex-1" style={VISIBLE}>
        <ResizablePanel id="panel-dashboard" minSize="20rem" style={VISIBLE}>
          <ResizablePanelGroup id="group-columns" defaultLayout={layout.get("group-columns")} onLayoutChanged={layout.persist("group-columns")} style={VISIBLE}>
            <ResizablePanel id="panel-left" defaultSize="22rem" minSize="14rem" maxSize="45" style={VISIBLE}>
              <ResizablePanelGroup id="group-left" orientation="vertical" defaultLayout={layout.get("group-left")} onLayoutChanged={layout.persist("group-left")} style={VISIBLE}>
                <ResizablePanel id="panel-batch" defaultSize="15.75rem" minSize="5rem" style={VISIBLE}>
                  <PerfLiveBatch
                    batchId={view.batchId}
                    batchPartNo={view.batchPartNo}
                    activePartNo={view.activePartNo}
                    batchStart={view.batchStart}
                    batchFinish={view.batchFinish}
                    downtimeT={view.downtimeT}
                    downtimeC={view.downtimeC}
                    operatorName={view.operatorName}
                    operatorId={view.operatorId}
                    batchStatus={view.batchStatus}
                    className="order-1 xl:h-full xl:overflow-y-auto"
                  />
                </ResizablePanel>
                <PanelHandle />
                <ResizablePanel id="panel-oee-data" minSize="8rem" style={VISIBLE}>
                  <PerfMetricList items={items} energy={view.energy} busInfo={view.busInfo} jitter={view.jitter} className="order-4 xl:h-full" />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
            <PanelHandle />
            <ResizablePanel id="panel-right" minSize="30" style={VISIBLE}>
              <ResizablePanelGroup id="group-right" orientation="vertical" defaultLayout={layout.get("group-right")} onLayoutChanged={layout.persist("group-right")} style={VISIBLE}>
                <ResizablePanel id="panel-overview" defaultSize="17rem" minSize="6rem" style={VISIBLE}>
                  <PerfOeeOverview
                    availability={view.availability}
                    performance={view.performance}
                    quality={view.quality}
                    oee={view.oee}
                    availabilityNote={view.availabilityNote}
                    performanceNote={view.performanceNote}
                    qualityNote={view.qualityNote}
                    oeeNote={view.oeeNote}
                    machineOn={view.power}
                    powerOn={view.led}
                    productionOn={view.production}
                    stopped={view.stop}
                    progress={view.progress}
                    predictedProgress={view.predictedProgress}
                    partsProduced={view.partsProduced}
                    productionQuantity={view.productionQuantity}
                    updatedAt={updatedAt}
                    className="order-2 xl:h-full xl:overflow-y-auto"
                  />
                </ResizablePanel>
                <PanelHandle />
                <ResizablePanel id="panel-middle" minSize="8rem" style={VISIBLE}>
                  <ResizablePanelGroup id="group-middle" defaultLayout={layout.get("group-middle")} onLayoutChanged={layout.persist("group-middle")} style={VISIBLE}>
                    <ResizablePanel id="panel-charts" minSize="25" style={VISIBLE}>
                      <PerfProductionCharts
                        oee={view.oeeChart}
                        speed={view.speedChart}
                        profit={view.profitChart}
                        syncRate={view.syncRate}
                        aiSimulation={view.aiSimulation}
                        className="order-3 xl:h-full"
                      />
                    </ResizablePanel>
                    <PanelHandle />
                    <ResizablePanel id="panel-ai" defaultSize="22rem" minSize="14rem" maxSize="60" style={VISIBLE}>
                      <PerfAiPanel
                        predictedOEE={view.predictedOEE}
                        aiSuggestedSpeed={view.aiSuggestedSpeed}
                        speedStatus={view.speedStatus}
                        confidence={view.confidence}
                        aiInsight={view.aiInsight}
                        aiMaintenance={view.aiMaintenance}
                        canApply={connected}
                        onApply={applyAi}
                        className="order-3 xl:h-full"
                      />
                    </ResizablePanel>
                  </ResizablePanelGroup>
                </ResizablePanel>
                <PanelHandle />
                <ResizablePanel id="panel-alerts" defaultSize="2.75rem" minSize="2.75rem" style={VISIBLE}>
                  <PerfMessagesAlerts alerts={view.alerts} error={error} onAcknowledge={acknowledgeAlerts} className="order-5 xl:h-full" />
                </ResizablePanel>
              </ResizablePanelGroup>
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
        <PanelHandle />
        <ResizablePanel id="panel-data" defaultSize="27" minSize="6rem" maxSize="75" style={VISIBLE}>
          <PerfDataPanel batches={view.batches} parts={view.parts} info={info} connected={connected} onLoadAll={loadAll} className="order-6 xl:h-full" />
        </ResizablePanel>
      </ResizablePanelGroup>

      {cctvOpen && cctvStream && <PerfCctvWindow url={cctvStream} camera={machine ?? ""} onClose={closeCctv} />}

      <PerfVoiceOrb />
    </div>
  );
}
