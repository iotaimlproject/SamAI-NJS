"use client";

import { useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faA, faArrowsRotate, faArrowsUpDown, faB, faHouse, faLocationCrosshairs } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { JOINT_COUNT, JOINT_LIMITS, type PositionPreset, type Velocity } from "./types";
import { PanelCard } from "./PanelCard";

const PRESETS: Array<{ label: string; preset: PositionPreset; tint: "green" | "red" | "blue" | "violet"; icon: typeof faHouse }> = [
  { label: "Home", preset: "home", tint: "green", icon: faHouse },
  { label: "Reset Fault", preset: "retreat", tint: "red", icon: faArrowsRotate },
  { label: "Position A", preset: "a", tint: "blue", icon: faA },
  { label: "Position B", preset: "b", tint: "violet", icon: faB },
];

export function PositionControls({
  robotOn,
  velocity,
  onVelocity,
  onMove,
  onPreset,
}: {
  robotOn: boolean;
  velocity: Velocity;
  onVelocity: (v: Velocity) => void;
  onMove: (joint: number, angle: number) => void;
  onPreset: (p: PositionPreset) => void;
}) {
  const [joint, setJoint] = useState(0);
  const [angleText, setAngleText] = useState("0");
  const limit = JOINT_LIMITS[joint];

  const clamp = (v: number) => Math.max(limit.min, Math.min(limit.max, Math.round(v) || 0));
  const shown = clamp(Number(angleText) || 0);
  const commitAngle = () => {
    const v = shown;
    setAngleText(String(v));
    return v;
  };

  return (
    <PanelCard
      title="Position Controls"
      subtitle="Presets · speed · single-axis move"
      tone="amber"
      icon={<FontAwesomeIcon icon={faLocationCrosshairs} style={{ fontSize: 14 }} />}
      action={<span className="robot-panel__action-chip">J{joint + 1} · {shown}°</span>}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, alignItems: "end" }}>
        <div>
          <Label className="micro-label" style={{ fontSize: 9, marginBottom: 4, display: "block" }}>Speed</Label>
          <Select value={velocity} onValueChange={(v) => onVelocity(v as Velocity)} disabled={!robotOn}>
            <SelectTrigger className="h-9 rounded-lg px-3 text-sm font-semibold disabled:opacity-50 mod-field" data-tint="amber">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--panel)", borderColor: "var(--hairline)" }}>
              <SelectItem value="slow">Slow</SelectItem>
              <SelectItem value="fast">Fast</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="micro-label" style={{ fontSize: 9, marginBottom: 4, display: "block" }}>Joint</Label>
          <Select value={String(joint)} onValueChange={(v) => setJoint(Number(v))} disabled={!robotOn}>
            <SelectTrigger className="h-9 rounded-lg px-3 text-sm font-semibold disabled:opacity-50 mod-field" data-tint="amber">
              <SelectValue />
            </SelectTrigger>
            <SelectContent style={{ background: "var(--panel)", borderColor: "var(--hairline)" }}>
              {Array.from({ length: JOINT_COUNT }, (_, i) => (
                <SelectItem key={i} value={String(i)}>J{i + 1}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="micro-label" style={{ fontSize: 9, marginBottom: 4, display: "block" }}>Angle</Label>
          <Input type="text" inputMode="numeric" value={angleText} onChange={(e) => { const v = e.target.value; if (/^-?\d{0,4}$/.test(v)) setAngleText(v); }} onBlur={commitAngle} onKeyDown={(e) => { if (e.key === "Enter") e.currentTarget.blur(); }} disabled={!robotOn} className="h-9 rounded-lg px-3 text-sm mono-readout font-semibold text-center disabled:opacity-50 mod-field" data-tint="amber" />
        </div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8, marginTop: 8 }}>
        {PRESETS.map((b) => (
          <Button
            key={b.preset}
            onClick={() => onPreset(b.preset)}
            disabled={!robotOn}
            className="h-10 rounded-lg text-xs font-bold preset-btn"
            data-tint={b.tint}
          >
            <span className="preset-btn__icon" aria-hidden="true">
              <FontAwesomeIcon icon={b.icon} style={{ fontSize: 11 }} />
            </span>
            {b.label}
          </Button>
        ))}
      </div>
      <Button
        onClick={() => onMove(joint, commitAngle())}
        disabled={!robotOn}
        className="h-9 rounded-lg text-xs font-bold w-full preset-btn preset-btn--move"
        data-tint="amber"
        style={{ marginTop: 8 }}
      >
        <span className="preset-btn__icon" aria-hidden="true">
          <FontAwesomeIcon icon={faArrowsUpDown} style={{ fontSize: 11 }} />
        </span>
        Move Joint
      </Button>
    </PanelCard>
  );
}
