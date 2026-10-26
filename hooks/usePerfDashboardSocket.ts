"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { DashboardCommand, DashboardData, DashboardMessage } from "@/lib/perfTypes";
import { EMPTY_DASHBOARD } from "@/lib/perfTypes";
import { extractTelemetryPatch } from "@/lib/perfTelemetry";
import {
  NODE_RED_WS_PATHS,
  closeNodeRedSocket,
  getNodeRedSocket,
  sendNodeRedMessage,
} from "@/lib/nodeRedWebSocket";

const PATH = NODE_RED_WS_PATHS.dashboard;

function applyMessage(message: DashboardMessage): Partial<DashboardData> | { full: DashboardData } | null {
  if (message.type === "dashboard:data" && message.payload) {
    return { full: message.payload as DashboardData };
  }
  if (message.type === "dashboard:update" && message.payload) {
    return message.payload as Partial<DashboardData>;
  }
  return extractTelemetryPatch(message);
}

export function usePerfDashboardSocket() {
  const mountedRef = useRef(true);
  const [data, setData] = useState<DashboardData | null>(null);
  const [connected, setConnected] = useState(false);
  const [connecting, setConnecting] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatedAt, setUpdatedAt] = useState<number | null>(null);

  useEffect(() => {
    mountedRef.current = true;
    setConnecting(true);
    getNodeRedSocket(PATH, {
      onopen: () => {
        if (!mountedRef.current) return;
        setConnected(true);
        setConnecting(false);
        setError(null);
        sendNodeRedMessage(PATH, { type: "dashboard:request", payload: { request: "initial-data" } });
      },
      onmessage: (event) => {
        if (!mountedRef.current) return;
        try {
          const result = applyMessage(JSON.parse(event.data) as DashboardMessage);
          if (!result) return;
          if ("full" in result) setData({ ...EMPTY_DASHBOARD, ...result.full });
          else setData((previous) => ({ ...EMPTY_DASHBOARD, ...previous, ...result }));
          setUpdatedAt(Date.now());
        } catch {
          setError("Received an invalid message from Node-RED.");
        }
      },
      onerror: () => {
        if (!mountedRef.current) return;
        setConnecting(false);
      },
      onclose: () => {
        if (!mountedRef.current) return;
        setConnected(false);
        setConnecting(false);
      },
    });
    return () => {
      mountedRef.current = false;
      closeNodeRedSocket(PATH);
    };
  }, []);

  const sendCommand = useCallback((command: DashboardCommand["command"], payload?: DashboardCommand["payload"]) => {
    return sendNodeRedMessage(PATH, { type: "dashboard:command", command, payload } satisfies DashboardCommand);
  }, []);

  const sendMessage = useCallback((message: unknown) => {
    return sendNodeRedMessage(PATH, message);
  }, []);

  return { data, connected, connecting, error, updatedAt, sendMessage, sendCommand };
}
