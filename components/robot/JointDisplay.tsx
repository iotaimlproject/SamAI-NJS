"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faRobot } from "@fortawesome/free-solid-svg-icons";
import { PanelCard } from "./PanelCard";
import type { Pose } from "./types";

const POSE_CELLS: Array<{ label: string; key: keyof Pose }> = [
  { label: "X", key: "x" },
  { label: "Y", key: "y" },
  { label: "Z", key: "z" },
  { label: "Roll", key: "roll" },
  { label: "Pitch", key: "pitch" },
  { label: "Yaw", key: "yaw" },
];

export function JointDisplay({ joints, pose, robotOn }: { joints: number[]; pose: Pose | null; robotOn: boolean }) {
  const fmt = (v: number | null | undefined) => (typeof v === "number" ? v.toFixed(2) : "–");
  return (
    <PanelCard
      title="Joint Display"
      subtitle="6-axis · live tool pose"
      tone="violet"
      icon={<FontAwesomeIcon icon={faRobot} style={{ fontSize: 14 }} />}
    >
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6 }}>
        {joints.map((val, idx) => (
          <div key={idx} className="joint-cell" data-tint="violet" data-soft="true">
            <span className="mono-readout joint-cell__tag" style={{ fontSize: 9, fontWeight: 700 }}>J{idx + 1}</span>
            <span className="mono-readout" style={{ fontSize: 12, fontWeight: 800, color: robotOn ? "var(--ink)" : "var(--ink-faint)" }}>{Math.round(val)}°</span>
          </div>
        ))}
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 6, marginTop: 8 }}>
        {POSE_CELLS.map((c) => (
          <div key={c.key} className="pose-cell" data-tint="violet" data-soft="true">
            <span className="micro-label pose-cell__tag" style={{ fontSize: 9 }}>{c.label}</span>
            <span className="mono-readout" style={{ fontSize: 12, fontWeight: 800, color: robotOn ? "var(--ink)" : "var(--ink-faint)" }}>{fmt(pose?.[c.key])}</span>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
