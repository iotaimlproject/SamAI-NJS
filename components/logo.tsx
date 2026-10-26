import { cn } from "@/lib/utils";

const LOGO_HEXAGON = "M16 4 26.4 10v12L16 28 5.6 22V10Z";
const LOGO_MARK = "M22.1 13.9v-1.8L16 8.6l-6.1 3.5 12.2 7L16 22.6l-6.1-3.5v-1.8";

export function Logo({ className, title = "SAM AI" }: { className?: string; title?: string }) {
  return (
    <svg viewBox="0 0 32 32" role="img" aria-label={title} className={cn("size-6 shrink-0 rounded-[25%] dark:ring-1 dark:ring-white/20", className)}>
      <rect width="32" height="32" rx="8" fill="#0a0a0a" />
      <path d={LOGO_HEXAGON} fill="none" stroke="#fff" strokeOpacity="0.35" strokeWidth="1.5" strokeLinejoin="round" />
      <path d={LOGO_MARK} fill="none" stroke="#fff" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
