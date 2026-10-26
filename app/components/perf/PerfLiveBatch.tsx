import { memo } from "react";
import { AlarmClock, CalendarCheck2, Cog, Hash, PlayCircle, Timer } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { MetricTile, PANEL, PanelHeading, StatusDot, TONE_BADGE, orDash, type Tone } from "./perfUi";

interface Props {
  batchId: string;
  batchPartNo: string;
  activePartNo: string;
  batchStart: string;
  batchFinish: string;
  downtimeT: string;
  downtimeC: string;
  operatorName: string;
  operatorId?: string;
  batchStatus: string;
  className?: string;
}

function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (/progress|running|active/.test(s)) return "success";
  if (/delay|fault|stop|error/.test(s)) return "destructive";
  if (/pause|hold|wait/.test(s)) return "warning";
  return "muted";
}

function PerfLiveBatch(props: Props) {
  const tone = statusTone(props.batchStatus);

  return (
    <Card className={cn(PANEL, props.className)}>
      <PanelHeading title="Live Batch Metrics">
        <Badge variant="outline" className="h-5 rounded-md font-mono text-[0.6875rem] text-muted-foreground">
          ID: {orDash(props.batchId)}
        </Badge>
      </PanelHeading>
      <div className="grid grid-cols-2 gap-1.5">
        <MetricTile icon={Hash} label="Batch Part No" value={orDash(props.batchPartNo)} />
        <MetricTile icon={Cog} label="Active Part No" value={orDash(props.activePartNo)} />
        <MetricTile icon={PlayCircle} tone="success" label="Batch Started" value={orDash(props.batchStart)} valueTone="success" />
        <MetricTile icon={CalendarCheck2} tone="warning" label="Batch Finished" value={orDash(props.batchFinish)} valueTone="warning" />
        <MetricTile icon={AlarmClock} tone="destructive" label="Downtime (T)" value={orDash(props.downtimeT)} valueTone="destructive" />
        <MetricTile icon={Timer} label="Downtime (C)" value={orDash(props.downtimeC)} />
      </div>
      <div className="mt-auto flex items-center justify-between gap-3 text-xs">
        <span className="min-w-0 truncate text-muted-foreground">
          Operator: <span className="font-semibold text-foreground">{orDash(props.operatorName)}</span>
          {props.operatorId ? <span className="font-mono"> [{props.operatorId}]</span> : null}
        </span>
        <span className={cn("inline-flex shrink-0 items-center gap-1.5 rounded-md px-2 py-0.5 text-[0.6875rem] font-semibold", TONE_BADGE[tone])}>
          <StatusDot tone={tone} className="size-1.5" />
          {props.batchStatus || "Idle"}
        </span>
      </div>
    </Card>
  );
}

export default memo(PerfLiveBatch);
