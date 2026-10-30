"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import type { DashboardCommand } from "@/lib/perfTypes";
import {
  PERF_TOPIC_ALL,
  applyPerfMessages,
  commandTopic,
  decodeFrame,
  parseTopic,
  type MachineStore,
  type PerfMessage,
} from "@/lib/perfTelemetry";
import { NODE_RED_WS_PATHS, closeNodeRedSocket, getNodeRedSocket, sendNodeRedMessage } from "@/lib/nodeRedWebSocket";

const PATH = NODE_RED_WS_PATHS.live;

// Transport for the perf topics. To move to MQTT, replace this effect's socket with an MQTT client:
// subscribe(PERF_TOPIC_ALL) and feed each (topic, JSON payload) into the same `pending` queue;
// retained messages replace the snapshot.
export function usePerfDashboardSocket() {
  const [store, setStore] = useState<MachineStore>({});
  const [selected, setSelected] = useState<string | null>(null);
  const [connected, setConnected] = useState(false);
  const [settled, setSettled] = useState(false);
  const [updatedAt, setUpdatedAt] = useState<Readonly<Record<string, number>>>({});

  useEffect(() => {
    let mounted = true;
    // Coalesce every message that lands in one animation frame into a single render.
    let pending: PerfMessage[] = [];
    let frame = 0;
    const flush = () => {
      frame = 0;
      if (!mounted || pending.length === 0) return;
      const batch = pending;
      pending = [];
      setStore((previous) => applyPerfMessages(previous, batch));
      const now = Date.now();
      const oee = batch.map((m) => parseTopic(m.topic)).filter((t) => t?.panel === "oee");
      if (oee.length > 0) setUpdatedAt((previous) => ({ ...previous, ...Object.fromEntries(oee.map((t) => [t!.machine, now])) }));
    };
    const status = (isOpen: boolean) => {
      if (!mounted) return;
      setConnected(isOpen);
      setSettled(true);
    };

    getNodeRedSocket(PATH, {
      onopen: () => {
        status(true);
        // Re-subscribing on every open also resyncs after a reconnect (the reply is a snapshot).
        sendNodeRedMessage(PATH, { type: "subscribe", topics: [PERF_TOPIC_ALL] });
      },
      onmessage: (event) => {
        if (!mounted) return;
        const messages = decodeFrame(event.data);
        if (messages.length === 0) return;
        pending.push(...messages);
        frame ||= requestAnimationFrame(flush);
      },
      onerror: () => status(false),
      onclose: () => status(false),
    });
    return () => {
      mounted = false;
      cancelAnimationFrame(frame);
      closeNodeRedSocket(PATH);
    };
  }, []);

  const machines = useMemo(() => Object.keys(store).sort(), [store]);
  const machine = selected !== null && store[selected] ? selected : (machines[0] ?? null);

  const sendCommand = useCallback(
    (command: DashboardCommand["command"], payload?: DashboardCommand["payload"]) =>
      machine !== null && sendNodeRedMessage(PATH, { topic: commandTopic(machine), payload: { type: "dashboard:command", command, payload } }),
    [machine],
  );

  return {
    data: machine !== null ? store[machine] : null,
    machines,
    machine,
    selectMachine: setSelected,
    connected,
    connecting: !settled,
    error: null,
    updatedAt: machine !== null ? (updatedAt[machine] ?? null) : null,
    sendCommand,
  };
}
