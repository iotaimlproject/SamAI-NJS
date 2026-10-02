"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPowerOff } from "@fortawesome/free-solid-svg-icons";
import { Led } from "@/components/ui/led";
import { PanelCard } from "./PanelCard";
import { RobotSwitch } from "./RobotSwitch";

export function RobotHeader({ robotOn, onToggle }: { robotOn: boolean; onToggle: (v: boolean) => void }) {
  return (
    <PanelCard
      title="Robot"
      subtitle="Power · control · state"
      icon={<FontAwesomeIcon icon={faPowerOff} style={{ fontSize: 14 }} />}
      action={<RobotSwitch checked={robotOn} onChange={onToggle} />}
    >
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12, padding: "8px 0 4px" }}>
        <p className="mono-readout" style={{ margin: 0, fontSize: 24, fontWeight: 800, lineHeight: 1.08, letterSpacing: "0.01em", color: "var(--ink)" }}>
          SYSTEMATIC
          <br />
          ROBOT
        </p>
        <div style={{ width: 150, display: "flex", justifyContent: "center" }}>
          <Led on={robotOn} variant="default" size="xl" shape="square" />
        </div>
      </div>
    </PanelCard>
  );
}
