"use client";

import { useEffect, useState } from "react";
import {
  NODE_RED_WS_PATHS,
  closeNodeRedSocket,
  getNodeRedSocket,
} from "@/lib/nodeRedWebSocket";

export function usePerfDataFeed() {
  const [batchPartNo, setBatchPartNo] = useState<string | null>(null);
  const [activePartNo, setActivePartNo] = useState<string | null>(null);

  useEffect(() => {
    getNodeRedSocket(NODE_RED_WS_PATHS.data, {
      onmessage: (e) => {
        try {
          const p = JSON.parse(e.data);
          if (p.device !== "data") return;
          const v = (p.value ?? p.payload ?? p) as Record<string, unknown>;
          if (v === null || typeof v !== "object") return;
          if (typeof v.batchPartNo === "string") setBatchPartNo(v.batchPartNo);
          if (typeof v.activePartNo === "string") setActivePartNo(v.activePartNo);
        } catch { void 0; }
      },
    });
    return () => closeNodeRedSocket(NODE_RED_WS_PATHS.data);
  }, []);

  return { batchPartNo, activePartNo };
}
