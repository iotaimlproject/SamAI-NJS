"use client";

import { useEffect, useRef, useState, type Ref } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMicrophone } from "@fortawesome/free-solid-svg-icons";
import { Button } from "@/components/ui/button";
import { MicWaves } from "@/components/ui/mic-frequency";

export function Voice({
  isListening,
  thinking,
  isSpeaking,
  micText,
  onToggle,
  hasText = false,
}: {
  isListening: boolean;
  thinking: boolean;
  isSpeaking: boolean;
  micText: string;
  onToggle: () => void;
  hasText?: boolean;
}) {
  const dockRef = useRef<HTMLDivElement>(null);
  const [dockH, setDockH] = useState<number | null>(null);
  useEffect(() => {
    const el = dockRef.current;
    if (!el) return;
    const ro = new ResizeObserver((entries) => setDockH(entries[0].contentRect.height));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return (
    <>
      <div style={{ height: dockH === null ? (hasText ? 242 : 132) : Math.ceil(dockH) + 8 }} />
      <VoiceDock isListening={isListening} thinking={thinking} isSpeaking={isSpeaking} micText={micText} onToggle={onToggle} innerRef={dockRef} />
    </>
  );
}

type VoiceState = "idle" | "listening" | "thinking" | "speaking";

export function VoiceDock({
  isListening,
  thinking,
  isSpeaking,
  micText,
  onToggle,
  innerRef,
}: {
  isListening: boolean;
  thinking: boolean;
  isSpeaking: boolean;
  micText: string;
  onToggle: () => void;
  innerRef: Ref<HTMLDivElement>;
}) {
  const state: VoiceState = isSpeaking ? "speaking" : thinking ? "thinking" : isListening ? "listening" : "idle";
  const active = state !== "idle";
  const dotClass =
    state === "speaking" ? "dot--amber" : state === "thinking" ? "dot--violet" : state === "listening" ? "dot--green" : "dot--muted";
  const stateLabel = state === "speaking" ? "Speaking" : state === "thinking" ? "Thinking" : state === "listening" ? "Listening" : "Idle";

  return (
    <div ref={innerRef} style={{ position: "fixed", bottom: 0, left: "50%", transform: "translateX(-50%)", width: "100%", maxWidth: 390, padding: "0 12px 10px", boxSizing: "border-box", zIndex: 40, pointerEvents: "none" }}>
      <div className="instrument voice-dock" data-state={state} style={{ border: "1px solid var(--hairline-strong)", boxShadow: "0 -2px 20px rgba(0,0,0,0.45), 0 4px 16px rgba(0,0,0,0.35)", borderRadius: 16, overflow: "hidden", padding: "0 0 8px", pointerEvents: "auto", backdropFilter: "blur(14px)", transition: "box-shadow 0.3s ease, border-color 0.3s ease" }}>
        <div style={{ padding: "6px 12px 0" }}>
          <div className="flex items-center justify-between">
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <span className="panel-icon" aria-hidden="true" style={{ width: 22, height: 22, borderRadius: 7 }}>
                <FontAwesomeIcon icon={faMicrophone} style={{ fontSize: 12 }} />
              </span>
              <span className="micro-label">Operator Command · Voice</span>
            </div>
            <span className="flex items-center gap-1.5 text-[10px] font-semibold tracking-widest uppercase" style={{ color: state === "speaking" ? "#fbbf24" : state === "thinking" ? "#a78bfa" : state === "listening" ? "var(--green)" : "var(--ink-subtle)" }}>
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
          </div>

          {micText ? (
            <div className="mono-readout mic-text-box" style={{ marginTop: 8, padding: "8px 12px", borderRadius: 10, fontSize: 12, lineHeight: 1.5, minHeight: 34, maxHeight: 72, overflowY: "auto", overflowX: "hidden", whiteSpace: "pre-wrap", boxSizing: "border-box", width: "100%" }}>
              {micText}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
