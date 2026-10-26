"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { useVoiceCapture } from "@/hooks/useVoiceCapture";
import { handleSpeakResponse, normalizeVoicePayload, sendVoiceToNodeRed } from "@/lib/voiceService";
import { isSpeakingNow, subscribeSpeaking, warmSpeechVoices } from "@/lib/deepgram";
import { NODE_RED_WS_PATHS, closeNodeRedSocket, getNodeRedSocket } from "@/lib/nodeRedWebSocket";

export type VoicePhase = "idle" | "listening" | "thinking" | "speaking";

const THINKING_TIMEOUT_MS = 20000;

const joinText = (head: string, tail: string) => (head ? `${head} ${tail}` : tail);

export function usePerfVoice() {
  const [enabled, setEnabled] = useState(false);
  const [speaking, setSpeaking] = useState(false);
  const [thinking, setThinking] = useState(false);
  const [heard, setHeard] = useState("");
  const [reply, setReply] = useState("");
  const committedRef = useRef("");
  const replyRef = useRef("");
  const thinkingTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const stopThinking = useCallback(() => {
    if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
    thinkingTimerRef.current = null;
    setThinking(false);
  }, []);

  const onResult = useCallback(
    (transcript: string, isFinal: boolean) => {
      if (replyRef.current) {
        replyRef.current = "";
        committedRef.current = "";
        setReply("");
      }
      if (!isFinal) {
        setHeard(joinText(committedRef.current, transcript));
        return;
      }
      committedRef.current = joinText(committedRef.current, transcript);
      setHeard(committedRef.current);
      sendVoiceToNodeRed(transcript);
      setThinking(true);
      if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
      thinkingTimerRef.current = setTimeout(stopThinking, THINKING_TIMEOUT_MS);
    },
    [stopThinking],
  );

  const { listening, stop } = useVoiceCapture({ enabled, onResult });

  useEffect(() => {
    setSpeaking(isSpeakingNow());
    return subscribeSpeaking(setSpeaking);
  }, []);

  useEffect(() => {
    getNodeRedSocket(NODE_RED_WS_PATHS.speak, {});
    getNodeRedSocket(NODE_RED_WS_PATHS.voice, {
      onmessage: (event) => {
        const payload = normalizeVoicePayload(event.data);
        if (payload && payload.source !== "dashboard") {
          replyRef.current = payload.text;
          setReply(payload.text);
          stopThinking();
        }
        void handleSpeakResponse(event.data);
      },
    });
    return () => {
      closeNodeRedSocket(NODE_RED_WS_PATHS.speak);
      closeNodeRedSocket(NODE_RED_WS_PATHS.voice);
    };
  }, [stopThinking]);

  useEffect(() => () => {
    if (thinkingTimerRef.current) clearTimeout(thinkingTimerRef.current);
  }, []);

  const toggle = () => {
    if (enabled) {
      stop();
      stopThinking();
      committedRef.current = "";
      replyRef.current = "";
      setHeard("");
      setReply("");
    } else {
      warmSpeechVoices();
    }
    setEnabled(!enabled);
  };

  const phase: VoicePhase = speaking ? "speaking" : thinking ? "thinking" : enabled && listening ? "listening" : "idle";

  return { enabled, phase, heard, reply, toggle };
}
