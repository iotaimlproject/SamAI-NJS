"use client";

import type { CSSProperties, ReactNode } from "react";

export type PanelTone = "emerald" | "blue" | "violet" | "amber";

export function PanelCard({
  title,
  subtitle,
  action,
  meter,
  footer,
  icon,
  tone = "emerald",
  className = "",
  style,
  bodyStyle,
  children,
}: {
  title: string;
  subtitle?: string;
  action?: ReactNode;
  meter?: ReactNode;
  footer?: ReactNode;
  icon?: ReactNode;
  tone?: PanelTone;
  className?: string;
  style?: CSSProperties;
  bodyStyle?: CSSProperties;
  children: ReactNode;
}) {
  return (
    <section className={`instrument robot-panel robot-panel--tone-${tone}${className ? ` ${className}` : ""}`} style={style} aria-label={title}>
      <div className="robot-panel__head">
        <div style={{ display: "flex", alignItems: "center", gap: 10, minWidth: 0 }}>
          {icon ? (
            <span className="panel-icon" aria-hidden="true">
              {icon}
            </span>
          ) : null}
          <div className="robot-panel__titles">
            <h2 className="robot-panel__title">{title}</h2>
            {subtitle ? <p className="robot-panel__subtitle">{subtitle}</p> : null}
          </div>
        </div>
        {action ? <div className="robot-panel__action">{action}</div> : null}
      </div>
      <div className="robot-panel__body" style={bodyStyle}>
        {children}
      </div>
      {meter}
      {footer ? <div className="robot-panel__foot">{footer}</div> : null}
    </section>
  );
}
