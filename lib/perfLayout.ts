export type PanelLayout = Record<string, number>;
export type PanelLayouts = Record<string, PanelLayout>;

export const LAYOUT_COOKIE = "samai_layout";
const LAYOUT_MAX_AGE = 60 * 60 * 24 * 365;

const isLayout = (value: unknown): value is PanelLayout =>
  typeof value === "object" && value !== null && Object.values(value).every((size) => typeof size === "number" && Number.isFinite(size));

export class DashboardLayout {
  static parse(raw: string | undefined): PanelLayouts {
    if (!raw) return {};
    try {
      const parsed: unknown = JSON.parse(decodeURIComponent(raw));
      if (typeof parsed !== "object" || parsed === null) return {};
      return Object.fromEntries(Object.entries(parsed).filter(([, layout]) => isLayout(layout))) as PanelLayouts;
    } catch {
      return {};
    }
  }

  private readonly handlers = new Map<string, (layout: PanelLayout, meta: { isUserInteraction: boolean }) => void>();

  private layouts: PanelLayouts;

  constructor(layouts: PanelLayouts) {
    this.layouts = layouts;
  }

  persist(groupId: string) {
    let handler = this.handlers.get(groupId);
    if (!handler) {
      handler = (layout, meta) => {
        if (meta.isUserInteraction) this.save(groupId, layout);
      };
      this.handlers.set(groupId, handler);
    }
    return handler;
  }

  get(groupId: string): PanelLayout | undefined {
    return this.layouts[groupId];
  }

  save(groupId: string, layout: PanelLayout) {
    this.layouts = { ...this.layouts, [groupId]: layout };
    this.write(encodeURIComponent(JSON.stringify(this.layouts)), LAYOUT_MAX_AGE);
  }

  reset() {
    this.layouts = {};
    this.write("", 0);
  }

  private write(value: string, maxAge: number) {
    document.cookie = `${LAYOUT_COOKIE}=${value}; Path=/; Max-Age=${maxAge}; SameSite=Lax`;
  }
}
