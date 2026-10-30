import { EMPTY_DASHBOARD, type DashboardData } from "./perfTypes.ts";

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

const OPTIONAL_FIELDS = ["customerId", "project", "assembly", "component", "supervisorId", "operatorId"];
const FIELD_DEFAULTS: Record<string, unknown> = { ...EMPTY_DASHBOARD, ...Object.fromEntries(OPTIONAL_FIELDS.map((key) => [key, ""])) };

const isRecord = (value: unknown): value is Record<string, unknown> => typeof value === "object" && value !== null && !Array.isArray(value);

// Coerce a value to the type of the field's default, or drop it, so a bad Node-RED payload can't crash a panel.
function coerceField(key: string, value: unknown): unknown {
  const fallback = FIELD_DEFAULTS[key];
  if (typeof fallback === "number") return toNumber(value);
  if (typeof fallback === "string") return typeof value === "string" ? value : typeof value === "number" && Number.isFinite(value) ? String(value) : undefined;
  if (typeof fallback === "boolean") return typeof value === "boolean" ? value : undefined;
  if (!Array.isArray(fallback) || !Array.isArray(value)) return undefined;
  return value.filter(isRecord);
}

// A topic payload: any subset of DashboardData, directly or under `payload` / `value`.
export function toPanelPatch(message: unknown): Partial<DashboardData> | null {
  const outer = tryParse(message);
  if (!isRecord(outer)) return null;
  const inner = tryParse(outer.payload ?? outer.value ?? outer);
  if (!isRecord(inner)) return null;
  const patch: Record<string, unknown> = telemetryToPatch(inner);
  for (const [key, raw] of Object.entries(inner)) {
    if (!Object.hasOwn(FIELD_DEFAULTS, key)) continue;
    const value = coerceField(key, raw);
    if (value !== undefined) patch[key] = value;
  }
  return Object.keys(patch).length > 0 ? (patch as Partial<DashboardData>) : null;
}

// Returns `previous` itself when nothing changed, so React skips the re-render.
export function mergePatch(previous: DashboardData | null, patch: Partial<DashboardData>): DashboardData {
  const base = previous ?? EMPTY_DASHBOARD;
  const changed = Object.entries(patch).some(([key, value]) => !Object.is(base[key as keyof DashboardData], value));
  if (!changed && previous) return previous;
  return { ...base, ...patch };
}

// ── Topics ──────────────────────────────────────────────────────────────────────────────────────
// MQTT topics, one retained value per data point: perf/<machine>/<panel>/<field>, payload = JSON value
// (e.g. perf/CNC-02/oee/availability → 61). A 3-level perf/<machine>/<panel> topic with an object payload
// of several fields is accepted too. Node-RED bridges the broker to /ws/perf/live as `{ topic, payload }`
// frames and answers a subscribe with `{ type: "snapshot", messages }` (its cache of retained values).
// Connecting the browser to the broker directly later keeps the same topics and payloads.

export const PERF_TOPIC_ALL = "perf/+/#";
export const commandTopic = (machine: string) => `perf/${machine}/cmd`;

export type PerfMessage = { topic: string; payload: unknown };
export type MachineStore = Readonly<Record<string, DashboardData>>;

export function parseTopic(topic: string): { machine: string; panel: string; field?: string } | null {
  const parts = topic.split("/");
  if ((parts.length !== 3 && parts.length !== 4) || parts[0] !== "perf" || parts.some((part) => !part)) return null;
  return parts.length === 4 ? { machine: parts[1], panel: parts[2], field: parts[3] } : { machine: parts[1], panel: parts[2] };
}

const toMessage = (value: unknown): PerfMessage | null =>
  isRecord(value) && typeof value.topic === "string" ? { topic: value.topic, payload: value.payload } : null;

// One socket frame → zero or more topic messages. Never throws.
export function decodeFrame(raw: unknown): PerfMessage[] {
  const frame = tryParse(raw);
  if (!isRecord(frame)) return [];
  if (frame.type === "snapshot") return Array.isArray(frame.messages) ? frame.messages.map(toMessage).filter((m) => m !== null) : [];
  const message = toMessage(frame);
  return message ? [message] : [];
}

// Apply messages to the per-machine store. Returns `store` itself when nothing changed (no re-render).
export function applyPerfMessages(store: MachineStore, messages: readonly PerfMessage[]): MachineStore {
  let next: Record<string, DashboardData> | null = null;
  for (const { topic, payload } of messages) {
    const target = parseTopic(topic);
    if (!target || target.panel === "cmd") continue;
    const patch = target.field ? toPanelPatch({ [target.field]: tryParse(payload) }) : toPanelPatch(payload);
    if (!patch) continue;
    const previous = (next ?? store)[target.machine] ?? null;
    const merged = mergePatch(previous, patch);
    if (merged === previous) continue;
    next ??= { ...store };
    next[target.machine] = merged;
  }
  return next ?? store;
}
