"use client";

import { useEffect, useRef } from "react";

export function MicFrequency({ active, thinking = false, className }: { active: boolean; thinking?: boolean; className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rafRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const ctxRef = useRef<AudioContext | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const thinkingRef = useRef(false);
  thinkingRef.current = thinking;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rawCtx = canvas.getContext("2d");
    if (!rawCtx) return;
    const c = rawCtx as CanvasRenderingContext2D;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    canvas.width = rect.width * dpr;
    canvas.height = rect.height * dpr;
    c.scale(dpr, dpr);
    const width = rect.width;
    const height = rect.height;

    if (!active) {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);

      try { streamRef.current?.getTracks().forEach((t) => t.stop()); } catch {  }
      streamRef.current = null;
      try { ctxRef.current?.close(); } catch {  }
      ctxRef.current = null;
      analyserRef.current = null;
      c.clearRect(0, 0, width, height);
      c.fillStyle = getComputedStyle(canvas).getPropertyValue("--ink-faint").trim() || "#3a3e45";
      c.globalAlpha = 0.55;
      for (let i = 0; i < 16; i++) {
        const x = (i * width) / 16 + 2;
        c.fillRect(x, height / 2 - 1, width / 16 - 4, 2);
      }
      c.globalAlpha = 1;
      return;
    }

    let cancelled = false;
    const dataArray = new Uint8Array(64);

    const initAnalyser = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        streamRef.current = stream;
        const ac = new AudioContext();
        ctxRef.current = ac;
        const source = ac.createMediaStreamSource(stream);
        const analyser = ac.createAnalyser();
        analyser.fftSize = 64;
        analyser.smoothingTimeConstant = 0.6;
        source.connect(analyser);
        analyserRef.current = analyser;
      } catch {

        analyserRef.current = null;
      }
    };
    void initAnalyser();

    function draw() {
      if (cancelled) return;
      rafRef.current = requestAnimationFrame(draw);
      c.clearRect(0, 0, width, height);
      const bars = 16;
      const gap = 3;
      const barW = (width - gap * (bars - 1)) / bars;

      let freqData: number[] | null = null;
      if (analyserRef.current) {
        analyserRef.current.getByteFrequencyData(dataArray);
        freqData = Array.from(dataArray.slice(0, bars));
      }

      for (let i = 0; i < bars; i++) {
        let intensity: number;
        if (freqData) {
          intensity = Math.max(0.12, freqData[i] / 255);
        } else {
          const centreWeight = 1 - Math.abs(i - bars / 2) / (bars / 2);
          const drift = Math.sin(Date.now() / (thinkingRef.current ? 130 : 240) + i * 0.9) * 0.5 + 0.5;
          const rnd = 0.35 + Math.random() * 0.65;
          intensity = 0.12 + (centreWeight * 0.55 + drift * 0.45) * rnd * 0.82;
        }
        const h = 3 + intensity * (height * 0.86);
        const x = i * (barW + gap);
        const y = (height - h) / 2;
        const edge = Math.pow(Math.sin((Math.PI * (i + 0.5)) / bars), 0.7);
        const grad = c.createLinearGradient(0, height, 0, 0);
        grad.addColorStop(0, "rgba(6,182,214,0.95)");
        grad.addColorStop(1, "rgba(34,197,94,0.95)");
        c.globalAlpha = 0.4 + 0.6 * edge;
        c.fillStyle = grad;
        c.beginPath();
        const rr = (c as unknown as { roundRect?: (_x: number, _y: number, _w: number, _h: number, _r: number) => void }).roundRect;
        if (rr) rr.call(c, x, y, barW, h, 2);
        else c.fillRect(x, y, barW, h);
        c.fill();
        c.globalAlpha = 1;
        if (intensity > 0.48) {
          c.shadowColor = intensity > 0.66 ? "rgba(34,197,94,0.34)" : "rgba(0,213,255,0.30)";
          c.shadowBlur = 6;
          c.fill();
          c.shadowBlur = 0;
        }
      }
    }
    draw();
    return () => {
      cancelled = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [active]);

  return (
    <div className={className} style={{ display: "flex", flexDirection: "column", gap: 6 }}>
      <canvas
        ref={canvasRef}
        style={{ width: "100%", height: 36, display: "block", borderRadius: 8, background: "var(--module)", border: "1px solid var(--hairline)" }}
        width={320}
        height={36}
      />
      <div className="flex items-center justify-between px-1">
        <span className="micro-label" style={{ fontSize: 8, color: active ? "var(--cyan)" : "var(--ink-faint)" }}>
          {thinking ? (<>Thinking • AI processing<span className="thinking-ellipsis" /></>) : active ? ("Live • 16 bands • real-time") : ("Idle • tap mic")}
        </span>
        <span className={`dot ${active ? "dot--cyan" : "dot--muted"}`} style={{ width: 6, height: 6 }} />
      </div>
    </div>
  );
}

export function MicButton({ active, thinking = false, speaking = false, disabled = false, onToggle }: { active: boolean; thinking?: boolean; speaking?: boolean; disabled?: boolean; onToggle: () => void }) {
  const isDisabled = disabled || speaking;
  const bg = speaking
    ? "radial-gradient(circle at 30% 28%, #f59e0b 0%, #d97706 55%, #92400e 100%)"
    : active
      ? "radial-gradient(circle at 30% 28%, #22d3ee 0%, #0891b2 55%, #0e7490 100%)"
      : "radial-gradient(circle at 30% 28%, #1e232c 0%, #000000 70%)";
  const border = speaking ? "rgba(245,158,11,0.55)" : active ? "rgba(6,182,214,0.55)" : "rgba(255,255,255,0.09)";
  const shadow = speaking
    ? "0 0 0 5px rgba(245,158,11,0.14), 0 0 22px rgba(245,158,11,0.32), inset 0 1px 0 rgba(255,255,255,0.18)"
    : active
      ? "0 0 0 5px rgba(6,182,214,0.14), 0 0 22px rgba(6,182,214,0.32), inset 0 1px 0 rgba(255,255,255,0.18)"
      : "inset 0 1px 0 rgba(255,255,255,0.06), 0 1px 2px rgba(0,0,0,0.5)";
  return (
    <button
      onClick={onToggle}
      disabled={isDisabled}
      aria-label={speaking ? "Speaker active — mic paused" : active ? "Stop listening" : "Start listening"}
      className="relative flex items-center justify-center shrink-0 disabled:opacity-60 disabled:cursor-not-allowed"
      style={{
        width: 56,
        height: 56,
        borderRadius: 999,
        background: bg,
        border: `1px solid ${border}`,
        boxShadow: shadow,
        transition: "all 0.28s ease",
      }}
    >
      {active && !speaking && (
        <svg viewBox="0 0 64 64" className={thinking ? "orb-ring orb-ring--fast" : "orb-ring"} style={{ position: "absolute", inset: 2, pointerEvents: "none" }} aria-hidden="true">
          <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(6,182,214,0.55)" strokeWidth="1.5" strokeDasharray="10 7" strokeLinecap="round" />
        </svg>
      )}
      {speaking && (
        <svg viewBox="0 0 64 64" className="orb-ring orb-ring--fast" style={{ position: "absolute", inset: 2, pointerEvents: "none" }} aria-hidden="true">
          <circle cx="32" cy="32" r="29" fill="none" stroke="rgba(245,158,11,0.55)" strokeWidth="1.5" strokeDasharray="10 7" strokeLinecap="round" />
        </svg>
      )}
      <span style={{ fontSize: 20, color: speaking || active ? "white" : "var(--ink-muted)", filter: speaking || active ? "drop-shadow(0 0 6px rgba(255,255,255,0.6))" : "none", animation: thinking && !speaking ? "orb-breathe 1.6s ease-in-out infinite" : speaking ? "orb-breathe 1.2s ease-in-out infinite" : undefined }}>{speaking ? "🔊" : active ? "◼" : "🎤"}</span>
      {active && !speaking && <span className="absolute inset-0 rounded-full animate-ping" style={{ border: "1px solid rgba(6,182,214,0.35)" }} />}
      {speaking && <span className="absolute inset-0 rounded-full animate-ping" style={{ border: "1px solid rgba(245,158,11,0.35)" }} />}
    </button>
  );
}
