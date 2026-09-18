// MenuCards — „MENU STUDIA“: pět akvarelových karet jako v předloze.
// Akvarelový efekt je čistě CSS (gradienty + jemné vrstvy), žádné fotky.

import { Gift, Heart, Images, Sparkles, Tag } from "lucide-react";

const CARDS = [
  {
    id: "cenik",
    icon: Tag,
    title: "CENÍK",
    sub: "na služby",
    target: "#provozovny",
    bg: "radial-gradient(circle at 15% 10%, rgba(255,255,255,.42) 0 2%, transparent 2.5%), linear-gradient(160deg, #E9B0A6 0%, #DFA096 55%, #EAC3B9 100%)",
    ink: "#FFFFFF",
  },
  {
    id: "ukazky",
    icon: Images,
    title: "UKÁZKY",
    sub: "prací",
    target: "#galerie",
    bg: "radial-gradient(circle at 85% 13%, rgba(255,255,255,.35) 0 2%, transparent 2.5%), linear-gradient(160deg, #BBC1B2 0%, #9EA999 55%, #B8BCAA 100%)",
    ink: "#FFFFFF",
  },
  {
    id: "recenze",
    icon: Heart,
    title: "RECENZE",
    sub: "klientek",
    target: "#recenze",
    bg: "radial-gradient(circle at 14% 15%, rgba(209,162,132,.25) 0 2%, transparent 2.5%), linear-gradient(160deg, #FFF8F1 0%, #F4E2D7 58%, #F8EAE1 100%)",
    ink: "#6B4F45",
  },
  {
    id: "objednani",
    icon: Sparkles,
    title: "OBJEDNÁNÍ",
    sub: "online",
    target: "#rezervace",
    bg: "radial-gradient(circle at 80% 16%, rgba(255,255,255,.35) 0 2%, transparent 2.5%), linear-gradient(160deg, #EAB0A6 0%, #D9958B 55%, #E5AAA0 100%)",
    ink: "#FFFFFF",
  },
  {
    id: "akce",
    icon: Gift,
    title: "AKCE",
    sub: "a slevy",
    target: "#akce",
    bg: "radial-gradient(circle at 18% 12%, rgba(255,255,255,.55) 0 2%, transparent 2.5%), linear-gradient(160deg, #FFF7F0 0%, #EFD9CB 55%, #F8E8DD 100%)",
    ink: "#6B4F45",
  },
];

export default function MenuCards() {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5" data-testid="studio-menu-cards">
      {CARDS.map((card) => (
        <a
          key={card.id}
          href={card.target}
          data-testid={`menu-card-${card.id}`}
          className="watercolor gloss-hover group relative flex aspect-[.62] flex-col items-center justify-end overflow-hidden rounded-[22px] p-4 text-center shadow-[0_12px_28px_-20px_rgba(74,59,52,.45)] transition-all duration-500 hover:-translate-y-1.5 hover:shadow-[0_24px_46px_-22px_rgba(74,59,52,0.45)] sm:rounded-[26px] sm:p-5"
          style={{ background: card.bg, color: card.ink }}
        >
          {/* jemný zlatý obrys a botanický ornament jako v předloze */}
          <span
            className="pointer-events-none absolute inset-2 rounded-[17px] border border-dashed opacity-55"
            style={{ borderColor: card.ink === "#FFFFFF" ? "rgba(255,255,255,0.75)" : "rgba(199,154,123,0.8)" }}
            aria-hidden
          />
          <span className="pointer-events-none absolute -bottom-3 -left-2 text-5xl leading-none opacity-25" aria-hidden>❦</span>
          <span className="pointer-events-none absolute -top-2 -right-1 text-4xl leading-none opacity-20" aria-hidden>✦</span>
          <card.icon
            className="mb-auto mt-3 size-10 transition-transform duration-500 group-hover:scale-110 sm:size-12"
            strokeWidth={1.05}
            aria-hidden
          />
          <p className="font-heading text-sm tracking-[0.12em] sm:text-base">{card.title}</p>
          <p className="mt-1 text-[10px] tracking-[0.1em] opacity-85 sm:text-[11px]">{card.sub}</p>
          <span className="mt-3 text-sm opacity-80" aria-hidden>
            ♥
          </span>
        </a>
      ))}
    </div>
  );
}
