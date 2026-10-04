"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPowerOff } from "@fortawesome/free-solid-svg-icons";
import { PanelCard } from "./PanelCard";
import { RobotSwitch } from "./RobotSwitch";

export function RobotHeader({ robotOn, robotLed, onToggle }: { robotOn: boolean; robotLed: boolean; onToggle: (v: boolean) => void }) {
  return (
    <PanelCard
      title="SYS Robot"
      subtitle="Power · control · state"
      icon={<FontAwesomeIcon icon={faPowerOff} style={{ fontSize: 14 }} />}
      action={<RobotSwitch checked={robotOn} led={robotLed} onChange={onToggle} />}
      className="robot-panel--slim"
    >
      {null}
    </PanelCard>
  );
}
