// Home — prezentace Studia M podle dodané předlohy: fotokoláž v hero,
// kulaté logo, akvarelové menu karty, ceník s fotkami a drobnými tlačítky
// „PODROBNĚJI“. Ponechány jemné animace (aurora, běžící pás, nájezdy).

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "motion/react";
import {
  ArrowRight,
  Clock,
  Diamond,
  HeartHandshake,
  Play,
  ShieldCheck,
  Sparkles as SparkIcon,
  Star,
  Timer,
} from "lucide-react";
import BookingWizard from "@/components/BookingWizard";
import ChatAssistant from "@/components/ChatAssistant";
import { GoldCorners, GoldDust, GoldRule } from "@/components/GoldOrnament";
import LogoBadge from "@/components/LogoBadge";
import LocationsSection, { CurrentWeekBanner } from "@/components/LocationsSection";
import MenuCards from "@/components/MenuCards";
import NailCollection from "@/components/NailCollection";
import NailDesignStudio from "@/components/NailDesignStudio";
import NailPreview, {
  FINISH_LABELS,
  SHAPE_LABELS,
  type NailFinish,
  type NailShape,
} from "@/components/NailPreview";
import { Reveal } from "@/components/Reveal";
import Sparkles from "@/components/Sparkles";
import SiteFooter from "@/components/SiteFooter";
import SiteHeader from "@/components/SiteHeader";
import { Badge } from "@/components/ui/badge";
import { apiGet } from "@/lib/api";
import {
  GALLERY_PHOTOS,
  NAIL_PHOTOS,
  SERVICE_PHOTOS,
  SERVICE_PHOTO_FALLBACK,
  PROMO_VIDEO,
} from "@/lib/photos";
import type { Service } from "@/types";

// Připraveno pro pozdější spuštění po dodání finálních herních assetů.
// Kód zůstává v repozitáři, ale veřejně se nyní nevykresluje.
const SHOW_NAIL_GAME = false;

const FEATURES = [
  { icon: ShieldCheck, title: "Sterilně", sub: "a bezpečně" },
  { icon: Diamond, title: "Premium", sub: "materiály" },
  { icon: Timer, title: "Dlouhá", sub: "výdrž" },
  { icon: HeartHandshake, title: "Přístup", sub: "ke každé" },
];

const RIBBON = [
  "Gel lak s výdrží 4+ týdny",
  "Modeláž na míru",
  "Nail art bez kompromisu",
  "Online objednání bez volání",
  "AI návrh vašeho designu",
  "Sterilní nástroje",
];

const REVIEWS = [
  {
    author: "Tereza K.",
    service: "Gel lak",
    text: "Konečně nemusím nikam volat. Termín jsem měla vybraný za dvě minuty a nehty jsou pokaždé nádherné a drží přes měsíc bez jediného odštípnutí.",
  },
  {
    author: "Karolína M.",
    service: "Nová modeláž",
    text: "Jemná práce, krásné a čisté prostředí a výsledek přesně podle mé představy. Líbí se mi, že si styl můžu popsat předem.",
  },
  {
    author: "Michaela V.",
    service: "Manikúra",
    text: "Líbí se mi, že hned vidím volné časy a můžu se objednat i večer z mobilu. Studio M je moje srdcová záležitost.",
  },
];

const PROMOS = [
  {
    title: "První návštěva",
    value: "−5 %",
    text: "Na svou první novou modeláž nehtů u nás dostanete pětiprocentní slevu.",
  },
  {
    title: "Přiveď kamarádku",
    value: "2 × −5 %",
    text: "Přijďte spolu a pětiprocentní slevu dostanete obě — na jakoukoliv službu.",
  },
  {
    title: "Desátá návštěva",
    value: "Zdobení zdarma",
    text: "Při desáté návštěvě máte jedno zdobení nehtu navíc zcela zdarma.",
  },
];

/** Drobné šalvějové tlačítko podle předlohy. */
function SmallPill({
  children,
  onClick,
  testId,
  tone = "sage",
}: {
  children: React.ReactNode;
  onClick: () => void;
  testId: string;
  tone?: "sage" | "rose";
}) {
  const bg = tone === "sage" ? "bg-[#8B9A85] hover:bg-[#7E8C78]" : "bg-[#C08272] hover:bg-[#B8776A]";
  return (
    <button
      type="button"
      onClick={onClick}
      data-testid={testId}
      className={`gloss-hover inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-[11px] tracking-[0.16em] text-white uppercase transition-transform duration-300 hover:-translate-y-0.5 ${bg}`}
    >
      {children}
      <ArrowRight className="size-3" aria-hidden />
    </button>
  );
}

function Stars() {
  return (
    <div className="flex gap-0.5" aria-label="Hodnocení 4,8 z 5">
      {Array.from({ length: 5 }).map((_, i) => (
        <Star key={`star-${i}`} className="size-3.5 fill-[#C79A7B] text-[#C79A7B]" aria-hidden />
      ))}
    </div>
  );
}

function SectionTitle({ children, testId }: { children: string; testId?: string }) {
  return (
    <div className="flex flex-col items-center gap-3" data-testid={testId}>
      <h2 className="font-heading text-[1.5rem] tracking-[0.2em] text-[#6B4F45] uppercase sm:text-[1.95rem]">
        {children}
      </h2>
      <GoldRule />
    </div>
  );
}

export default function Home() {
  const [autoServiceId, setAutoServiceId] = useState<string | null>(null);
  const [chatOpen, setChatOpen] = useState(false);
  const [shape, setShape] = useState<NailShape>("mandle");
  const [finish, setFinish] = useState<NailFinish>("glazed");
  const [length, setLength] = useState<1 | 2 | 3>(2);
  const [accent, setAccent] = useState("#B8776A");
  const [decoration, setDecoration] = useState("Bez zdobení");

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => apiGet<Service[]>("/services"),
  });
  const services = servicesQuery.data ?? [];

  const pickService = (id: string) => {
    setAutoServiceId(id);
    document.getElementById("rezervace")?.scrollIntoView({ behavior: "smooth" });
  };

  const big = services.slice(0, 2);
  const small = services.slice(2);

  return (
    <div className="min-h-svh overflow-x-hidden bg-[#FAF3EE] text-[#4A3B34] antialiased">
      <SiteHeader />

      {/* ===== HERO — fotokoláž s centrálním claimem ===== */}
      <section id="hero" className="relative px-3 pt-20 sm:px-5 sm:pt-24">
        <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
          <div className="animate-aurora absolute -top-24 -left-20 size-[380px] rounded-full bg-[#F3D3C9] blur-[120px]" />
          <div className="animate-aurora absolute top-32 right-0 size-[320px] rounded-full bg-[#CFD8C8] blur-[130px] [animation-delay:-7s]" />
        </div>

        <div className="relative mx-auto max-w-6xl">
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
            className="gold-frame relative overflow-hidden rounded-[28px] border border-[#EFDCD4] bg-gradient-to-br from-[#F8E6E0] via-[#FBF1EC] to-[#EFE0D6] shadow-[0_30px_70px_-40px_rgba(74,59,52,0.4)]"
          >
            <Sparkles count={16} seed={2} color="#C79A7B" className="z-10" />
            <GoldDust count={14} seed={3} />
            <div className="grid items-stretch gap-0 lg:grid-cols-[1.05fr_1.5fr_1.05fr]">
              {/* levá fotka */}
              <div className="relative hidden min-h-[320px] lg:block">
                <img
                  src={NAIL_PHOTOS.heroLeft}
                  alt="Detail jemné pudrové manikúry"
                  className="absolute inset-0 size-full object-cover"
                  data-testid="hero-photo-left"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(90deg, transparent 55%, #FBF1EC 100%)" }}
                  aria-hidden
                />
              </div>

              {/* centrální claim */}
              <div className="flex flex-col items-center justify-center px-6 py-12 text-center sm:px-10 sm:py-16">
                <p className="font-heading text-[11px] tracking-[0.42em] text-[#A98F84] uppercase sm:text-sm">
                  Ideální manikúra
                </p>
                <h1 className="mt-4 font-heading text-[3.2rem] leading-[0.92] tracking-[0.06em] text-[#5E4238] uppercase sm:text-[4.7rem]">
                  Studio
                  <span className="mt-1 block text-[#C08272]">M</span>
                </h1>
                <p className="mt-4 font-script text-[1.7rem] text-[#B8776A] sm:text-4xl">
                  krásné nehty na dosah ruky ♥
                </p>

                {/* ikonové benefity jako v předloze */}
                <div
                  className="mt-8 grid w-full max-w-md grid-cols-4 gap-2"
                  data-testid="hero-feature-icons"
                >
                  {FEATURES.map((f) => (
                    <div key={f.title} className="group flex flex-col items-center gap-1.5 px-1">
                      <f.icon
                        className="size-6 text-[#C08272] transition-transform duration-500 group-hover:-translate-y-0.5"
                        strokeWidth={1.2}
                        aria-hidden
                      />
                      <p className="text-[11px] leading-tight tracking-[0.1em] text-[#6B4F45] uppercase">
                        {f.title}
                        <span className="block font-normal tracking-[0.06em] text-[#A98F84] normal-case">
                          {f.sub}
                        </span>
                      </p>
                    </div>
                  ))}
                </div>

                {/* box online objednání */}
                <div className="mt-8 w-full max-w-xs rounded-2xl border border-[#E5CFC6] bg-white/75 p-4 backdrop-blur-sm">
                  <p className="font-heading text-[12px] tracking-[0.2em] text-[#6B4F45] uppercase">
                    Online objednání
                    <span className="block text-[#A98F84]">bez čekání</span>
                  </p>
                  <div className="mt-3 flex justify-center">
                    <SmallPill onClick={() => setChatOpen(true)} testId="hero-cta-book-button">
                      Vybrat termín
                    </SmallPill>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      document.getElementById("rezervace")?.scrollIntoView({ behavior: "smooth" })
                    }
                    data-testid="hero-secondary-wizard-button"
                    className="mt-2.5 w-full text-[11px] tracking-[0.12em] text-[#A98F84] uppercase transition-colors duration-300 hover:text-[#C08272]"
                  >
                    nebo si vyberte sama v kalendáři
                  </button>
                </div>
              </div>

              {/* pravá fotka */}
              <div className="relative min-h-[260px] lg:min-h-[320px]">
                <img
                  src={NAIL_PHOTOS.heroRight}
                  alt="Modeláž nehtů s jemným zdobením"
                  className="absolute inset-0 size-full object-cover"
                  data-testid="hero-photo-right"
                />
                <div
                  className="absolute inset-0"
                  style={{ background: "linear-gradient(270deg, transparent 55%, #FBF1EC 100%)" }}
                  aria-hidden
                />
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* ===== BANNER AKTUÁLNÍHO TÝDNE ===== */}
      <div className="mx-auto mt-8 max-w-6xl px-3 sm:px-5">
        <Reveal>
          <CurrentWeekBanner />
        </Reveal>
      </div>

      {/* ===== BĚŽÍCÍ PÁS ===== */}
      <div
        className="relative mt-10 flex overflow-hidden border-y border-[#EADCD4] bg-[#F3E4DC] py-3"
        data-testid="ribbon-marquee"
      >
        {[0, 1].map((dup) => (
          <div key={`ribbon-${dup}`} className="animate-marquee flex shrink-0 items-center gap-10 pr-10">
            {RIBBON.map((item) => (
              <span
                key={item}
                className="flex items-center gap-10 text-[11px] tracking-[0.22em] whitespace-nowrap text-[#8A7972] uppercase"
              >
                {item}
                <SparkIcon className="size-3 text-[#C79A7B]" aria-hidden />
              </span>
            ))}
          </div>
        ))}
      </div>

      {/* ===== MENU STUDIA — logo + akvarelové karty ===== */}
      <section className="px-3 py-14 sm:px-5 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle testId="menu-section-title">Menu studia</SectionTitle>
          </Reveal>
          <div className="mt-10 grid items-center gap-10 lg:grid-cols-[0.8fr_2.4fr]">
            <Reveal className="mx-auto w-52 lg:w-full lg:max-w-[232px]">
              <div>
                <LogoBadge />
                <p className="mt-4 text-center text-[10px] tracking-[0.24em] text-[#A98F84] uppercase">
                  Logo studia
                </p>
              </div>
            </Reveal>
            <Reveal delay={0.1}>
              <MenuCards />
            </Reveal>
          </div>
        </div>
      </section>

      {/* ===== SLUŽBY — fotokarty bez cen (ceník je u provozovny) ===== */}
      <section id="sluzby" className="scroll-mt-24 px-3 pb-6 sm:px-5">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle testId="services-section-title">Naše služby</SectionTitle>
            <p className="mx-auto mt-4 max-w-xl text-center text-[0.95rem] leading-relaxed text-[#8A7972]">
              Vyberte si službu — ceník každé provozovny najdete v sekci
              „Kde nás najdete“ hned nad mapou.
            </p>
          </Reveal>

          {servicesQuery.isError && (
            <p
              className="mt-8 rounded-2xl border border-[#D98A80]/40 bg-[#F8E4E0] p-5 text-center text-sm text-[#A4463C]"
              data-testid="services-error"
            >
              Ceník se nepodařilo načíst — obnovte prosím stránku, nebo to zkuste za chvíli.
            </p>
          )}

          {/* dvě velké karty */}
          <div className="mt-10 grid gap-4 md:grid-cols-2">
            {big.map((service, i) => (
              <Reveal key={service.id} delay={0.06 * i}>
                <article
                  data-testid={`service-card-${service.id}`}
                  className="group relative h-[300px] overflow-hidden rounded-[22px] border border-[#EFDCD4] sm:h-[340px]"
                >
                  <img
                    src={SERVICE_PHOTOS[service.id] ?? SERVICE_PHOTO_FALLBACK}
                    alt={service.name}
                    className="absolute inset-0 size-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(251,241,236,0.15) 0%, rgba(248,230,224,0.55) 45%, rgba(244,219,210,0.92) 100%)",
                    }}
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-6 text-center">
                    <h3 className="font-heading text-[1.6rem] leading-tight tracking-[0.14em] text-[#5E4238] uppercase sm:text-[1.9rem]">
                      {service.name}
                    </h3>
                    <p className="mt-1 flex items-center gap-1.5 text-[11px] tracking-[0.12em] text-[#8A7972] uppercase">
                      <Clock className="size-3" aria-hidden /> {service.duration_min} min
                    </p>
                    <div className="mt-4">
                      <SmallPill
                        onClick={() => pickService(service.id)}
                        testId={`service-select-btn-${service.id}`}
                      >
                        Objednat
                      </SmallPill>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>

          {/* tři menší karty */}
          <div className="mt-4 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {small.map((service, i) => (
              <Reveal key={service.id} delay={0.06 * i}>
                <article
                  data-testid={`service-card-${service.id}`}
                  className="group relative h-[260px] overflow-hidden rounded-[22px] border border-[#EFDCD4]"
                >
                  <img
                    src={SERVICE_PHOTOS[service.id] ?? SERVICE_PHOTO_FALLBACK}
                    alt={service.name}
                    className="absolute inset-0 size-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.06]"
                  />
                  <div
                    className="absolute inset-0"
                    style={{
                      background:
                        "linear-gradient(180deg, rgba(251,241,236,0.1) 0%, rgba(248,230,224,0.5) 45%, rgba(244,219,210,0.94) 100%)",
                    }}
                    aria-hidden
                  />
                  <div className="absolute inset-x-0 bottom-0 flex flex-col items-center p-5 text-center">
                    <h3 className="font-heading text-[1.2rem] leading-tight tracking-[0.12em] text-[#5E4238] uppercase">
                      {service.name}
                    </h3>
                    <div className="mt-3">
                      <SmallPill
                        onClick={() => pickService(service.id)}
                        testId={`service-select-btn-${service.id}`}
                      >
                        Objednat
                      </SmallPill>
                    </div>
                  </div>
                </article>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== GALERIE UKÁZEK ===== */}
      <section id="galerie" className="scroll-mt-24 px-3 py-16 sm:px-5 sm:py-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle testId="gallery-section-title">Ukázky prací</SectionTitle>
            <p className="mx-auto mt-4 max-w-xl text-center text-[0.95rem] leading-relaxed text-[#8A7972]">
              Každá modeláž je originál — od jemné nude klasiky po zdobení, které
              vydrží celé týdny.
            </p>
          </Reveal>
          <Reveal delay={0.08}>
            <div className="mt-10 grid grid-cols-2 gap-3 md:grid-cols-4" data-testid="gallery-grid">
              {GALLERY_PHOTOS.map((photo, i) => (
                <figure
                  key={photo.src}
                  className={`group relative overflow-hidden rounded-[20px] border border-[#EFDCD4] ${
                    i % 2 === 1 ? "md:mt-8" : ""
                  }`}
                  data-testid={`gallery-photo-${i + 1}`}
                >
                  <img
                    src={photo.src}
                    alt={photo.alt}
                    className="aspect-[3/4] size-full object-cover transition-transform duration-[900ms] group-hover:scale-[1.07]"
                  />
                  <figcaption
                    className="absolute inset-x-0 bottom-0 translate-y-2 p-3 text-[10px] tracking-[0.14em] text-white uppercase opacity-0 transition-all duration-500 group-hover:translate-y-0 group-hover:opacity-100"
                    style={{
                      background: "linear-gradient(0deg, rgba(74,59,52,0.72) 0%, transparent 100%)",
                    }}
                  >
                    {photo.alt}
                  </figcaption>
                </figure>
              ))}
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== NENÁPADNÉ PROMO VIDEO ===== */}
      <section className="px-3 pb-16 sm:px-5 sm:pb-20" aria-label="Ukázka práce">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="grid items-center gap-6 rounded-[24px] border border-[#EFDCD4] bg-[#F7E9E3] p-4 shadow-[0_24px_60px_-42px_rgba(74,59,52,0.45)] sm:grid-cols-[0.9fr_1.1fr] sm:p-5">
              <div className="px-2 py-3 sm:px-4">
                <p className="font-heading text-[10px] tracking-[0.32em] text-[#A98F84] uppercase">
                  Studio M · krátká ukázka
                </p>
                <h2 className="mt-3 font-heading text-2xl tracking-[0.04em] text-[#5E4238] uppercase sm:text-3xl">
                  Ukázka práce
                </h2>
                <p className="mt-3 max-w-md text-[0.95rem] leading-relaxed text-[#7D675E]">
                  Detailní záběry našich modeláží a nail artu. Video se přehrává potichu,
                  aby nerušilo prohlížení webu.
                </p>
                <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-[#D7B7A9] bg-white/60 px-4 py-2 text-[11px] tracking-[0.14em] text-[#8A6458] uppercase">
                  <Play className="size-3.5 fill-current" aria-hidden />
                  Studio M
                </div>
              </div>
              <div className="overflow-hidden rounded-[18px] border border-[#EFDCD4] bg-[#EAD7CF]">
                <video
                  className="aspect-video size-full object-cover"
                  src={PROMO_VIDEO}
                  autoPlay
                  muted
                  loop
                  playsInline
                  preload="metadata"
                  aria-label="Krátká ukázka práce Studia M"
                />
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ===== 3D FLORAL KOLEKCE (vystřižené nehty klientky) ===== */}
      <section id="kolekce" className="relative scroll-mt-24 px-3 pb-16 sm:px-5 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle testId="collection-section-title">3D floral kolekce</SectionTitle>
            <p className="mx-auto mt-4 max-w-xl text-center text-[0.95rem] leading-relaxed text-[#8A7972]">
              Naše nejoblíbenější zdobení do posledního detailu — 3D kvítky, perleť
              a ručně malované zlaté větvičky. Najeďte myší a pás se zastaví.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-6">
            <NailCollection />
          </Reveal>
        </div>
      </section>

      {/* ===== AI STUDIO — dočasně skryto, herní návrhář je připravený v repozitáři ===== */}
      {SHOW_NAIL_GAME && <section id="ai-studio" className="scroll-mt-24 bg-[#F3E4DC] px-3 py-16 sm:px-5 sm:py-20">
        <div className="mx-auto grid max-w-6xl items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <p className="font-heading text-[10px] tracking-[0.32em] text-[#A98F84] uppercase">
              Studio návrhu nehtů
            </p>
            <h2 className="mt-4 font-heading text-3xl leading-tight tracking-[0.04em] text-[#5E4238] uppercase sm:text-4xl">
              Popište, co si přejete
            </h2>
            <p className="mt-2 font-script text-2xl text-[#B8776A]">
              a my to uvidíme dřív, než přijdete
            </p>
            <GoldRule className="mt-5 justify-start" />
            <p className="mt-5 max-w-lg text-[0.95rem] leading-relaxed text-[#6B4F45]">
              Vyberte si tvar, délku, barvu a ozdoby jako v profesionálním nail baru.
              Asistentka potom předá vaše zadání nail artistovi, který připraví
              fotorealistický náhled přímo k vašemu termínu.
            </p>
            <ol className="mt-7 space-y-3" data-testid="ai-studio-steps">
              {[
                "Vyberete barvy, tvar, délku, efekt i ozdoby",
                "Asistentka připraví přesné zadání",
                "Nail artista vytvoří náhled nehtů",
                "Návrh máme připravený u vašeho termínu",
              ].map((text, i) => (
                <li key={text} className="flex items-start gap-3 text-sm text-[#6B4F45]">
                  <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-[#C79A7B]/60 font-heading text-[11px] text-[#C08272]">
                    {i + 1}
                  </span>
                  {text}
                </li>
              ))}
            </ol>
            <div className="mt-7">
              <SmallPill
                onClick={() =>
                  document.getElementById("rezervace")?.scrollIntoView({ behavior: "smooth" })
                }
                testId="ai-studio-cta-button"
                tone="rose"
              >
                Zkusit při rezervaci
              </SmallPill>
            </div>
          </Reveal>

          <Reveal delay={0.1}>
            <div className="rounded-[26px] border border-[#E5CFC6] bg-[#FBF1EC] p-5 sm:p-7">
              <NailDesignStudio />
              <NailPreview
                shape={shape}
                finish={finish}
                length={length}
                className="hidden h-[300px] w-full sm:h-[340px]"
              />
              <div className="pointer-events-none -mt-14 relative hidden justify-center gap-2" aria-hidden>
                {Array.from({ length: 5 }).map((_, i) => <span key={i} className="h-6 w-4 rounded-t-full border border-white/70 shadow-sm" style={{ backgroundColor: accent, transform: `rotate(${(i - 2) * 7}deg)` }} />)}
              </div>
              <div className="mt-6 hidden space-y-4" data-testid="ai-studio-controls">
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-[#A98F84] uppercase">Barva</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["#B8776A", "#E9B0A6", "#F6E3D9", "#A5B19E", "#5E4238", "#C79A7B", "#B4544A", "#7C6FB1", "#4F7791", "#F2C94C", "#FFFFFF", "#222222"].map((color) => <button key={color} type="button" aria-label={`Barva ${color}`} onClick={() => setAccent(color)} className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${accent === color ? "border-[#5E4238] ring-2 ring-[#C79A7B]/40" : "border-white"}`} style={{ backgroundColor: color }} />)}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-[#A98F84] uppercase">Tvar</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(Object.keys(SHAPE_LABELS) as NailShape[]).map((s) => (
                      <button
                        key={s}
                        type="button"
                        onClick={() => setShape(s)}
                        data-testid={`shape-option-${s}`}
                        className={`rounded-full border px-3 py-1 text-[11px] transition-all duration-300 ${
                          shape === s
                            ? "border-[#C08272] bg-[#C08272] text-white"
                            : "border-[#E5CFC6] bg-white text-[#6B4F45] hover:border-[#C08272]/60"
                        }`}
                      >
                        {SHAPE_LABELS[s]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-[#A98F84] uppercase">Finiš</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {(Object.keys(FINISH_LABELS) as NailFinish[]).map((f) => (
                      <button
                        key={f}
                        type="button"
                        onClick={() => setFinish(f)}
                        data-testid={`finish-option-${f}`}
                        className={`rounded-full border px-3 py-1 text-[11px] transition-all duration-300 ${
                          finish === f
                            ? "border-[#8B9A85] bg-[#8B9A85] text-white"
                            : "border-[#E5CFC6] bg-white text-[#6B4F45] hover:border-[#8B9A85]/60"
                        }`}
                      >
                        {FINISH_LABELS[f]}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-[#A98F84] uppercase">Zdobení</p>
                  <div className="mt-2 flex flex-wrap gap-2">
                    {["Bez zdobení", "Kamínky", "3D květiny", "Mašličky", "Mušličky", "Hvězdičky", "Srdíčka", "Malůvky"].map((item) => <button key={item} type="button" onClick={() => setDecoration(item)} className={`rounded-full border px-3 py-1 text-[11px] ${decoration === item ? "border-[#C79A7B] bg-[#C79A7B] text-white" : "border-[#E5CFC6] bg-white text-[#6B4F45]"}`}>{item}</button>)}
                  </div>
                </div>
                <div>
                  <p className="text-[10px] tracking-[0.2em] text-[#A98F84] uppercase">Délka</p>
                  <div className="mt-2 flex gap-2">
                    {([1, 2, 3] as const).map((l) => (
                      <button
                        key={l}
                        type="button"
                        onClick={() => setLength(l)}
                        data-testid={`length-option-${l}`}
                        className={`h-7 w-9 rounded-lg border text-[11px] transition-all duration-300 ${
                          length === l
                            ? "border-[#C79A7B] bg-[#C79A7B] text-white"
                            : "border-[#E5CFC6] bg-white text-[#6B4F45] hover:border-[#C79A7B]/60"
                        }`}
                      >
                        {l}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>}

      {/* ===== PROVOZOVNY ===== */}
      <section id="provozovny" className="scroll-mt-24 px-3 pb-16 sm:px-5 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle testId="locations-section-title">Kde nás najdete</SectionTitle>
            <p className="mx-auto mt-4 max-w-xl text-center text-[0.95rem] leading-relaxed text-[#8A7972]">
              Pracuje u nás jedna technička, Martina — jeden týden v Krásné Lípě,
              druhý v Neratovicích. Aktuální týden je vždy zvýrazněný.
            </p>
          </Reveal>
          <Reveal delay={0.08} className="mt-10">
            <LocationsSection />
          </Reveal>
        </div>
      </section>

      {/* ===== REZERVACE ===== */}
      <section id="rezervace" className="scroll-mt-24 px-3 py-16 sm:px-5 sm:py-20">
        <div className="mx-auto max-w-4xl">
          <Reveal>
            <SectionTitle testId="booking-section-title">Objednání online</SectionTitle>
            <p className="mx-auto mt-4 max-w-xl text-center text-[0.95rem] leading-relaxed text-[#8A7972]">
              Čtyři kroky, žádné volání. Návrh designu nehtů za vás připraví naši
              AI agenti — rovnou k vašemu termínu.
            </p>
          </Reveal>
          <Reveal delay={0.1} className="mt-10">
            <BookingWizard autoServiceId={autoServiceId} />
          </Reveal>
        </div>
      </section>

      {/* ===== RECENZE ===== */}
      <section id="recenze" className="scroll-mt-24 px-3 pb-16 sm:px-5 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle testId="reviews-section-title">Recenze klientek</SectionTitle>
            <div className="mt-5 flex justify-center">
              <Badge
                variant="outline"
                className="gap-2 rounded-full border-[#D9BFB2] bg-white/70 px-4 py-2 text-[#6B4F45]"
              >
                <Stars />
                4,8 / 5 z více než 50 recenzí
              </Badge>
            </div>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3">
            {REVIEWS.map((review, i) => (
              <Reveal key={review.author} delay={0.08 * i} className={i === 1 ? "md:mt-8" : ""}>
                <figure className="flex h-full flex-col rounded-[22px] border border-[#EFDCD4] bg-white p-6 transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_22px_44px_-26px_rgba(74,59,52,0.35)]">
                  <Stars />
                  <blockquote className="mt-3 flex-1 font-heading text-base leading-relaxed text-[#5E4238]">
                    „{review.text}“
                  </blockquote>
                  <figcaption className="mt-5 flex items-center justify-between gap-3 border-t border-[#F1E2DA] pt-4">
                    <span className="text-sm font-medium text-[#5E4238]">{review.author}</span>
                    <span className="text-[10px] tracking-[0.12em] text-[#A98F84] uppercase">
                      {review.service}
                    </span>
                  </figcaption>
                </figure>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== AKCE A SLEVY ===== */}
      <section id="akce" className="scroll-mt-24 px-3 pb-16 sm:px-5 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <SectionTitle testId="promos-section-title">Akce a slevy</SectionTitle>
          </Reveal>
          <div className="mt-10 grid gap-4 md:grid-cols-3" data-testid="promos-grid">
            {PROMOS.map((promo, i) => (
              <Reveal key={promo.title} delay={0.07 * i}>
                <div
                  className="watercolor group h-full rounded-[22px] border border-dashed border-[#D9BFB2] bg-gradient-to-br from-[#FBF1EC] to-[#F3E0D8] p-6 text-center transition-all duration-300 hover:-translate-y-1"
                  data-testid={`promo-card-${i + 1}`}
                >
                  <p className="font-heading text-3xl text-[#C08272] transition-transform duration-500 group-hover:-translate-y-0.5">
                    {promo.value}
                  </p>
                  <h3 className="mt-2 font-heading text-sm tracking-[0.16em] text-[#5E4238] uppercase">
                    {promo.title}
                  </h3>
                  <p className="mt-2 text-sm leading-relaxed text-[#8A7972]">{promo.text}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </div>
      </section>

      {/* ===== CTA pás ===== */}
      <section className="px-3 pb-16 sm:px-5 sm:pb-20">
        <div className="mx-auto max-w-6xl">
          <Reveal>
            <div className="relative overflow-hidden rounded-[26px] border border-[#EFDCD4]">
              <img
                src={NAIL_PHOTOS.gelLak}
                alt="Matná nude modeláž mandlových nehtů"
                className="absolute inset-0 size-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{
                  background:
                    "linear-gradient(180deg, rgba(251,241,236,0.72) 0%, rgba(244,219,210,0.92) 100%)",
                }}
                aria-hidden
              />
              <Sparkles count={14} seed={6} color="#C08272" />
              <GoldDust count={12} seed={7} />
              <GoldCorners />
              <div className="relative px-8 py-14 text-center sm:px-14">
                <SparkIcon className="mx-auto size-6 text-[#C08272]" strokeWidth={1.2} aria-hidden />
                <h2 className="mt-4 font-heading text-2xl tracking-[0.1em] text-[#5E4238] uppercase sm:text-3xl">
                  Termín, popis i návrh za dvě minuty
                </h2>
                <p className="mx-auto mt-3 max-w-lg text-sm leading-relaxed text-[#6B4F45]">
                  Rezervujte si online svůj čas ve Studiu M a nechte AI asistentku
                  Kláru připravit návrh vašich vysněných nehtů.
                </p>
                <div className="mt-7 flex justify-center">
                  <SmallPill onClick={() => setChatOpen(true)} testId="bottom-cta-book-button">
                    Vybrat termín
                  </SmallPill>
                </div>
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      <SiteFooter />

      <ChatAssistant open={chatOpen} onOpenChange={setChatOpen} />
    </div>
  );
}
