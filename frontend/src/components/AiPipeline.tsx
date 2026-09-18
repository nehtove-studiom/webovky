// AiPipeline — vizualizace práce AI agentů nad rezervací.
// Agent 1 (Claude) připraví prompt → Agent 2 (Execution) vygeneruje obrázek → zápis do kalendáře.

import { useState } from "react";
import { CalendarCheck, Check, Image as ImageIcon, Loader2, Sparkles, TriangleAlert } from "lucide-react";
import type { Booking } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

const STEPS = [
  {
    key: "prompt" as const,
    icon: Sparkles,
    title: "Asistentka Studio M",
    pending: "Asistentka přečte váš popis a připraví přesné zadání pro obrázek.",
    active: "Asistentka připravuje precizní zadání pro návrh…",
    done: "Prompt připraven — popis jsme přeložili do přesného zadání pro obrázek.",
  },
  {
    key: "image" as const,
    icon: ImageIcon,
    title: "Nail artista",
    pending: "Generátor obrázků vytvoří fotorealistickou ukázku vašich nehtů.",
    active: "Generuje se fotorealistický návrh — obvykle to trvá půl minuty…",
    done: "Fotorealistický návrh vašich nehtů je hotový.",
  },
  {
    key: "calendar" as const,
    icon: CalendarCheck,
    title: "Zápis do kalendáře",
    pending: "Návrh i popis putují k vašemu termínu v Google Kalendáři.",
    active: "Ukládáme návrh k vaší rezervaci v kalendáři…",
    done: "Návrh je uložený u vašeho termínu — paní M. ho na místě hned najde.",
  },
];

const ORDER = ["none", "prompt", "image", "calendar", "done"] as const;

export function AiPipeline({ booking }: { booking: Booking }) {
  const [showPrompt, setShowPrompt] = useState(false);
  const current = ORDER.indexOf(booking.pipeline_status as (typeof ORDER)[number]);
  const failed = booking.pipeline_status === "failed";

  return (
    <div className="space-y-3" data-testid="ai-pipeline">
      {STEPS.map((step, i) => {
        const state = failed ? "pending" : i < current - 1 ? "done" : i === current - 1 ? "active" : "pending";
        const Icon = step.icon;
        const isActive = state === "active";
        const isDone = state === "done";
        return (
          <div
            key={step.key}
            data-testid={`ai-pipeline-step-${step.key}`}
            className={`flex items-start gap-3 rounded-2xl border p-4 transition-colors duration-300 ${
              isActive
                ? "border-[#C08272]/40 bg-[#F3E0D8]/40"
                : isDone
                  ? "border-[#7E8C78]/25 bg-[#7E8C78]/5"
                  : "border-[#EFDCD4] bg-white/60"
            }`}
          >
            <span
              className={`flex size-9 shrink-0 items-center justify-center rounded-full ${
                isActive
                  ? "bg-[#C08272] text-white"
                  : isDone
                    ? "bg-[#7E8C78] text-white"
                    : "bg-[#F8EAE3] text-[#8A7972]"
              }`}
            >
              {isActive ? (
                <Loader2 className="size-4 animate-spin" aria-hidden />
              ) : isDone ? (
                <Check className="size-4" aria-hidden />
              ) : (
                <Icon className="size-4" aria-hidden />
              )}
            </span>
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <p className="font-heading text-base text-[#5E4238]">{step.title}</p>
                {isDone && <Badge variant="secondary">Hotovo</Badge>}
                {isActive && <Badge className="bg-[#C08272] text-white">Pracuji…</Badge>}
              </div>
              <p className="mt-1 text-sm leading-relaxed text-[#8A7972]">
                {isActive ? step.active : isDone ? step.done : step.pending}
              </p>
              {step.key === "prompt" && booking.design_prompt && (
                <div className="mt-2">
                  <Button variant="ghost" size="xs" onClick={() => setShowPrompt((v) => !v)} data-testid="toggle-design-prompt-button">
                    {showPrompt ? "Skrýt zadání" : "Zobrazit zadání asistentky"}
                  </Button>
                  {showPrompt && (
                    <p
                      className="mt-2 rounded-xl bg-[#5E4238] p-3 font-mono text-xs leading-relaxed text-[#8A7972]"
                      data-testid="design-prompt-display"
                    >
                      {booking.design_prompt}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        );
      })}

      {failed && (
        <div className="rounded-2xl border border-[#B4544A]/30 bg-[#B4544A]/5 p-4" data-testid="ai-pipeline-error">
          <div className="flex items-center gap-2 text-[#B4544A]">
            <TriangleAlert className="size-4" aria-hidden />
            <p className="font-medium">Zpracování návrhu bohužel selhalo.</p>
          </div>
          {booking.pipeline_error && (
            <p className="mt-1 break-words text-xs text-[#8A7972]">{booking.pipeline_error}</p>
          )}
          <p className="mt-2 text-sm text-[#8A7972]">
            Klidně to zkuste znovu — popište design a odešlete jej ještě jednou.
          </p>
        </div>
      )}

      {booking.has_design_image && (
        <figure className="pt-1" data-testid="design-image-figure">
          <img
            src={`/api/bookings/${booking.id}/design-image?v=${encodeURIComponent(booking.updated_at)}`}
            alt="AI návrh designu nehtů podle vašeho popisu"
            data-testid="design-image-preview"
            className="w-full rounded-2xl border border-[#EFDCD4] shadow-[0_18px_50px_-24px_rgba(28,25,23,0.35)]"
          />
          <figcaption className="mt-2 text-center text-xs tracking-[0.14em] text-[#8A7972] uppercase">
            Návrh vytvořený týmem Studio M
          </figcaption>
        </figure>
      )}
    </div>
  );
}
