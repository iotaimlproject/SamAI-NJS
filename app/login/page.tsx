import type { Metadata } from "next";
import { Activity, BrainCircuit, Lock, Mic } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { ThemeToggle } from "@/components/theme-toggle";
import { Logo } from "@/components/logo";
import LoginForm from "./LoginForm";

export const metadata: Metadata = { title: "Sign in — SamAI Performance Dashboard" };

const FEATURES = [
  { icon: Activity, label: "Realtime OEE" },
  { icon: BrainCircuit, label: "AI predictions" },
  { icon: Mic, label: "Voice control" },
];

export default async function LoginPage({ searchParams }: { searchParams: Promise<{ next?: string }> }) {
  const { next } = await searchParams;

  return (
    <main className="relative grid min-h-dvh place-items-center overflow-hidden p-4">
      <div aria-hidden className="pointer-events-none absolute inset-0 bg-[radial-gradient(var(--border)_1px,transparent_1px)] [background-size:22px_22px] [mask-image:radial-gradient(ellipse_at_center,black_30%,transparent_75%)]" />
      <div aria-hidden className="pointer-events-none absolute -left-32 -top-32 size-[28rem] rounded-full bg-primary/20 blur-3xl motion-safe:animate-drift" />
      <div aria-hidden className="pointer-events-none absolute -bottom-40 -right-24 size-[26rem] rounded-full bg-warning/15 blur-3xl motion-safe:animate-drift [animation-delay:-7s]" />

      <ThemeToggle className="absolute right-4 top-4" />

      <Card className="relative w-full max-w-sm gap-5 py-6 shadow-xl shadow-foreground/5 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:zoom-in-95 motion-safe:slide-in-from-bottom-4 motion-safe:duration-500">
        <CardHeader className="justify-items-center gap-1.5 px-6 text-center">
          <span className="relative mb-1 grid size-14 place-items-center">
            <span aria-hidden className="absolute inset-0 rounded-[0.875rem] ring-2 ring-foreground/25 motion-safe:animate-ping [animation-duration:2.4s]" />
            <Logo className="size-14 drop-shadow-lg transition-transform duration-300 hover:-rotate-6 hover:scale-110" />
          </span>
          <CardTitle className="text-xl font-bold uppercase tracking-tight">SAM AI</CardTitle>
          <CardDescription>Performance Dashboard</CardDescription>
          <div className="mt-2 flex flex-wrap justify-center gap-1.5">
            {FEATURES.map(({ icon: Icon, label }, index) => (
              <Badge
                key={label}
                variant="secondary"
                className="gap-1 px-1.5 text-[0.6875rem] transition-all duration-200 hover:-translate-y-0.5 hover:bg-primary/10 hover:text-primary motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-bottom-1 motion-safe:fill-mode-both"
                style={{ animationDelay: `${250 + index * 90}ms` }}
              >
                <Icon />
                {label}
              </Badge>
            ))}
          </div>
        </CardHeader>
        <CardContent className="px-6 motion-safe:animate-in motion-safe:fade-in-0 motion-safe:fill-mode-both motion-safe:[animation-delay:350ms]">
          <LoginForm next={next} />
        </CardContent>
        <CardFooter className="justify-center gap-1.5 border-t bg-transparent px-6 pt-4 text-xs text-muted-foreground">
          <Lock className="size-3.5" />
          View-only access · session lasts 12 h
        </CardFooter>
      </Card>
    </main>
  );
}
