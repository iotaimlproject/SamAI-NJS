"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faPowerOff } from "@fortawesome/free-solid-svg-icons";

export function RobotSwitch({ checked, led, onChange }: { checked: boolean; led: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      aria-label="Robot power"
      onClick={() => onChange(!checked)}
      className="robot-switch"
      data-on={checked}
      data-led={led}
    >
      <span className="robot-switch__body" aria-hidden="true">
        <span className="robot-switch__fill" />
        <span className="robot-switch__zone--left">
          <span className="robot-switch__state-label">On</span>
        </span>
        <span className="robot-switch__zone--right">
          <span className="robot-switch__state-label">Off</span>
        </span>
        <span className="robot-switch__thumb">
          <FontAwesomeIcon icon={faPowerOff} className="robot-switch__icon" />
        </span>
      </span>
    </button>
  );
}
