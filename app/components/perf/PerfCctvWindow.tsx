"use client";

import { useEffect, useRef, useState, type PointerEvent, type ReactNode } from "react";
import { ExternalLink, GripHorizontal, Loader2, Maximize2, Video, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { orDash } from "./perfUi";

const EDGE = 8;

// Moves via the compositor-only `translate` property (it composes with the open animation's transform).
function placeWindow(el: HTMLElement, x: number, y: number, width = el.offsetWidth, height = el.offsetHeight) {
  const left = Math.min(Math.max(EDGE, x), Math.max(EDGE, window.innerWidth - width - EDGE));
  const top = Math.min(Math.max(EDGE, y), Math.max(EDGE, window.innerHeight - Math.min(height, 48) - EDGE));
  el.style.translate = `${left}px ${top}px`;
}

function IconAction({ label, onClick, children }: { label: string; onClick: () => void; children: ReactNode }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button type="button" variant="ghost" size="icon-xs" aria-label={label} onClick={onClick} className="text-white/70 hover:bg-white/10 hover:text-white">
          {children}
        </Button>
      </TooltipTrigger>
      <TooltipContent>{label}</TooltipContent>
    </Tooltip>
  );
}

export default function PerfCctvWindow({ url, camera, onClose }: { url: string; camera: string; onClose: () => void }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; left: number; top: number; width: number; height: number; frame: number } | null>(null);
  const [loaded, setLoaded] = useState(false);
  const [dragging, setDragging] = useState(false);

  useEffect(() => {
    const el = rootRef.current;
    if (el) placeWindow(el, (window.innerWidth - el.offsetWidth) / 2, Math.max(EDGE, (window.innerHeight - el.offsetHeight) / 2));
    const closeOnEscape = (event: KeyboardEvent) => event.key === "Escape" && onClose();
    window.addEventListener("keydown", closeOnEscape);
    return () => window.removeEventListener("keydown", closeOnEscape);
  }, [onClose]);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button") || !rootRef.current) return;
    const rect = rootRef.current.getBoundingClientRect();
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, left: rect.left, top: rect.top, width: rect.width, height: rect.height, frame: 0 };
    event.currentTarget.setPointerCapture(event.pointerId);
    setDragging(true);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    const el = rootRef.current;
    if (!drag || !el) return;
    const x = drag.left + event.clientX - drag.pointerX;
    const y = drag.top + event.clientY - drag.pointerY;
    cancelAnimationFrame(drag.frame);
    drag.frame = requestAnimationFrame(() => placeWindow(el, x, y, drag.width, drag.height));
  };

  const endDrag = () => {
    dragRef.current = null;
    setDragging(false);
  };

  return (
    <div
      ref={rootRef}
      role="dialog"
      aria-label={`CCTV feed ${orDash(camera)}`}
      className={cn("fixed left-0 top-0 z-40 flex h-[calc(min(40rem,100vw-1rem)*9/16+3.1rem)] max-h-[calc(100dvh-1rem)] w-[min(40rem,calc(100vw-1rem))] min-h-48 min-w-72 max-w-[calc(100vw-1rem)] resize flex-col overflow-hidden rounded-xl bg-zinc-950 text-white shadow-2xl ring-1 ring-white/10 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:duration-300 transition-[box-shadow,scale] duration-200", dragging && "scale-[1.01] shadow-[0_1.5rem_4rem_-0.5rem_rgb(0_0_0/0.6)] will-change-[translate]")}
    >
      <div
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={endDrag}
        onPointerCancel={endDrag}
        className={cn("flex shrink-0 touch-none select-none items-center gap-2 border-b border-white/10 py-1 pl-2.5 pr-1 transition-colors hover:bg-white/5", dragging ? "cursor-grabbing" : "cursor-grab")}
      >
        <Video className="size-4 text-warning" />
        <span className="truncate text-xs font-semibold uppercase tracking-wide">CCTV · {orDash(camera)}</span>
        <span className="flex items-center gap-1 rounded-sm bg-destructive/90 px-1.5 py-px text-[0.625rem] font-bold uppercase tracking-wider">
          <span className="size-1.5 rounded-full bg-white motion-safe:animate-pulse" />
          Live
        </span>
        <GripHorizontal className="mx-auto size-4 text-white/30" />
        <IconAction label="Fullscreen" onClick={() => void frameRef.current?.requestFullscreen?.()}>
          <Maximize2 />
        </IconAction>
        <IconAction label="Open in new tab" onClick={() => window.open(url, "_blank", "noopener,noreferrer")}>
          <ExternalLink />
        </IconAction>
        <IconAction label="Close" onClick={onClose}>
          <X />
        </IconAction>
      </div>
      <div className="relative min-h-0 flex-1 bg-black">
        {!loaded && (
          <div className="absolute inset-0 grid place-items-center text-xs text-white/60">
            <span className="flex items-center gap-2">
              <Loader2 className="size-4 animate-spin" />
              Connecting to camera…
            </span>
          </div>
        )}
        <iframe
          ref={frameRef}
          src={url}
          title={`CCTV feed ${orDash(camera)}`}
          allow="autoplay; fullscreen; picture-in-picture"
          allowFullScreen
          referrerPolicy="no-referrer"
          onLoad={() => setLoaded(true)}
          className={cn("absolute inset-0 size-full border-0 transition-opacity duration-500", loaded ? "opacity-100" : "opacity-0", dragging && "pointer-events-none")}
        />
      </div>
      <div className="h-4 shrink-0 border-t border-white/10 px-2.5 text-right font-mono text-[0.5625rem] leading-4 text-white/40">go2rtc · drag title to move · corner to resize</div>
    </div>
  );
}
