"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faClipboardList,
  faPlay,
  faScissors,
  faScrewdriverWrench,
  faTags,
  type IconDefinition,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { PanelCard } from "./PanelCard";
import type { ProgramId } from "./types";

type ReelColor = "blue" | "green" | "amber" | "red";

const PROGRAMS: Array<{ id: ProgramId; name: string; line: string; icon: IconDefinition; color: ReelColor }> = [
  { id: "packing", name: "Packing", line: "01", icon: faBoxOpen, color: "blue" },
  { id: "labelling", name: "Labelling", line: "02", icon: faTags, color: "green" },
  { id: "riveting", name: "Riveting", line: "03", icon: faScrewdriverWrench, color: "amber" },
  { id: "cutting", name: "Cutting", line: "04", icon: faScissors, color: "red" },
];

/* Inline per-programme tints (stale-CSS-proof: rows keep their colour identity
   even if the stylesheet is cached). Values mirror the programme-tile theme. */
const TINT: Record<ReelColor, { chip: string; edge: string; ink: string; glow: string }> = {
  blue: { chip: "rgba(59,130,246,0.16)", edge: "rgba(59,130,246,0.38)", ink: "#7fb0ff", glow: "rgba(59,130,246,0.4)" },
  green: { chip: "rgba(34,197,94,0.15)", edge: "rgba(34,197,94,0.38)", ink: "#4ade80", glow: "rgba(34,197,94,0.38)" },
  amber: { chip: "rgba(245,158,11,0.16)", edge: "rgba(245,158,11,0.38)", ink: "#fbbf24", glow: "rgba(245,158,11,0.38)" },
  red: { chip: "rgba(239,68,68,0.16)", edge: "rgba(239,68,68,0.4)", ink: "#f87171", glow: "rgba(239,68,68,0.38)" },
};

const N = PROGRAMS.length;
const ROW_H = 46;
const VIEW_H = 84; // 46px centred row + 19px peek above and below (masks are 10px, so peeks stay visible)
const CENTER = (VIEW_H - ROW_H) / 2;
const SNAP_MS = 260;
const MIN_OFFSET = -(N * 3 - 1) * ROW_H;
const ROWS = [...PROGRAMS, ...PROGRAMS, ...PROGRAMS]; // tripled column: drag, snap, silently wrap

export function ProgramPanel({
  robotOn,
  selected,
  onSelect,
  onExecute,
}: {
  robotOn: boolean;
  selected: ProgramId | null;
  onSelect: (p: ProgramId) => void;
  onExecute: () => void;
}) {
  const selIdx = Math.max(0, PROGRAMS.findIndex((p) => p.id === selected));
  const [offset, setOffset] = useState(() => -(N + selIdx) * ROW_H);
  const [snapping, setSnapping] = useState(false);
  const drag = useRef<{ startY: number; startOffset: number } | null>(null);
  const timer = useRef<number | null>(null);

  useEffect(() => () => { if (timer.current !== null) window.clearTimeout(timer.current); }, []);

  // External selection change (e.g. initial mount): jump silently, never animate.
  useEffect(() => {
    if (drag.current) return;
    setSnapping(false);
    setOffset(-(N + selIdx) * ROW_H);
  }, [selected, selIdx]);

  const snapTo = (g: number, select: boolean) => {
    const clamped = Math.max(0, Math.min(ROWS.length - 1, g));
    setSnapping(true);
    setOffset(-clamped * ROW_H);
    if (timer.current !== null) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const s = ((clamped % N) + N) % N;
      if (select) onSelect(PROGRAMS[s].id);
      setSnapping(false);
      setOffset(-(N + s) * ROW_H); // silent normalize back to the middle copy
    }, SNAP_MS);
  };

  const onPointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!robotOn) return;
    if (timer.current !== null) { window.clearTimeout(timer.current); timer.current = null; }
    e.currentTarget.setPointerCapture(e.pointerId);
    drag.current = { startY: e.clientY, startOffset: offset };
    setSnapping(false);
  };
  const onPointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (!drag.current || !robotOn) return;
    const next = drag.current.startOffset + (e.clientY - drag.current.startY);
    setOffset(Math.max(MIN_OFFSET, Math.min(0, next)));
  };
  const onPointerUp = () => {
    if (!drag.current) return;
    drag.current = null;
    snapTo(Math.round((CENTER - offset) / ROW_H), true);
  };
  const onPointerCancel = () => {
    drag.current = null;
    setSnapping(true);
    setOffset(-(N + selIdx) * ROW_H); // interrupted gesture: glide home, no selection change
  };

  return (
    <PanelCard
      title="Programme ID"
      subtitle="Scroll to choose · execute"
      tone="violet"
      icon={<FontAwesomeIcon icon={faClipboardList} style={{ fontSize: 11 }} />}
    >
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {/* Outer box: fixed viewport with unmistakable inline outline.
            Inner drum scrolls one-by-one; previous/next peek faded above/below. */}
        <div
          className="program-reel"
          role="listbox"
          aria-label="Programme selector — drag up or down to scroll"
          aria-disabled={!robotOn}
          style={{
            position: "relative",
            flex: "1 1 auto",
            minWidth: 0,
            height: VIEW_H,
            overflow: "hidden",
            borderRadius: 12,
            border: "1px solid rgba(167,139,250,0.45)",
            background: "linear-gradient(180deg,#101317 0%,#07090b 100%)",
            boxShadow: "inset 0 2px 8px rgba(0,0,0,0.55), 0 0 18px -6px rgba(167,139,250,0.35)",
            touchAction: "pan-x",
            userSelect: "none",
            WebkitUserSelect: "none",
            cursor: robotOn ? "grab" : "not-allowed",
            opacity: robotOn ? 1 : 0.55,
          }}
          onPointerDown={onPointerDown}
          onPointerMove={onPointerMove}
          onPointerUp={onPointerUp}
          onPointerCancel={onPointerCancel}
        >
          <div
            style={{
              paddingTop: CENTER,
              transform: `translateY(${offset}px)`,
              transition: snapping ? `transform ${SNAP_MS}ms cubic-bezier(0.2,0.7,0.3,1)` : "none",
            }}
          >
            {ROWS.map((p, g) => {
              const t = TINT[p.color];
              const isSel = p.id === selected;
              return (
                <div
                  key={g}
                  role="option"
                  aria-selected={isSel}
                  aria-label={`Programme ${p.name}, line ${p.line}`}
                  style={{
                    height: ROW_H,
                    flex: "none",
                    display: "flex",
                    padding: "2px 4px",
                    opacity: isSel ? 1 : 0.55,
                  }}
                >
                  {/* Internal panel: each row carries its programme colour
                      (blue / green / amber / red wash + edge) so the above /
                      below peeks read as scrollable content. */}
                  <div
                    style={{
                      flex: "1 1 auto",
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      padding: "0 8px",
                      borderRadius: 8,
                      background: t.chip,
                      border: `1px solid ${t.edge}`,
                      boxShadow: isSel ? `0 0 14px ${t.glow}` : "none",
                    }}
                  >
                  <span
                    aria-hidden="true"
                    style={{
                      width: 26,
                      height: 26,
                      flex: "none",
                      borderRadius: 8,
                      display: "grid",
                      placeItems: "center",
                      background: t.chip,
                      border: `1px solid ${t.edge}`,
                      color: t.ink,
                      boxShadow: `0 0 12px ${t.glow}`,
                    }}
                  >
                    <FontAwesomeIcon icon={p.icon} style={{ fontSize: 12 }} />
                  </span>
                  <span className="program-reel__name" style={{ color: t.ink }}>{p.name}</span>
                  <span className="program-tile__line" style={{ marginLeft: "auto" }}>
                    <span className="program-tile__line-label">Line/</span>
                    <span className="program-tile__line-no mono-readout">{p.line}</span>
                  </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
        <Button
          onClick={onExecute}
          disabled={!robotOn || !selected}
          data-tint="green"
          className="h-9 rounded-lg text-xs font-bold solid-btn program-execute-side"
          style={{ flex: "none", whiteSpace: "nowrap" }}
        >
          <FontAwesomeIcon icon={faPlay} style={{ fontSize: 11 }} />
          Execute
        </Button>
      </div>
    </PanelCard>
  );
}
