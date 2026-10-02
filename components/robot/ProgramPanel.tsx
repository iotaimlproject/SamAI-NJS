"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBoxOpen,
  faCheck,
  faClipboardList,
  faPlay,
  faScrewdriverWrench,
  faScissors,
  faTags,
} from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { PanelCard } from "./PanelCard";
import type { ProgramId } from "./types";

const PROGRAMS: Array<{ id: ProgramId; name: string; line: string; color: "blue" | "green" | "amber" | "red"; icon: typeof faBoxOpen }> = [
  { id: "packing", name: "Packing", line: "01", color: "blue", icon: faBoxOpen },
  { id: "labelling", name: "Labelling", line: "02", color: "green", icon: faTags },
  { id: "riveting", name: "Riveting", line: "03", color: "amber", icon: faScrewdriverWrench },
  { id: "cutting", name: "Cutting", line: "04", color: "red", icon: faScissors },
];

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
  const active = PROGRAMS.find((p) => p.id === selected);
  return (
    <PanelCard
      title="Programme ID"
      subtitle="Select line · execute cycle"
      tone="violet"
      icon={<FontAwesomeIcon icon={faClipboardList} style={{ fontSize: 14 }} />}
      action={active ? <span className="robot-panel__action-chip">{active.name} · Line {active.line}</span> : undefined}
    >
      <div className="program-grid" role="radiogroup" aria-label="Programme ID" data-has-selection={selected !== null}>
        {PROGRAMS.map((p) => {
          const isActive = p.id === selected;
          return (
            <button
              key={p.id}
              type="button"
              role="radio"
              aria-checked={isActive}
              disabled={!robotOn}
              onClick={() => onSelect(p.id)}
              className="program-tile"
              data-color={p.color}
              data-selected={isActive}
            >
              <span className="program-tile__check" aria-hidden="true">
                <FontAwesomeIcon icon={faCheck} style={{ fontSize: 10 }} />
              </span>
              <span className="program-tile__row">
                <span className="program-tile__icon" aria-hidden="true">
                  <FontAwesomeIcon icon={p.icon} style={{ fontSize: 13 }} />
                </span>
                <span className="program-tile__name">{p.name}</span>
              </span>
              <span className="program-tile__line">
                <span className="program-tile__line-label">Line/</span>
                <span className="program-tile__line-no mono-readout">{p.line}</span>
              </span>
            </button>
          );
        })}
      </div>
      <Button
        onClick={onExecute}
        disabled={!robotOn || !selected}
        className="h-9 rounded-lg text-xs font-bold w-full solid-btn program-execute"
        data-tint="green"
      >
        <FontAwesomeIcon icon={faPlay} style={{ fontSize: 11 }} />
        {selected ? `Execute ${PROGRAMS.find((p) => p.id === selected)?.name}` : "Select a programme"}
      </Button>
    </PanelCard>
  );
}
