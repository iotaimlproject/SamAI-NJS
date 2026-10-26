"use client";

import { memo, useDeferredValue, useMemo, useState, type ReactNode } from "react";
import { Download, RefreshCw, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import type { BatchRow } from "@/lib/perfTypes";
import { cn } from "@/lib/utils";
import { PANEL, TAB_LIST, TAB_TRIGGER, TONE_BADGE, TONE_TEXT, fmtMoney, fmtNum, orDash, type Tone } from "./perfUi";

interface Column {
  head: string;
  value: (row: BatchRow) => string | number;
  render?: (row: BatchRow) => ReactNode;
  className?: string;
}

function statusTone(status: string): Tone {
  const s = status.toLowerCase();
  if (/run|progress|active/.test(s)) return "primary";
  if (/compl|done|ok/.test(s)) return "success";
  if (/delay|fail|fault|stop/.test(s)) return "destructive";
  return "muted";
}

const pct = (value: number) => (Number.isFinite(value) ? value.toFixed(1) : "--");

const COLUMNS: Column[] = [
  { head: "SL", value: (r) => r.id, render: (r) => String(r.id).padStart(2, "0"), className: "font-mono text-primary" },
  { head: "Batch No", value: (r) => r.batchNo, className: "font-mono font-semibold" },
  { head: "Quantity", value: (r) => r.quantity, render: (r) => `${fmtNum(r.quantity)} pcs`, className: "font-mono" },
  { head: "Component", value: (r) => r.component, className: "font-mono text-warning" },
  { head: "Prod Started", value: (r) => r.productionStarted, className: "font-mono" },
  { head: "Prod Completed", value: (r) => r.productionCompleted, className: "font-mono" },
  { head: "Avail %", value: (r) => r.availability, render: (r) => pct(r.availability), className: "font-mono text-right" },
  { head: "Perf %", value: (r) => r.performance, render: (r) => pct(r.performance), className: "font-mono text-right" },
  { head: "Quality %", value: (r) => r.quality, render: (r) => pct(r.quality), className: "font-mono text-right" },
  { head: "OEE %", value: (r) => r.oee, render: (r) => pct(r.oee), className: "font-mono text-right font-semibold text-primary" },
  { head: "Planned Profit", value: (r) => r.plannedProfit, render: (r) => fmtMoney(r.plannedProfit), className: "font-mono text-right" },
  { head: "Actual Profit", value: (r) => r.actualProfit, render: (r) => fmtMoney(r.actualProfit), className: "font-mono text-right text-success" },
  {
    head: "Loss",
    value: (r) => r.loss,
    render: (r) => <span className={r.loss > 0 ? "text-destructive" : "text-success"}>{r.loss > 0 ? "-" : "+"}{fmtMoney(Math.abs(r.loss))}</span>,
    className: "font-mono text-right",
  },
  { head: "Customer ID", value: (r) => r.customerId, className: "font-mono" },
  { head: "Project", value: (r) => r.project },
  { head: "Supervisor", value: (r) => r.supervisorId, className: "font-mono" },
  {
    head: "Status",
    value: (r) => r.status ?? "",
    render: (r) => (r.status ? <span className={cn("rounded-md px-1.5 py-0.5 text-[0.6875rem] font-semibold", TONE_BADGE[statusTone(r.status)])}>{r.status}</span> : "--"),
  },
];

const csvCell = (value: string | number) => `"${String(value ?? "").replace(/"/g, '""')}"`;

function downloadCsv(name: string, rows: BatchRow[]) {
  const lines = [COLUMNS.map((c) => csvCell(c.head)).join(","), ...rows.map((row) => COLUMNS.map((c) => csvCell(c.value(row))).join(","))];
  const url = URL.createObjectURL(new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" }));
  const link = Object.assign(document.createElement("a"), { href: url, download: `${name}-${new Date().toISOString().slice(0, 10)}.csv` });
  link.click();
  URL.revokeObjectURL(url);
}

interface Props {
  batches: BatchRow[];
  parts: BatchRow[];
  info: { label: string; value?: string; tone?: Tone }[];
  connected: boolean;
  onLoadAll: () => void;
  className?: string;
}

function PerfDataPanel({ batches, parts, info, connected, onLoadAll, className }: Props) {
  const [tab, setTab] = useState<"batch" | "part">("batch");
  const [query, setQuery] = useState("");
  const deferredQuery = useDeferredValue(query.trim().toLowerCase());
  const source = tab === "batch" ? batches : parts;

  const rows = useMemo(() => {
    if (!deferredQuery) return source;
    return source.filter((row) => COLUMNS.some((c) => String(c.value(row)).toLowerCase().includes(deferredQuery)));
  }, [source, deferredQuery]);

  return (
    <Card id="perf-data-panel" className={cn(PANEL, "scroll-mt-2", className)}>
      <div className="flex flex-wrap items-center gap-2">
        <Tabs value={tab} onValueChange={(value) => setTab(value as "batch" | "part")} className="w-full sm:w-56">
          <TabsList className={TAB_LIST}>
            <TabsTrigger value="batch" className={TAB_TRIGGER.primary}>Batch Data</TabsTrigger>
            <TabsTrigger value="part" className={TAB_TRIGGER.primary}>Part Data</TabsTrigger>
          </TabsList>
        </Tabs>
        <div className="relative min-w-48 flex-1">
          <Search className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Filter batch, component, supervisor…" className="h-8 pl-8 text-xs transition-colors hover:border-primary/40" aria-label="Filter records" />
        </div>
        <span className="font-mono text-xs text-muted-foreground">
          {rows.length}/{source.length} records
        </span>
        <Button variant="outline" size="sm" className="group/csv text-success transition-all hover:-translate-y-px hover:shadow-sm" disabled={rows.length === 0} onClick={() => downloadCsv(tab === "batch" ? "batch-data" : "part-data", rows)}>
          <Download className="transition-transform group-hover/csv:translate-y-0.5" />
          Export CSV
        </Button>
        <Button size="sm" className="group/load transition-all hover:-translate-y-px hover:shadow-md hover:shadow-primary/25" disabled={!connected} onClick={onLoadAll}>
          <RefreshCw className="transition-transform duration-500 group-hover/load:rotate-180" />
          Load All
        </Button>
      </div>

      <dl className="flex flex-wrap justify-between gap-x-6 gap-y-0.5 border-b pb-1.5 font-mono text-[0.6875rem]">
        {info.map((item) => (
          <div key={item.label} className="flex min-w-0 items-center gap-2">
            <dt className="uppercase text-muted-foreground">{item.label}:</dt>
            <dd className={cn("truncate font-semibold", item.tone ? TONE_TEXT[item.tone] : "text-foreground")}>{orDash(item.value)}</dd>
          </div>
        ))}
      </dl>

      <div className="min-h-0 flex-1 overflow-auto overscroll-contain [&>[data-slot=table-container]]:overflow-visible">
        <Table className="min-w-[84rem] text-xs">
          <TableHeader className="sticky top-0 z-10 bg-card">
            <TableRow className="hover:bg-transparent">
              {COLUMNS.map((c) => (
                <TableHead key={c.head} className={cn("h-7 text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground", c.className?.includes("text-right") && "text-right")}>
                  {c.head}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 ? (
              <TableRow className="hover:bg-transparent">
                <TableCell colSpan={COLUMNS.length} className="h-14 text-center text-muted-foreground">
                  {source.length === 0 ? `No ${tab} records received from Node-RED.` : "No records match the filter."}
                </TableCell>
              </TableRow>
            ) : (
              rows.map((row) => (
                <TableRow key={`${row.id}-${row.batchNo}`} className="transition-colors hover:bg-primary/5">
                  {COLUMNS.map((c) => (
                    <TableCell key={c.head} className={cn("py-1", c.className)}>
                      {c.render ? c.render(row) : orDash(String(c.value(row)))}
                    </TableCell>
                  ))}
                </TableRow>
              ))
            )}
          </TableBody>
        </Table>
      </div>
    </Card>
  );
}

export default memo(PerfDataPanel);
