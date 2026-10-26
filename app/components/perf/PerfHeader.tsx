"use client";

import { memo } from "react";
import { BarChart3, Bell, LayoutDashboard, LogOut, Video } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import { cn } from "@/lib/utils";
import { logout } from "@/app/login/actions";
import { StatusDot, orDash, type Tone } from "./perfUi";

interface Props {
  connected: boolean;
  connecting: boolean;
  machineName: string;
  machines: string[];
  plc: string;
  systemStatus: string;
  cycleTime: number;
  aiModel: string;
  cctvAvailable: boolean;
  alertCount: number;
  onSelectMachine: (machine: string) => void;
  onProductionData: () => void;
  onCctv: () => void;
  onResetLayout: () => void;
}

function NavButtons({ cctvAvailable, onProductionData, onCctv }: Pick<Props, "cctvAvailable" | "onProductionData" | "onCctv">) {
  return (
    <>
      <Button variant="outline" size="sm" className="group/btn text-primary transition-all hover:-translate-y-px hover:shadow-sm max-sm:size-8" onClick={onProductionData} aria-label="Production data">
        <BarChart3 className="transition-transform group-hover/btn:scale-110" />
        <span className="hidden sm:inline">Production Data</span>
      </Button>
      <Button
        variant="outline"
        size="sm"
        className="group/btn border-warning/40 text-warning transition-all hover:-translate-y-px hover:text-warning hover:shadow-sm max-sm:size-8"
        disabled={!cctvAvailable}
        onClick={onCctv}
        aria-label="CCTV feed"
      >
        <Video className="transition-transform group-hover/btn:scale-110" />
        <span className="hidden sm:inline">CCTV Feed</span>
      </Button>
    </>
  );
}

function PerfHeader(props: Props) {
  const link: { tone: Tone; label: string } = props.connected
    ? { tone: "success", label: "Connected" }
    : props.connecting
      ? { tone: "warning", label: "Connecting…" }
      : { tone: "destructive", label: "Offline" };
  const machineOptions = props.machines.length > 0 ? props.machines : props.machineName ? [props.machineName] : [];

  return (
    <header className="grid grid-cols-[minmax(0,1fr)_auto] items-center gap-x-2 gap-y-1.5 rounded-lg bg-card px-2.5 py-1.5 ring-1 ring-foreground/10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-2 motion-safe:duration-500 sm:px-3 xl:grid-cols-[minmax(0,1fr)_auto_minmax(0,1fr)] xl:gap-x-3">
      <div className="col-start-1 row-start-1 min-w-0 leading-tight xl:col-start-2 xl:text-center">
        <h1 className="flex min-w-0 items-center gap-1.5 text-sm font-bold uppercase tracking-tight xl:justify-center">
          <Logo className="size-6 transition-transform duration-300 hover:-rotate-6 hover:scale-110 sm:size-5" />
          <span className="truncate">
            SAM AI<span className="hidden sm:inline"> — Performance Dashboard</span>
          </span>
          <StatusDot tone={link.tone} className={cn("size-1.5", props.connecting && "motion-safe:animate-pulse")} />
          <span className="sr-only">{link.label}</span>
        </h1>
        <p className="truncate text-[0.625rem] text-muted-foreground sm:hidden">Performance Dashboard · {link.label}</p>
        <p className="hidden truncate font-mono text-[0.625rem] uppercase tracking-wide text-muted-foreground sm:block">
          System {orDash(props.systemStatus)} // Cycle time: <span className="font-semibold text-foreground">{props.cycleTime}s</span> // AI model {orDash(props.aiModel)}
        </p>
      </div>

      <div className="col-span-2 col-start-1 row-start-2 flex min-w-0 items-center gap-2 xl:col-span-1 xl:row-start-1">
        <span className="flex shrink-0 items-center gap-1.5 text-xs font-semibold">
          <StatusDot tone="primary" className="size-2" />
          Machine:
        </span>
        <Select value={props.machineName} onValueChange={props.onSelectMachine} disabled={machineOptions.length === 0}>
          <SelectTrigger size="sm" className="min-w-0 flex-1 font-mono text-xs font-semibold transition-colors hover:border-primary/50 sm:w-52 sm:flex-none" aria-label="Select machine">
            <SelectValue placeholder="--" />
          </SelectTrigger>
          <SelectContent>
            {machineOptions.map((machine) => (
              <SelectItem key={machine} value={machine} className="font-mono text-xs">
                {machine}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="hidden min-w-0 items-center gap-1.5 2xl:flex">
          <span className="text-[0.6875rem] font-medium uppercase text-muted-foreground">PLC:</span>
          <span className="truncate rounded-md border px-2 py-0.5 font-mono text-xs font-semibold">{orDash(props.plc)}</span>
        </div>
        <div className="ml-auto flex shrink-0 items-center gap-1.5 xl:hidden">
          <NavButtons {...props} />
        </div>
      </div>

      <div className="col-start-2 row-start-1 flex items-center justify-end gap-0.5 sm:gap-1.5 xl:col-start-3">
        <div className="hidden items-center gap-1.5 xl:flex">
          <NavButtons {...props} />
        </div>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="group/bell relative" aria-label={`${props.alertCount} alerts`}>
              <Bell className="origin-top transition-transform group-hover/bell:rotate-12" />
              {props.alertCount > 0 && (
                <span className="absolute right-1 top-1 flex size-1.5">
                  <span className="absolute inset-0 rounded-full bg-destructive motion-safe:animate-ping" />
                  <span className="relative size-1.5 rounded-full bg-destructive" />
                </span>
              )}
            </Button>
          </TooltipTrigger>
          <TooltipContent>{props.alertCount > 0 ? `${props.alertCount} active alerts` : "No alerts"}</TooltipContent>
        </Tooltip>
        <Tooltip>
          <TooltipTrigger asChild>
            <Button variant="ghost" size="icon-sm" className="group/reset hidden xl:inline-flex" aria-label="Reset panel layout" onClick={props.onResetLayout}>
              <LayoutDashboard className="transition-transform duration-300 group-hover/reset:scale-110" />
            </Button>
          </TooltipTrigger>
          <TooltipContent>Reset panel layout · drag panel edges to resize</TooltipContent>
        </Tooltip>
        <ThemeToggle />
        <Badge variant="outline" className="hidden h-7 gap-1.5 rounded-md px-2 text-xs font-semibold sm:inline-flex">
          <StatusDot tone={link.tone} className={cn("size-2", (props.connecting || props.connected) && "motion-safe:animate-pulse")} />
          {link.label}
        </Badge>
        <form action={logout}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="submit" variant="ghost" size="icon-sm" className="group/out hover:text-destructive" aria-label="Sign out">
                <LogOut className="transition-transform group-hover/out:translate-x-0.5" />
              </Button>
            </TooltipTrigger>
            <TooltipContent>Sign out</TooltipContent>
          </Tooltip>
        </form>
      </div>
    </header>
  );
}

export default memo(PerfHeader);
