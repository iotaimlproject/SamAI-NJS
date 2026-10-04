"use client";

import { useEffect, useRef, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faMoon, faSun } from "@fortawesome/free-solid-svg-icons";
import { handleSpeakResponse } from "@/lib/voiceService";
import { isSpeakingNow, subscribeSpeaking, warmSpeechVoices } from "@/lib/deepgram";
import { installTapRipple } from "@/lib/ripple";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { NODE_RED_WS_PATHS, closeNodeRedSocket, getNodeRedSocket, sendNodeRedMessage } from "@/lib/nodeRedWebSocket";
import { RobotHeader } from "./RobotHeader";
import { StatusPanel } from "./StatusPanel";
import { JointDisplay } from "./JointDisplay";
import { PositionControls } from "./PositionControls";
import { ProgramPanel } from "./ProgramPanel";
import { Voice } from "./VoiceBar";
import { Skeleton } from "@/components/ui/skeleton";
import { HOME_JOINTS, RESET_FAULT_JOINTS, pushLog, type Pose, type PositionPreset, type ProgramId, type RobotLog, type Velocity } from "./types";

export default function RobotClient() {
  const [mounted, setMounted] = useState(false);
  const [theme, setTheme] = useState<"dark" | "light">("dark");

  useEffect(() => {
    installTapRipple();
    return subscribeSpeaking(setIsSpeaking);
  }, []);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem("samai-theme") as "dark" | "light" | null;
    const initial = saved || (window.matchMedia("(prefers-color-scheme: light)").matches ? "light" : "dark");
    setTheme(initial);
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(initial);
  }, []);

  useEffect(() => {
    if (!mounted) return;
    document.documentElement.classList.remove("dark", "light");
    document.documentElement.classList.add(theme);
    localStorage.setItem("samai-theme", theme);
  }, [theme, mounted]);

  const [robotOn, setRobotOn] = useState(false);
  const [robotLed, setRobotLed] = useState<boolean | null>(null);
  const [connected, setConnected] = useState(false);
  const [velocity, setVelocity] = useState<Velocity>("slow");
  const [joints, setJoints] = useState<number[]>([...HOME_JOINTS]);
  const [pose, setPose] = useState<Pose | null>(null);
  const [activeJoint, setActiveJoint] = useState<number | null>(null);
  const [backendStatus, setBackendStatus] = useState<{
    message?: string;
    status?: string;
    connection?: string;
    command?: string;
    activeJoint?: string | number;
    armState?: string;
  } | null>(null);
  const [program, setProgram] = useState<ProgramId | null>("packing");
  const [logs, setLogs] = useState<RobotLog[]>(() => pushLog([], "Robot ready", "info", "robot"));
  const [micActive, setMicActive] = useState(false);
  const [thinking, setThinking] = useState(false);
  const thinkingTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [isSpeaking, setIsSpeaking] = useState(() => isSpeakingNow());

  const log = (msg: string, level: "info" | "warn" | "error" = "info", meta = "robot") =>
    setLogs((l) => pushLog(l, msg, level, meta));

  const { listening: micListening, text: micText, setText: setMicInput, stop: stopVoiceCapture } = useVoiceCapture({
    enabled: micActive,
    onResult: async (transcript, isFinal) => {
      if (!isFinal) return;
      setThinking(true);
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
      thinkingTimer.current = setTimeout(() => setThinking(false), 25000);
      sendNodeRedMessage(NODE_RED_WS_PATHS.voice, { text: transcript });
    },
    onFatalError: (msg) => {
      setMicActive(false);
      setThinking(false);
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
      log(msg, "warn", "voice");
    },
  });

  const toggleMic = () => {
    if (isSpeaking) return;
    if (micActive) {
      stopVoiceCapture();
      setMicActive(false);
      setThinking(false);
      if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
      log("Mic off", "info", "voice");
    } else {
      warmSpeechVoices();
      setMicActive(true);
      log("Mic on — listening…", "info", "voice");
    }
  };

  const isListening = !isSpeaking && (micActive || micListening);

  useEffect(() => {
    getNodeRedSocket(NODE_RED_WS_PATHS.robot, {
      onopen: () => { setConnected(true); console.log("[Robot] /ws/robot connected (duplex)"); },
      onclose: () => setConnected(false),
      onmessage: (e) => {
        try {
          const p = JSON.parse(e.data);
          const v = (p.value ?? p.payload ?? p) as Record<string, unknown>;
          if (typeof v.robotstatus === "boolean") setRobotOn(v.robotstatus);
          if (typeof v.robotled === "boolean") setRobotLed(v.robotled);
        } catch {}
      },
    });
    return () => closeNodeRedSocket(NODE_RED_WS_PATHS.robot);
  }, []);

  useEffect(() => {
    getNodeRedSocket(NODE_RED_WS_PATHS.joints, {
      onopen: () => console.log("[Robot] /ws/joints connected (duplex)"),
      onmessage: (e) => {
        try {
          const p = JSON.parse(e.data);
          const v = (p.value ?? p.payload ?? p) as Record<string, unknown>;
          const kv = [1, 2, 3, 4, 5, 6].map((i) => v[`joint${i}`]);
          if (kv.every((n) => typeof n === "number")) {
            setJoints(kv as number[]);
          } else {
            const arr = (v.joints ?? v.angles) as unknown;
            if (Array.isArray(arr) && arr.length >= 6 && arr.every((n) => typeof n === "number")) {
              setJoints((arr as number[]).slice(0, 6));
            }
          }
          const rawPose = (v.pose ?? v.position ?? (p as Record<string, unknown>).pose) as Record<string, unknown> | null;
          if (rawPose && typeof rawPose === "object") {
            const num = (k: string) => (typeof rawPose[k] === "number" ? (rawPose[k] as number) : null);
            setPose({ x: num("x"), y: num("y"), z: num("z"), roll: num("roll"), pitch: num("pitch"), yaw: num("yaw") });
          }
        } catch {}
      },
    });
    return () => closeNodeRedSocket(NODE_RED_WS_PATHS.joints);
  }, []);

  useEffect(() => {
    getNodeRedSocket(NODE_RED_WS_PATHS.status, {
      onopen: () => console.log("[Robot] /ws/status connected"),
      onmessage: (e) => {
        try {
          const p = JSON.parse(e.data);
          const v = (p.value ?? p.payload ?? p) as Record<string, unknown>;
          setBackendStatus((prev) => {
            const next = { ...(prev ?? {}) };
            if (typeof v.message === "string") next.message = v.message;
            if (typeof v.status === "string") next.status = v.status;
            if (typeof v.connection === "string") next.connection = v.connection;
            if (typeof v.command === "string") next.command = v.command;
            if (typeof v.activeJoint === "string" || typeof v.activeJoint === "number") next.activeJoint = v.activeJoint;
            if (typeof v.armState === "string") next.armState = v.armState;
            return next;
          });
        } catch {}
      },
    });
    return () => closeNodeRedSocket(NODE_RED_WS_PATHS.status);
  }, []);

  useEffect(() => {
    getNodeRedSocket(NODE_RED_WS_PATHS.speak, {
      onopen: () => console.log("[Robot] /ws/speak connected"),
      onmessage: async (e) => {
        let payload: unknown; try { payload = JSON.parse(e.data); } catch { payload = e.data; }
        const p = payload as Record<string, unknown>;
        const text = (p?.value ?? p?.text ?? p?.payload ?? (typeof payload === "string" ? payload : "")) as string;
        if (text && typeof text === "string") setMicInput(text);
        setThinking(false);
        if (thinkingTimer.current) clearTimeout(thinkingTimer.current);
        await handleSpeakResponse(payload);
      },
      onerror: (e) => { const hasDetail = e && typeof e === "object" && Object.keys(e as object).length > 0; if (hasDetail) console.debug("[Robot /ws/speak] note:", e); },
      onclose: () => console.log("[Robot /ws/speak] closed"),
    });
    return () => closeNodeRedSocket(NODE_RED_WS_PATHS.speak);
  }, []);

  useEffect(() => {
    getNodeRedSocket(NODE_RED_WS_PATHS.voice, {
      onopen: () => console.log("[Robot] /ws/voice connected"),
      onmessage: (e) => console.log("[Robot /ws/voice] echo:", e.data),
      onerror: (e) => { const hasDetail = e && typeof e === "object" && Object.keys(e as object).length > 0; if (hasDetail) console.debug("[Robot /ws/voice] note:", e); },
      onclose: () => console.log("[Robot /ws/voice] closed"),
    });
    return () => closeNodeRedSocket(NODE_RED_WS_PATHS.voice);
  }, [setMicInput]);

  const toggleRobot = (v: boolean) => {
    setRobotOn(v);
    sendNodeRedMessage(NODE_RED_WS_PATHS.robot, { robotstatus: v });
    log(v ? "Robot ON" : "Robot OFF", v ? "info" : "warn");
  };

  const selectVelocity = (v: Velocity) => {
    if (!robotOn || v === velocity) return;
    setVelocity(v);
    sendNodeRedMessage(NODE_RED_WS_PATHS.velocity, { velocity: v });
    log(`Velocity → ${v}`, "info", "velocity");
  };

  const moveJoint = (joint: number, angle: number) => {
    if (!robotOn) return;
    const next = [...joints];
    next[joint] = angle;
    setJoints(next);
    setActiveJoint(joint);
    sendNodeRedMessage(NODE_RED_WS_PATHS.movejoint, { joint: joint + 1, angle });
    log(`J${joint + 1} → ${angle}°`, "info", "movejoint");
  };

  const goPreset = (preset: PositionPreset) => {
    if (!robotOn) return;
    setActiveJoint(null);
    if (preset === "home") {
      setJoints([...HOME_JOINTS]);
      sendNodeRedMessage(NODE_RED_WS_PATHS.preset, { preset: "home" });
      log("Robot → Home", "info", "joints home");
      return;
    }
    if (preset === "reset fault") {
      setJoints([...RESET_FAULT_JOINTS]);
      sendNodeRedMessage(NODE_RED_WS_PATHS.preset, { preset: "reset fault" });
      log("Reset fault", "info", "joints reset fault");
      return;
    }
    sendNodeRedMessage(NODE_RED_WS_PATHS.preset, { preset });
    log(`Robot → Position ${preset.toUpperCase()}`, "info", `joints ${preset}`);
  };

  const runProgram = () => {
    if (!robotOn || !program) return;
    sendNodeRedMessage(NODE_RED_WS_PATHS.preset, { program });
    log(`Programme ${program} → execute`, "info", "program");
  };

  if (!mounted) return <div className="page" style={{ minHeight: "100vh", background: "var(--canvas)" }}><div className="mobile-shell" style={{ width: "100%", maxWidth: 390, margin: "0 auto", background: "var(--canvas)", minHeight: "100vh", borderLeft: "1px solid var(--hairline)", borderRight: "1px solid var(--hairline)", boxSizing: "border-box", padding: "0 12px" }}><div style={{ margin: "0 -12px", padding: "14px 28px 10px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "center", justifyContent: "space-between" }}><div><Skeleton className="h-2.5 w-16" /><Skeleton className="mt-1.5 h-5 w-32" /></div><Skeleton className="h-9 w-9 rounded-full" /></div><div role="status" aria-label="Loading robot dashboard" style={{ display: "flex", flexDirection: "column", gap: 8, marginTop: 8 }}><Skeleton className="h-[76px] w-full rounded-[20px]" /><Skeleton className="h-[168px] w-full rounded-[20px]" /><Skeleton className="h-[140px] w-full rounded-[20px]" /><Skeleton className="h-[190px] w-full rounded-[20px]" /><Skeleton className="h-[120px] w-full rounded-[20px]" /></div></div></div>;

  return (
    <div className="page" style={{ background: "var(--canvas)", minHeight: "100vh", overflowX: "hidden" }}>
      <div className="mobile-shell" style={{ width: "100%", maxWidth: 390, margin: "0 auto", background: "var(--canvas)", minHeight: "100vh", display: "flex", flexDirection: "column", borderLeft: "1px solid var(--hairline)", borderRight: "1px solid var(--hairline)", boxSizing: "border-box", overflow: "visible", padding: "0 12px" }}>
        <div style={{ margin: "0 -12px", padding: "14px 28px 10px", borderBottom: "1px solid var(--hairline)", display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12, background: "var(--canvas)" }}>
          <div>
            <p className="micro-label" style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-subtle)", margin: 0, lineHeight: 1 }}>Robotics</p>
            <h1 className="text-[18px] font-bold tracking-tight" style={{ letterSpacing: "-0.02em", color: "var(--ink)", marginTop: 2, lineHeight: 1.1 }}>SamAI Robot</h1>
          </div>
          <button
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="grid place-items-center rounded-full border shrink-0"
            style={{ background: "var(--panel)", borderColor: "var(--hairline)", color: "var(--ink)", width: 36, height: 36 }}
            aria-label="Toggle theme"
          >
            {theme === "dark" ? <FontAwesomeIcon icon={faSun} style={{ fontSize: 15 }} /> : <FontAwesomeIcon icon={faMoon} style={{ fontSize: 15 }} />}
          </button>
        </div>

        <RobotHeader robotOn={robotOn} robotLed={robotLed ?? robotOn} onToggle={toggleRobot} />
        <StatusPanel
          message={backendStatus?.message ?? logs[0]?.msg ?? "Robot ready"}
          status={backendStatus?.status ?? (robotOn ? "READY" : "STANDBY")}
          connection={backendStatus?.connection ?? (connected ? "CONNECTED" : "DISCONNECTED")}
          command={backendStatus?.command ?? (isListening || thinking || isSpeaking ? "BUSY" : "IDLE")}
          activeJoint={
            backendStatus?.activeJoint != null
              ? typeof backendStatus.activeJoint === "number"
                ? `J${backendStatus.activeJoint + 1}`
                : String(backendStatus.activeJoint)
              : activeJoint === null
                ? "NONE"
                : `J${activeJoint + 1}`
          }
          armState={backendStatus?.armState ?? (robotOn ? "READY" : "STANDBY")}
        />
        <JointDisplay joints={joints} pose={pose} robotOn={robotOn} />
        <PositionControls robotOn={robotOn} velocity={velocity} onVelocity={selectVelocity} onMove={moveJoint} onPreset={goPreset} />
        <ProgramPanel robotOn={robotOn} selected={program} onSelect={setProgram} onExecute={runProgram} />

        <Voice hasText={micText.length > 0} isListening={isListening} thinking={thinking} isSpeaking={isSpeaking} micText={micText} onToggle={toggleMic} />
      </div>
    </div>
  );
}
