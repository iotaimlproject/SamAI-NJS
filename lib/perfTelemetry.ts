import type { DashboardData } from "./perfTypes";

const FIELD_MAP: Record<string, keyof DashboardData> = {
  availability: "availability",
  performance: "performance",
  quality: "quality",
  oee: "oee",
  qtyReq: "productionQuantity",
  produced: "partsProduced",
  rmQty: "rawMaterials",
  badParts: "rejectedParts",
  goodParts: "goodParts",
  perPart: "cycleTime",
};

function toNumber(value: unknown): number | undefined {
  if (typeof value === "number") return Number.isFinite(value) ? value : undefined;
  if (typeof value === "string" && value.trim() !== "") {
    const n = Number(value);
    return Number.isFinite(n) ? n : undefined;
  }
  return undefined;
}

export function telemetryToPatch(value: Record<string, unknown>): Partial<DashboardData> {
  const patch: Record<string, unknown> = {};
  for (const [from, to] of Object.entries(FIELD_MAP)) {
    const n = toNumber(value[from]);
    if (n !== undefined) patch[to] = n;
  }
  return patch as Partial<DashboardData>;
}

function tryParse(raw: unknown): unknown {
  if (typeof raw !== "string") return raw;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

export function extractTelemetryPatch(message: unknown): Partial<DashboardData> | null {
  const outer = tryParse(message);
  if (!outer || typeof outer !== "object") return null;
  const record = outer as Record<string, unknown>;
  let source: Record<string, unknown>;
  if (typeof record.type === "string") {
    if (typeof record.payload !== "string") return null;
    const inner = tryParse(record.payload);
    if (!inner || typeof inner !== "object") return null;
    source = inner as Record<string, unknown>;
  } else {
    const inner = tryParse(record.payload);
    source = inner && typeof inner === "object" ? (inner as Record<string, unknown>) : record;
  }
  const value =
    source.value && typeof source.value === "object" ? (source.value as Record<string, unknown>) : source;
  if (source.device !== "telemetry" && !Object.keys(FIELD_MAP).some((k) => value[k] !== undefined)) return null;
  const patch = telemetryToPatch(value);
  return Object.keys(patch).length > 0 ? patch : null;
}
