"use client";

import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrophone } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { MicWaves } from "@/components/ui/mic-frequency";

export function VoiceBar() {
  return (
    <div style={{ height: 168 }} />
  );
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export function VoiceDock({
  isListening,
  thinking,
  isSpeaking,
  micText,
  onToggle,
}: {
  isListening: boolean;
  thinking: boolean;
  isSpeaking: boolean;
  micText: string;
  onToggle: () => void;
}) {
  const state: VoiceState = isSpeaking ? "speaking" : thinking ? "thinking" : isListening ? "listening" : "idle";
  const active = state !== "idle";
  const dotClass =
    state === "speaking" ? "dot--amber" : state === "thinking" ? "dot--violet" : state === "listening" ? "dot--green" : "dot--muted";
  const stateLabel = state === "speaking" ? "Speaking" : state === "thinking" ? "Thinking" : state === "listening" ? "Listening" : "Idle";
  const caption =
    state === "speaking"
      ? "Speaking — mic paused"
      : state === "thinking"
        ? "Thinking — AI processing"
        : state === "listening"
          ? "Listening — tap mic to stop"
          : "Tap mic to give a voice command";
  const edge =
    state === "speaking"
      ? "rgba(245,158,11,0.45)"
      : state === "thinking"
        ? "rgba(167,139,250,0.45)"
        : state === "listening"
          ? "rgba(34,211,238,0.45)"
          : "rgba(52,211,153,0.28)";
  const aura =
    state === "speaking"
      ? "rgba(245,158,11,0.18)"
      : state === "thinking"
        ? "rgba(167,139,250,0.16)"
        : state === "listening"
          ? "rgba(34,211,238,0.14)"
          : undefined;

  return (
    <div style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, padding: "0 12px 10px", boxSizing: "border-box", zIndex: 40, pointerEvents: "none" }}>
      <div className="instrument voice-dock" data-state={state} style={{ border: `1px solid ${edge}`, boxShadow: `0 -2px 20px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.35)${aura ? `, 0 0 24px ${aura}` : ""}`, borderRadius: 16, overflow: "hidden", padding: "0 0 10px", pointerEvents: "auto", backdropFilter: "blur(14px)", transition: "box-shadow 0.3s ease, border-color 0.3s ease" }}>
        {active && <div className="voice-hairline" style={{ height: 2 }} />}
        <div style={{ padding: "10px 14px 0" }}>
          <div className="flex items-center justify-between">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="panel-icon" aria-hidden="true" style={{ width: 28, height: 28, borderRadius: 9 }}>
                <FontAwesomeIcon icon={faMicrophone} style={{ fontSize: 12 }} />
              </span>
              <span className="micro-label">Operator Command · Voice</span>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{ color: state === "speaking" ? "#f59e0b" : state === "thinking" ? "#a78bfa" : state === "listening" ? "var(--green)" : "var(--ink-subtle)" }}>
              <span className={`dot ${dotClass}`} style={{ width: 6, height: 6 }} />
              {stateLabel}
            </span>
          </div>

          <div className="voice-stage">
            <div style={{ position: "relative" }}>
              {active && <MicWaves active tone={state === "speaking" ? "amber" : state === "thinking" ? "violet" : "cyan"} />}
              <div className="voice-orb" data-active={active}>
              <span className="voice-ripple" aria-hidden="true" />
              <span className="voice-ripple" aria-hidden="true" />
              <span className="voice-ripple" aria-hidden="true" />
              <Button
                type="button"
                size="icon"
                onClick={onToggle}
                disabled={isSpeaking}
                className="voice-mic"
                aria-label={isSpeaking ? "Speaker active — mic paused" : isListening ? "Stop listening" : "Start listening"}
              >
                <span className="voice-mic-core" aria-hidden="true">
                  <FontAwesomeIcon icon={faMicrophone} style={{ fontSize: 17 }} />
                </span>
              </Button>
              </div>
            </div>
            <p className="voice-caption">{caption}</p>
          </div>

          {micText ? (
            <div key={micText} className="mono-readout mic-text-box" style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, background: "rgba(59,130,246,0.09)", border: "1px solid rgba(59,130,246,0.2)", boxShadow: active ? "0 0 14px rgba(59,130,246,0.18)" : "0 0 0 transparent", fontSize: 12, lineHeight: 1.5, color: "var(--ink)", minHeight: 34, maxHeight: 72, overflowY: "auto", overflowX: "hidden", whiteSpace: "pre-wrap", boxSizing: "border-box", width: "100%" }}>
              {micText}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
