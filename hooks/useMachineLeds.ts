"use client";

import { useEffect, useState } from "react";
import {
  NODE_RED_WS_PATHS,
  closeNodeRedSocket,
  getNodeRedSocket,
} from "@/lib/nodeRedWebSocket";

export function useMachineLeds() {
  const [machineOn, setMachineOn] = useState(false);
  const [powerOn, setPowerOn] = useState(false);
  const [productionOn, setProductionOn] = useState(false);
  const [stop, setStop] = useState(false);

  useEffect(() => {
    getNodeRedSocket(NODE_RED_WS_PATHS.machine, {
      onmessage: (e) => {
        try {
          const p = JSON.parse(e.data);
          if (p.device !== "machine") return;
          const v = (p.value ?? p.payload ?? p) as Record<string, unknown> | boolean;
          if (v !== null && typeof v === "object") {
            if (typeof v.power === "boolean") setMachineOn(v.power);
            if (typeof v.led === "boolean") setPowerOn(v.led);
            else if (typeof v.power === "boolean") setPowerOn(v.power);
            if (typeof v.production === "boolean") setProductionOn(v.production);
            return;
          }
          setMachineOn(Boolean(p.value ?? v));
        } catch { void 0; }
      },
    });
    return () => closeNodeRedSocket(NODE_RED_WS_PATHS.machine);
  }, []);

  useEffect(() => {
    getNodeRedSocket(NODE_RED_WS_PATHS.stop, {
      onmessage: (e) => {
        try {
          const p = JSON.parse(e.data);
          if (p.device === "stop") setStop(Boolean(p.value));
        } catch { void 0; }
      },
    });
    return () => closeNodeRedSocket(NODE_RED_WS_PATHS.stop);
  }, []);

  return { machineOn, powerOn, productionOn, stop };
}
