"use client";

import { useEffect, useRef, type KeyboardEvent, type PointerEvent } from "react";
import { GripVertical, Mic, MicOff } from "lucide-react";
import { Logo } from "@/components/logo";
import { usePerfVoice, type VoicePhase } from "@/hooks/usePerfVoice";
import { cn } from "@/lib/utils";

const STORAGE_KEY = "samai-voice-orb";
const EDGE = 12;
const DRAG_THRESHOLD = 4;
const KEY_STEP = 24;
const CALLOUT_SPACE = 200;

const STATUS: Record<VoicePhase, string> = {
  idle: "Tap mic to talk",
  listening: "Listening…",
  thinking: "Thinking…",
  speaking: "Speaking…",
};

function placeOrb(el: HTMLElement, x: number, y: number) {
  const { width, height } = el.getBoundingClientRect();
  const left = Math.min(Math.max(EDGE, x), window.innerWidth - width - EDGE);
  const top = Math.min(Math.max(EDGE, y), window.innerHeight - height - EDGE);
  Object.assign(el.style, { left: `${left}px`, top: `${top}px`, right: "auto", bottom: "auto" });
  el.dataset.vertical = top < CALLOUT_SPACE ? "below" : "above";
  el.dataset.horizontal = left + width / 2 < window.innerWidth / 2 ? "left" : "right";
  return { left, top };
}

function saveOrb(position: { left: number; top: number }) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(position));
  } catch {
    void 0;
  }
}

function ThinkingDots() {
  return (
    <span className="inline-flex gap-1" aria-hidden>
      {[0, 150, 300].map((delay) => (
        <span key={delay} className="size-1.5 animate-pulse rounded-full bg-primary" style={{ animationDelay: `${delay}ms` }} />
      ))}
    </span>
  );
}

function VoiceCallout({ phase, heard, reply }: { phase: VoicePhase; heard: string; reply: string }) {
  return (
    <div
      data-callout
      className={cn(
        "absolute w-80 cursor-auto touch-auto select-text max-w-[calc(100vw-1.5rem)] space-y-2 rounded-xl bg-popover p-3 text-sm text-popover-foreground shadow-xl ring-1 ring-foreground/10 animate-in fade-in-0 zoom-in-95",
        "group-data-[vertical=above]:bottom-full group-data-[vertical=above]:mb-2 group-data-[vertical=below]:top-full group-data-[vertical=below]:mt-2",
        "group-data-[horizontal=left]:left-0 group-data-[horizontal=right]:right-0",
      )}
      aria-live="polite"
    >
      <div>
        <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-muted-foreground">You</div>
        <p className={cn("max-h-24 overflow-y-auto leading-snug", !heard && "text-muted-foreground")}>
          {heard || "Speak a command…"}
          {phase === "listening" && <span className="ml-0.5 inline-block h-4 w-0.5 translate-y-0.5 animate-pulse bg-primary" />}
        </p>
      </div>
      {(phase === "thinking" || reply) && (
        <div className="border-t pt-2">
          <div className="text-[0.625rem] font-semibold uppercase tracking-wide text-primary">SAM AI</div>
          {phase === "thinking" ? (
            <div className="flex items-center gap-2 py-1 text-muted-foreground">
              Thinking <ThinkingDots />
            </div>
          ) : (
            <p className="max-h-32 overflow-y-auto leading-snug">{reply}</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function PerfVoiceOrb() {
  const voice = usePerfVoice();
  const rootRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ pointerX: number; pointerY: number; left: number; top: number; moved: boolean } | null>(null);

  useEffect(() => {
    const el = rootRef.current;
    if (!el) return;
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "null") as { left: number; top: number } | null;
      if (saved && Number.isFinite(saved.left) && Number.isFinite(saved.top)) placeOrb(el, saved.left, saved.top);
    } catch {
      void 0;
    }
    const keepInView = () => {
      if (el.style.left) placeOrb(el, parseFloat(el.style.left), parseFloat(el.style.top));
    };
    window.addEventListener("resize", keepInView);
    return () => window.removeEventListener("resize", keepInView);
  }, []);

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0 || (event.target as HTMLElement).closest("button, [data-callout]")) return;
    const rect = event.currentTarget.getBoundingClientRect();
    dragRef.current = { pointerX: event.clientX, pointerY: event.clientY, left: rect.left, top: rect.top, moved: false };
    event.currentTarget.setPointerCapture(event.pointerId);
  };

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    if (!drag) return;
    const dx = event.clientX - drag.pointerX;
    const dy = event.clientY - drag.pointerY;
    if (!drag.moved && Math.hypot(dx, dy) < DRAG_THRESHOLD) return;
    drag.moved = true;
    placeOrb(event.currentTarget, drag.left + dx, drag.top + dy);
  };

  const onPointerUp = (event: PointerEvent<HTMLDivElement>) => {
    const drag = dragRef.current;
    dragRef.current = null;
    if (drag?.moved) {
      const rect = event.currentTarget.getBoundingClientRect();
      saveOrb({ left: rect.left, top: rect.top });
    }
  };

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const offsets: Record<string, [number, number]> = {
      ArrowLeft: [-KEY_STEP, 0],
      ArrowRight: [KEY_STEP, 0],
      ArrowUp: [0, -KEY_STEP],
      ArrowDown: [0, KEY_STEP],
    };
    const offset = offsets[event.key];
    if (!offset || event.target !== event.currentTarget) return;
    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    saveOrb(placeOrb(event.currentTarget, rect.left + offset[0], rect.top + offset[1]));
  };

  const live = voice.enabled || voice.phase === "speaking";

  return (
    <div
      ref={rootRef}
      data-vertical="above"
      data-horizontal="right"
      tabIndex={0}
      role="group"
      aria-label="SAM AI voice assistant. Drag or use arrow keys to move."
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      className="group fixed bottom-3 right-3 z-50 flex cursor-grab touch-none select-none items-center gap-2 rounded-full bg-card py-1 pl-1.5 pr-1 shadow-lg ring-1 ring-foreground/10 outline-none focus-visible:ring-3 focus-visible:ring-ring/50 active:cursor-grabbing"
    >
      {live && <VoiceCallout phase={voice.phase} heard={voice.heard} reply={voice.reply} />}
      <GripVertical className="size-4 shrink-0 text-muted-foreground/60" />
      <Logo className={cn("size-7", live && "motion-safe:animate-pulse")} />
      <div className="min-w-0 pr-1 leading-tight">
        <div className="text-xs font-bold">SAM AI</div>
        <div className="text-[0.625rem] text-muted-foreground">{STATUS[voice.phase]}</div>
      </div>
      <button
        type="button"
        onClick={voice.toggle}
        aria-pressed={voice.enabled}
        aria-label={voice.enabled ? "Stop voice capture" : "Start voice capture"}
        className={cn(
          "relative grid size-9 shrink-0 cursor-pointer place-items-center rounded-full transition-colors focus-visible:outline-none focus-visible:ring-3 focus-visible:ring-ring/50",
          voice.enabled ? "bg-primary text-primary-foreground" : "bg-muted text-foreground hover:bg-accent",
        )}
      >
        {voice.phase === "listening" && <span className="absolute inset-0 animate-ping rounded-full bg-primary/40" />}
        {voice.enabled ? <Mic className="relative size-4" /> : <MicOff className="relative size-4" />}
      </button>
    </div>
  );
}
