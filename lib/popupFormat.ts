export type PopupRow = { label: string; value: string };
export type PopupData = { title: string; subtitle: string; kind: string; rows: PopupRow[]; hint: string };

export function sanitizeCell(v: unknown): string {
  if (v === null || v === undefined) return "—";
  const s = String(v).trim();
  return s === "" || s.toLowerCase() === "undefined" || s.toLowerCase() === "null" ? "—" : s;
}

export function normalizePopup(m: Record<string, unknown>): PopupData | null {
  if ((m.action as string) !== "open") return null;
  const raw = m.rows;
  const list = (Array.isArray(raw) ? raw : []).slice(0, 50);
  const rows: PopupRow[] = [];
  for (const r of list) {
    if (!r || typeof r !== "object") continue;
    const rec = r as Record<string, unknown>;
    if (
      rec.label !== undefined ||
      rec.value !== undefined ||
      rec.SlNo !== undefined ||
      rec.slNo !== undefined ||
      rec.Item !== undefined ||
      rec.item !== undefined
    ) {
      const label = sanitizeCell(rec.label ?? rec.SlNo ?? rec.slNo);
      const value = sanitizeCell(rec.value ?? rec.Item ?? rec.item);
      if (label === "—" && value === "—") continue;
      rows.push({ label, value });
      continue;
    }
    for (const k of Object.keys(rec)) {
      if (rows.length >= 50) break;
      if (k.charAt(0) === "_") continue;
      const label = sanitizeCell(k);
      const value = sanitizeCell(rec[k]);
      if (label === "—" && value === "—") continue;
      rows.push({ label, value });
    }
    if (rows.length >= 50) break;
  }
  const title = sanitizeCell(m.title);
  const subtitle = sanitizeCell(m.subtitle);
  const hint = sanitizeCell(m.hint);
  return {
    title: title === "—" ? "Production Information" : title,
    subtitle: subtitle === "—" ? "SAM AI • Production Information" : subtitle,
    kind: typeof m.kind === "string" ? (m.kind as string) : "",
    rows,
    hint: hint === "—" ? "Say “OK” to close" : hint,
  };
}
