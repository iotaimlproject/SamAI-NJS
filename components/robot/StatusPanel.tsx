"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faTowerBroadcast } from "@fortawesome/free-solid-svg-icons";
import { PanelCard } from "./PanelCard";

export function StatusPanel({
  message,
  status,
  connection,
  command,
  activeJoint,
  armState,
}: {
  message: string;
  status: string;
  connection: string;
  command: string;
  activeJoint: string;
  armState: string;
}) {
  const rows: Array<{ label: string; value: string; good?: boolean }> = [
    { label: "Message", value: message },
    { label: "Status", value: status, good: status === "READY" },
    { label: "Connection", value: connection, good: connection === "CONNECTED" },
    { label: "Active Joint", value: activeJoint },
    { label: "Command", value: command },
    { label: "Arm State", value: armState, good: armState === "READY" },
  ];
  const live = connection === "CONNECTED";

  return (
    <PanelCard
      title="Status"
      subtitle="Message · connection · arm state"
      tone="blue"
      icon={<FontAwesomeIcon icon={faTowerBroadcast} style={{ fontSize: 14 }} />}
      action={<span className={`dot ${live ? "dot--green" : "dot--muted"}`} style={{ width: 8, height: 8 }} />}
    >
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {rows.map((r) => (
          <div key={r.label} className="status-cell" data-tint="blue" data-soft="true">
            <p className="micro-label status-cell__tag" style={{ fontSize: 9 }}>{r.label}</p>
            <p
              className="mono-readout"
              style={{ fontSize: 15, fontWeight: 800, margin: "2px 0 0", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis", color: r.good === undefined ? "var(--ink)" : r.good ? "var(--green)" : "var(--ink)" }}
            >
              {r.value}
            </p>
          </div>
        ))}
      </div>
    </PanelCard>
  );
}
