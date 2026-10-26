"use client";

import { useActionState, useRef, useState } from "react";
import { REGEXP_ONLY_DIGITS } from "input-otp";
import { ArrowRight, Eye, EyeOff, Loader2, ShieldAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Field, FieldDescription, FieldLabel } from "@/components/ui/field";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { login, type LoginState } from "./actions";

const CODE_LENGTH = 6;
const SLOT =
  "size-11 rounded-lg border text-lg font-semibold font-mono shadow-xs transition-all duration-200 first:rounded-lg last:rounded-lg hover:-translate-y-0.5 hover:border-primary/50 hover:shadow-sm data-[filled=true]:border-primary/40 data-[filled=true]:bg-primary/5 data-[active=true]:-translate-y-0.5 sm:size-12";

export default function LoginForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, { attempt: 0 });
  const [revealed, setRevealed] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const invalid = Boolean(state.error);

  return (
    <form ref={formRef} action={action} className="space-y-5">
      <input type="hidden" name="next" value={next ?? "/"} />
      <Field data-invalid={invalid || undefined} className="items-center gap-3">
        <div className="flex w-full items-center justify-between">
          <FieldLabel htmlFor="code">Access code</FieldLabel>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button type="button" variant="ghost" size="icon-xs" aria-label={revealed ? "Hide code" : "Show code"} onClick={() => setRevealed(!revealed)}>
                {revealed ? <EyeOff /> : <Eye />}
              </Button>
            </TooltipTrigger>
            <TooltipContent>{revealed ? "Hide code" : "Show code"}</TooltipContent>
          </Tooltip>
        </div>
        <InputOTP
          key={state.attempt}
          id="code"
          name="code"
          maxLength={CODE_LENGTH}
          pattern={REGEXP_ONLY_DIGITS}
          inputMode="numeric"
          autoComplete="one-time-code"
          autoFocus
          disabled={pending}
          aria-invalid={invalid || undefined}
          onComplete={() => formRef.current?.requestSubmit()}
          containerClassName={cn("justify-center", invalid && "motion-safe:animate-shake")}
        >
          <InputOTPGroup className="gap-2 has-aria-invalid:ring-0 sm:gap-2.5">
            {Array.from({ length: CODE_LENGTH }, (_, index) => (
              <InputOTPSlot key={index} index={index} masked={!revealed} aria-invalid={invalid || undefined} className={SLOT} />
            ))}
          </InputOTPGroup>
        </InputOTP>
        {invalid ? (
          <p role="alert" className="flex items-center gap-1.5 text-sm font-medium text-destructive motion-safe:animate-in motion-safe:fade-in-0 motion-safe:slide-in-from-top-1">
            <ShieldAlert className="size-4" />
            {state.error}
          </p>
        ) : (
          <FieldDescription className="text-center">Enter the 6-digit plant access code.</FieldDescription>
        )}
      </Field>
      <Button type="submit" size="lg" className="group/submit h-10 w-full text-sm font-semibold shadow-sm transition-all hover:shadow-md hover:shadow-primary/25" disabled={pending}>
        {pending ? <Loader2 className="animate-spin" /> : null}
        {pending ? "Verifying…" : "Unlock dashboard"}
        {!pending && <ArrowRight className="transition-transform duration-200 group-hover/submit:translate-x-1" />}
      </Button>
    </form>
  );
}
