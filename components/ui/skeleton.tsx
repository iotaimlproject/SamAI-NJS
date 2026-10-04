import { cn } from "@/lib/utils";

function Skeleton({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn("animate-pulse rounded-md", className)}
      style={{ background: "color-mix(in srgb, var(--ink) 9%, transparent)" }}
      {...props}
    />
  );
}

export { Skeleton };
