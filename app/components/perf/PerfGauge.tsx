import { memo } from "react";
import { ArrowDown, ArrowUp } from "lucide-react";
import { VALUE_POP, fmtPct } from "./perfUi";

interface Props {
  title: string;
  value: number;
  note: string;
  color: string;
}

// Semicircle centred at (100,100); value 0 sits at the left end, 100 at the right.
const point = (value: number, r: number) => {
  const angle = Math.PI - (Math.PI * value) / 100;
  return [100 + r * Math.cos(angle), 100 - r * Math.sin(angle)].map((n) => +n.toFixed(2));
};
const arc = (from: number, to: number, r: number) => {
  const [x1, y1] = point(from, r);
  const [x2, y2] = point(to, r);
  return `M ${x1} ${y1} A ${r} ${r} 0 0 1 ${x2} ${y2}`;
};

const ZONES = [
  { from: 0, to: 50, color: "var(--destructive)" },
  { from: 50, to: 70, color: "var(--warning)" },
  { from: 70, to: 100, color: "var(--success)" },
];
const TICKS = [0, 50, 70, 100];
const TRACK = arc(0, 100, 70);

function PerfGauge({ title, value, note, color }: Props) {
  const safe = Number.isFinite(value) ? Math.max(0, Math.min(100, value)) : 0;
  const zone = ZONES.find((z) => safe < z.to) ?? ZONES[2];
  const Trend = note.trim().startsWith("-") ? ArrowDown : ArrowUp;

  return (
    <div className="group/gauge flex min-w-0 flex-col items-center rounded-lg border px-2 pb-1.5 pt-1 transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md hover:shadow-foreground/5" role="img" aria-label={`${title}: ${fmtPct(safe)}`}>
      <div className="@container relative w-full max-w-52">
        <svg viewBox="0 -8 200 120" className="w-full overflow-visible transition-transform duration-300 group-hover/gauge:scale-[1.03]">
          {ZONES.map((z) => (
            <path
              key={z.from}
              data-zone={z.from}
              d={arc(z.from, z.to, 88)}
              fill="none"
              strokeWidth={6}
              style={{ stroke: z.color, opacity: safe > 0 && z === zone ? 1 : 0.3, transition: "opacity 0.4s" }}
            />
          ))}
          {TICKS.map((t) => {
            const [x1, y1] = point(t, 82);
            const [x2, y2] = point(t, 95);
            const [lx, ly] = point(t, 103);
            return (
              <g key={t} className="text-muted-foreground">
                <line x1={x1} y1={y1} x2={x2} y2={y2} stroke="currentColor" strokeWidth={2} />
                {t > 0 && t < 100 && (
                  <text x={lx} y={ly} textAnchor="middle" dominantBaseline="central" fill="currentColor" className="font-mono text-[0.6rem]">
                    {t}
                  </text>
                )}
              </g>
            );
          })}
          <path d={TRACK} fill="none" strokeWidth={16} strokeLinecap="round" style={{ stroke: "var(--border)" }} />
          <path
            d={TRACK}
            fill="none"
            strokeWidth={16}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={`${safe} 100`}
            opacity={safe > 0 ? 1 : 0}
            style={{ stroke: zone.color, transition: "stroke-dasharray 0.9s cubic-bezier(0.22, 1, 0.36, 1), stroke 0.4s" }}
          />
        </svg>
        <div className="absolute inset-x-0 bottom-0 flex flex-col items-center">
          <span key={safe} className={`${VALUE_POP} text-lg font-bold leading-none tracking-tight tabular-nums @[9rem]:text-2xl`}>{fmtPct(safe)}</span>
          <span className="mt-0.5 text-[0.625rem] font-medium uppercase tracking-wide text-muted-foreground">{title}</span>
        </div>
      </div>
      <div className="flex w-full max-w-52 justify-between px-1 font-mono text-[0.5625rem] leading-3 text-muted-foreground">
        <span>0</span>
        <span>100</span>
      </div>
      <div className="flex h-4 max-w-full items-center gap-1 font-mono text-[0.6875rem] font-semibold" style={{ color }}>
        {note ? (
          <>
            <Trend className="size-3 shrink-0" />
            <span className="truncate">{note}</span>
          </>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </div>
    </div>
  );
}

export default memo(PerfGauge);
