import * as React from "react"
import { cn } from "@/lib/utils"

const DIMS = { default: 44, lg: 60, xl: 78 } as const;

export function Led({ label, on, variant = "default", size = "default", shape = "round" }: { label?: string; on: boolean; variant?: "default" | "danger" | "cyan"; size?: "default" | "lg" | "xl"; shape?: "round" | "square" }) {
  const dim = DIMS[size];
  const pad = Math.max(4, Math.round(dim * 0.1));
  const orb = dim - pad * 2;
  return (
    <div className="led-block">
      <div className="led-stage" data-on={on} data-variant={variant} data-shape={shape} style={{ width: dim, height: dim }}>
        <div className="led-halo" aria-hidden="true" />
        <div className="led-bezel" aria-hidden="true" />
        <div className="led-glass" aria-hidden="true" style={{ width: orb, height: orb }} />
        <div
          className={cn("led-core")}
          data-on={on}
          data-variant={variant}
          aria-hidden="true"
          style={{ width: orb, height: orb }}
        />
        <div
          className="led-spec"
          aria-hidden="true"
          style={{
            width: orb * 0.46,
            height: orb * 0.32,
            top: pad + orb * 0.1,
            left: pad + orb * 0.16,
          }}
        />
        <div
          className="led-spark"
          aria-hidden="true"
          style={{
            width: Math.max(3, orb * 0.1),
            height: Math.max(3, orb * 0.1),
            top: pad + orb * 0.22,
            left: pad + orb * 0.26,
          }}
        />
      </div>
      {label ? (
        <span className="led-label" style={{ color: on ? "var(--ink)" : "var(--ink-subtle)", fontSize: size === "lg" || size === "xl" ? 10 : 9 }}>
          {label}
        </span>
      ) : null}
    </div>
  )
}
