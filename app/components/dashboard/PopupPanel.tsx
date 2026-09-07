"use client";
import { X } from "lucide-react";
import type { PopupData } from "@/lib/popupFormat";

export function PopupPanel({ popup, onClose }: { popup: PopupData; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.68)" }} onClick={onClose} role="dialog" aria-modal="true" aria-label={popup.title}>
      <div className="w-full flex flex-col overflow-hidden" style={{ maxWidth: 366, maxHeight: "88vh", background: "var(--panel)", border: "1px solid var(--hairline)", borderRadius: 18, boxShadow: "0 12px 40px rgba(0,0,0,0.45)" }} onClick={(e) => e.stopPropagation()}>
        <div className="flex items-start justify-between gap-3 shrink-0" style={{ padding: "14px 14px 12px 16px", background: "var(--module)", borderBottom: "1px solid var(--hairline)" }}>
          <div className="min-w-0">
            <p className="truncate" style={{ fontSize: 15, fontWeight: 800, letterSpacing: "0.04em", color: "var(--ink)", textTransform: "uppercase" }}>{popup.title}</p>
            <p style={{ marginTop: 2, fontSize: 11, color: "var(--ink-muted)" }}>{popup.subtitle}</p>
          </div>
          <button type="button" onClick={onClose} aria-label="Close popup" className="grid place-items-center rounded-full shrink-0" style={{ width: 28, height: 28, background: "rgba(255,255,255,0.08)", color: "var(--ink)" }}>
            <X size={14} />
          </button>
        </div>
        <div className="overflow-y-auto" style={{ maxHeight: "60vh" }}>
          {popup.rows.length === 0 && <p style={{ padding: 16, fontSize: 12, color: "var(--ink-muted)" }}>No data</p>}
          {popup.rows.map((r, i) => (
            <div key={`${r.label}-${i}`} className="grid" style={{ gridTemplateColumns: "1fr 1.2fr", gap: 8, padding: "9px 16px", fontSize: 12, background: i % 2 === 1 ? "var(--module)" : "transparent", borderBottom: "1px solid var(--hairline)" }}>
              <span style={{ color: "var(--ink-muted)", fontWeight: 600 }}>{r.label}</span>
              <span className="mono-readout" style={{ color: "var(--ink)", fontWeight: 600, overflowWrap: "anywhere" }}>{r.value}</span>
            </div>
          ))}
        </div>
        <div className="flex justify-center shrink-0" style={{ padding: 12 }}>
          <span style={{ fontSize: 11, fontWeight: 700, color: "var(--ink-muted)", background: "var(--module)", border: "1px solid var(--hairline)", borderRadius: 999, padding: "6px 14px" }}>{popup.hint}</span>
        </div>
      </div>
    </div>
  );
}
