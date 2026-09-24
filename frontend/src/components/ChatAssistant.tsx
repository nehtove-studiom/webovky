// ChatAssistant — krásné animované okno s asistentkou Klárou.
// Otevírá se z CTA „Vybrat termín“ i z plovoucí bubliny. Umí ceník, volné
// termíny i vytvoření rezervace (nástroje na backendu).

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "motion/react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { CalendarCheck2, MessageCircleHeart, Send, Sparkles as SparkIcon, X } from "lucide-react";
import { toast } from "sonner";
import Sparkles from "@/components/Sparkles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { apiGet, apiPost } from "@/lib/api";
import type { AgentStatus, ChatReply, ChatRole } from "@/types";

interface Bubble {
  id: string;
  role: ChatRole;
  content: string;
  imageUrl?: string | null;
}

const GREETING =
  "Dobrý den, tady Stella ze Studia M ♥ Ráda vám najdu volný termín, řeknu ceny nebo poradím s designem nehtů. Co byste si přála?";

const QUICK_PROMPTS = [
  { id: "volno-tyden", label: "Máte volno tento týden?" },
  { id: "cena-gel-lak", label: "Kolik stojí gel lak?" },
  { id: "modelaz-patek", label: "Chtěla bych modeláž v pátek odpoledne" },
  { id: "design-svatba", label: "Poraďte mi design na svatbu" },
];

let bubbleSeq = 0;
const nextId = () => `b-${++bubbleSeq}-${Date.now()}`;

export default function ChatAssistant({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const queryClient = useQueryClient();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [draft, setDraft] = useState("");
  const [bubbles, setBubbles] = useState<Bubble[]>([
    { id: nextId(), role: "assistant", content: GREETING },
  ]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const statusQuery = useQuery({
    queryKey: ["chat-status"],
    queryFn: () => apiGet<AgentStatus>("/chat/status"),
    enabled: open,
  });

  const send = useMutation({
    mutationFn: (message: string) =>
      apiPost<ChatReply>("/chat", { message, session_id: sessionId }),
    onSuccess: (data) => {
      setSessionId(data.session_id);
      setBubbles((prev) => [
        ...prev,
        { id: nextId(), role: "assistant", content: data.reply, imageUrl: data.image_url },
      ]);
      if (data.booking_id) {
        toast.success("Rezervace vytvořena! Najdete ji i v přehledu studia.");
        void queryClient.invalidateQueries({ queryKey: ["bookings"] });
        void queryClient.invalidateQueries({ queryKey: ["availability"] });
      }
    },
    onError: () => {
      setBubbles((prev) => [
        ...prev,
        {
          id: nextId(),
          role: "assistant",
          content:
            "Omlouvám se, teď se mi nepodařilo odpovědět. Zkusíte to prosím ještě jednou?",
        },
      ]);
    },
  });

  // posuň na poslední zprávu
  useEffect(() => {
    if (!open) return;
    const el = scrollRef.current;
    if (el) el.scrollTo({ top: el.scrollHeight, behavior: "smooth" });
  }, [bubbles, send.isPending, open]);

  // po otevření kurzor do pole + zavírání Escapem
  useEffect(() => {
    if (!open) return;
    const timer = setTimeout(() => inputRef.current?.focus(), 350);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onOpenChange(false);
    };
    window.addEventListener("keydown", onKey);
    return () => {
      clearTimeout(timer);
      window.removeEventListener("keydown", onKey);
    };
  }, [open, onOpenChange]);

  const submit = (text: string) => {
    const message = text.trim();
    if (!message || send.isPending) return;
    setBubbles((prev) => [...prev, { id: nextId(), role: "user", content: message }]);
    setDraft("");
    send.mutate(message);
  };

  return (
    <>
      {/* plovoucí bublina */}
      <AnimatePresence>
        {!open && (
          <motion.button
            type="button"
            initial={{ opacity: 0, scale: 0.7, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.7, y: 20 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
            onClick={() => onOpenChange(true)}
            data-testid="chat-launcher-button"
            aria-label="Otevřít chat s asistentkou Klárou"
            className="animate-halo gloss-hover fixed bottom-5 right-5 z-[60] flex items-center gap-2.5 rounded-full border border-[#E5CFC6] bg-gradient-to-br from-[#F8E6E0] via-[#EFD0C6] to-[#E3B5A6] py-3 pl-4 pr-5 shadow-[0_18px_40px_-18px_rgba(120,74,60,0.55)] transition-transform duration-300 hover:scale-[1.04] sm:bottom-7 sm:right-7"
          >
            <span className="relative flex size-9 items-center justify-center rounded-full bg-white/80">
              <MessageCircleHeart className="size-5 text-[#C08272]" aria-hidden />
              <Sparkles count={5} seed={3} color="#C79A7B" />
            </span>
            <span className="flex flex-col items-start leading-tight">
              <span className="font-heading text-[11px] tracking-[0.16em] text-[#6B4F45] uppercase">
                Stella
              </span>
              <span className="text-[11px] text-[#7A5A4E]">poradí s termínem</span>
            </span>
          </motion.button>
        )}
      </AnimatePresence>

      {/* okno chatu */}
      <AnimatePresence>
        {open && (
          <>
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.28 }}
              onClick={() => onOpenChange(false)}
              className="fixed inset-0 z-[59] bg-[#3B2A24]/25 backdrop-blur-[3px]"
              aria-hidden
            />
            <motion.section
              initial={{ opacity: 0, y: 28, scale: 0.97 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 24, scale: 0.97 }}
              transition={{ duration: 0.42, ease: [0.22, 1, 0.36, 1] }}
              role="dialog"
              aria-label="Chat s asistentkou Klárou"
              data-testid="chat-window"
              className="fixed inset-x-3 bottom-3 z-[60] flex max-h-[86svh] flex-col overflow-hidden rounded-[26px] border border-[#E9CFC4] bg-[#FDF6F2] shadow-[0_40px_90px_-40px_rgba(90,55,44,0.65)] sm:inset-x-auto sm:bottom-6 sm:right-6 sm:w-[420px]"
            >
              {/* hlavička */}
              <header className="relative overflow-hidden bg-gradient-to-br from-[#F6DED6] via-[#EFCEC3] to-[#E2B2A3] px-5 py-4">
                <div
                  className="animate-aurora pointer-events-none absolute -inset-8"
                  style={{
                    background:
                      "radial-gradient(circle at 25% 20%, rgba(255,255,255,0.7) 0%, transparent 55%)",
                  }}
                  aria-hidden
                />
                <Sparkles count={10} seed={5} color="#FFFFFF" />
                <div className="relative flex items-center gap-3">
                  <span className="flex size-11 shrink-0 items-center justify-center rounded-full border border-white/70 bg-white/85 font-heading text-lg text-[#C08272]">
                    K
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading text-base tracking-[0.1em] text-[#5E4238] uppercase">
                      Stella
                    </p>
                    <p className="flex items-center gap-1.5 text-[11px] text-[#7A5A4E]">
                      <span className="size-1.5 rounded-full bg-[#7E8C78]" aria-hidden />
                      {statusQuery.data?.external_agent
                        ? "asistentka studia · propojeno s vaším agentem"
                        : "asistentka studia · online"}
                    </p>
                  </div>
                  {statusQuery.data?.calendar_connected && (
                    <span
                      className="flex items-center gap-1 rounded-full bg-white/70 px-2 py-1 text-[10px] text-[#6B4F45]"
                      title="Termíny se zapisují do Google Kalendáře"
                    >
                      <CalendarCheck2 className="size-3" aria-hidden />
                      kalendář
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={() => onOpenChange(false)}
                    data-testid="chat-close-button"
                    aria-label="Zavřít chat"
                    className="flex size-8 items-center justify-center rounded-full bg-white/70 text-[#6B4F45] transition-colors duration-300 hover:bg-white"
                  >
                    <X className="size-4" aria-hidden />
                  </button>
                </div>
              </header>

              {/* konverzace */}
              <div
                ref={scrollRef}
                className="relative flex-1 space-y-3 overflow-y-auto px-4 py-4"
                data-testid="chat-messages"
              >
                <Sparkles count={8} seed={9} color="#EBD3C4" className="opacity-60" />
                {bubbles.map((bubble) => (
                  <div
                    key={bubble.id}
                    className={`animate-msg-in relative flex ${
                      bubble.role === "user" ? "justify-end" : "justify-start"
                    }`}
                    data-testid={`chat-bubble-${bubble.role}`}
                  >
                    <div className="flex max-w-[85%] flex-col gap-2">
                      <p
                        className={`rounded-2xl px-4 py-2.5 text-sm leading-relaxed whitespace-pre-line ${
                          bubble.role === "user"
                            ? "rounded-br-md bg-gradient-to-br from-[#C99181] to-[#B8776A] text-white shadow-[0_10px_22px_-14px_rgba(120,74,60,0.8)]"
                            : "rounded-bl-md border border-[#F0DDD4] bg-white text-[#5E4238] shadow-[0_10px_22px_-18px_rgba(90,55,44,0.5)]"
                        }`}
                      >
                        {bubble.content}
                      </p>
                      {bubble.imageUrl && (
                        <figure
                          className="animate-msg-in relative overflow-hidden rounded-2xl border border-[#E9CFC4] bg-white p-1.5 shadow-[0_16px_34px_-22px_rgba(90,55,44,0.6)]"
                          data-testid="chat-design-image"
                        >
                          <img
                            src={bubble.imageUrl}
                            alt="Vygenerovaný návrh vašich nehtů"
                            className="w-full rounded-xl"
                          />
                          <Sparkles count={8} seed={4} color="#C79A7B" />
                          <figcaption className="px-2 py-1.5 text-[10px] tracking-[0.14em] text-[#A98F84] uppercase">
                            Váš návrh od Kláry
                          </figcaption>
                        </figure>
                      )}
                    </div>
                  </div>
                ))}

                {send.isPending && (
                  <div className="flex flex-col items-start gap-2" data-testid="chat-typing-indicator">
                    <span className="flex items-center gap-1.5 rounded-2xl rounded-bl-md border border-[#F0DDD4] bg-white px-4 py-3">
                      {[0, 1, 2].map((i) => (
                        <span
                          key={i}
                          className="size-1.5 rounded-full bg-[#C08272]"
                          style={{
                            animation: "dot-bounce 1.25s ease-in-out infinite",
                            animationDelay: `${i * 0.15}s`,
                          }}
                        />
                      ))}
                    </span>
                    <span className="flex items-center gap-2 pl-2 text-[11px] text-[#A98F84]">
                      <SparkIcon className="animate-gold-twinkle size-3 text-[#C79A7B]" aria-hidden />
                      Stella píše — návrh nehtů může chvilku trvat…
                    </span>
                  </div>
                )}
              </div>

              {/* rychlé návrhy */}
              {bubbles.length <= 2 && (
                <div className="flex flex-wrap gap-2 px-4 pb-2" data-testid="chat-quick-prompts">
                  {QUICK_PROMPTS.map((prompt) => (
                    <button
                      key={prompt.id}
                      type="button"
                      onClick={() => submit(prompt.label)}
                      disabled={send.isPending}
                      data-testid={`chat-quick-prompt-${prompt.id}`}
                      className="gloss-hover rounded-full border border-[#E9CFC4] bg-white/80 px-3 py-1.5 text-[11px] text-[#6B4F45] transition-all duration-300 hover:-translate-y-0.5 hover:border-[#C08272] disabled:opacity-50"
                    >
                      {prompt.label}
                    </button>
                  ))}
                </div>
              )}

              {/* zadání */}
              <form
                onSubmit={(e) => {
                  e.preventDefault();
                  submit(draft);
                }}
                className="flex items-center gap-2 border-t border-[#F0DDD4] bg-white/70 px-3 py-3"
              >
                <Input
                  ref={inputRef}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  placeholder="Napište zprávu…"
                  aria-label="Zpráva pro asistentku"
                  data-testid="chat-message-input"
                  className="h-11 rounded-full border-[#E9CFC4] bg-white text-sm"
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!draft.trim() || send.isPending}
                  data-testid="chat-send-button"
                  aria-label="Odeslat zprávu"
                  className="gloss-hover size-11 shrink-0 rounded-full bg-gradient-to-br from-[#C99181] to-[#B8776A] text-white hover:from-[#C08272] hover:to-[#A96A5D]"
                >
                  <Send className="size-4" aria-hidden />
                </Button>
              </form>

              <p className="flex items-center justify-center gap-1.5 bg-white/70 pb-3 text-[10px] text-[#A98F84]">
                <SparkIcon className="size-3" aria-hidden />
                      Stella vidí skutečně volné termíny studia
              </p>
            </motion.section>
          </>
        )}
      </AnimatePresence>
    </>
  );
}
