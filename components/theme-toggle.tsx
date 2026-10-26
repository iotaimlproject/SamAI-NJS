"use client";

import type { MouseEvent } from "react";
import { Moon, Sun } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

function applyTheme() {
  const dark = document.documentElement.classList.toggle("dark");
  try {
    localStorage.setItem("samai-theme", dark ? "dark" : "light");
  } catch {
    void 0;
  }
}

function toggleTheme(event: MouseEvent<HTMLButtonElement>) {
  if (!document.startViewTransition || matchMedia("(prefers-reduced-motion: reduce)").matches) {
    applyTheme();
    return;
  }
  const { left, top, width, height } = event.currentTarget.getBoundingClientRect();
  const x = left + width / 2;
  const y = top + height / 2;
  const radius = Math.hypot(Math.max(x, innerWidth - x), Math.max(y, innerHeight - y));
  const root = document.documentElement.style;
  root.setProperty("--theme-x", `${x}px`);
  root.setProperty("--theme-y", `${y}px`);
  root.setProperty("--theme-radius", `${radius}px`);
  document.startViewTransition(applyTheme).ready.catch(() => undefined);
}

export function ThemeToggle({ className }: { className?: string }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <Button variant="ghost" size="icon-sm" aria-label="Toggle theme" onClick={toggleTheme} className={cn("group/theme", className)}>
          <Moon className="transition-transform duration-300 group-hover/theme:-rotate-12 dark:hidden" />
          <Sun className="hidden transition-transform duration-500 group-hover/theme:rotate-90 dark:block" />
        </Button>
      </TooltipTrigger>
      <TooltipContent>Toggle theme</TooltipContent>
    </Tooltip>
  );
}
