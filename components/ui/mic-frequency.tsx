"use client";

import { useEffect, useRef } from "react";

const TONES = {
  cyan: { main: "34,211,238", echo: "52,211,153" },
  violet: { main: "167,139,250", echo: "34,211,238" },
  amber: { main: "245,158,11", echo: "251,191,36" },
} as const;

/**
 * Live voice waves: flowing lines that emanate from behind the mic orb
 * and travel out to both panel edges. Amplitude follows the real mic
 * level while speaking, relaxing to a gentle drift when quiet.
 */
export function MicWaves({ active, tone = "cyan" }: { active: boolean; tone?: keyof typeof TONES }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const toneRef = useRef(tone);
  toneRef.current = tone;

  useEffect(() => {
    if (!active) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const rect = canvas.getBoundingClientRect();
    const W = Math.max(1, rect.width);
    const H = Math.max(1, rect.height);
    canvas.width = W * dpr;
    canvas.height = H * dpr;
    ctx.scale(dpr, dpr);

    let raf = 0;
    let cancelled = false;
    let stream: MediaStream | null = null;
    let analyser: AnalyserNode | null = null;
    let audioCtx: AudioContext | null = null;
    const timeData = new Uint8Array(256);
    let level = 0;

    const init = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true } });
        if (cancelled) { stream.getTracks().forEach((t) => t.stop()); return; }
        audioCtx = new AudioContext();
        const src = audioCtx.createMediaStreamSource(stream);
        analyser = audioCtx.createAnalyser();
        analyser.fftSize = 512;
        src.connect(analyser);
      } catch {
        analyser = null;
      }
    };
    void init();

    const drawLine = (t: number, color: string, alpha: number, ampScale: number, speed: number, phase: number) => {
      const midY = H / 2;
      const cx = W / 2;
      const grad = ctx.createLinearGradient(0, 0, W, 0);
      grad.addColorStop(0, `rgba(${color},0)`);
      grad.addColorStop(0.5, `rgba(${color},${alpha})`);
      grad.addColorStop(1, `rgba(${color},0)`);
      ctx.strokeStyle = grad;
      ctx.lineWidth = 2;
      ctx.shadowColor = `rgba(${color},0.5)`;
      ctx.shadowBlur = 6;
      ctx.beginPath();
      for (let x = 0; x <= W; x += 4) {
        const fromCentre = Math.abs(x - cx);
        const env = Math.min(1, Math.max(0, (fromCentre - 26) / 60));
        const y =
          midY +
          Math.sin(x * 0.045 + t * speed + phase) *
            Math.sin(x * 0.012 - t * speed * 0.6) *
            22 *
            ampScale *
            (0.15 + 0.85 * env);
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    };

    const frame = () => {
      if (cancelled) return;
      raf = requestAnimationFrame(frame);
      const t = performance.now() / 1000;
      if (analyser) {
        analyser.getByteTimeDomainData(timeData);
        let sum = 0;
        for (let i = 0; i < timeData.length; i++) {
          const v = (timeData[i] - 128) / 128;
          sum += v * v;
        }
        const rms = Math.sqrt(sum / timeData.length);
        level += (Math.min(1, rms * 4) - level) * 0.25;
      } else {
        level += (0.25 + 0.2 * Math.sin(t * 2.2) - level) * 0.1;
      }
      const c = TONES[toneRef.current];
      ctx.clearRect(0, 0, W, H);
      const amp = 0.25 + level;
      drawLine(t, c.echo, 0.4, amp * 0.7, 2.2, 1.7);
      drawLine(t, c.main, 0.9, amp, 3.0, 0);
    };
    raf = requestAnimationFrame(frame);

    return () => {
      cancelled = true;
      cancelAnimationFrame(raf);
      try { stream?.getTracks().forEach((tr) => tr.stop()); } catch { /* noop */ }
      try { void audioCtx?.close(); } catch { /* noop */ }
    };
  }, [active]);

  if (!active) return null;
  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      style={{ position: "absolute", left: 0, top: "50%", transform: "translateY(-50%)", width: "100%", height: 84, pointerEvents: "none" }}
    />
  );
}
