// SiteHeader — prémiová navigace: průhledná nad hero, po odscrollování
// zhutní do krémového pásu s indikátorem průběhu čtení.

import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import LogoBadge from "@/components/LogoBadge";

const ANCHORS = [
  { href: "#sluzby", label: "Služby", num: "02" },
  { href: "#kolekce", label: "Kolekce", num: "04" },
  { href: "#ai-studio", label: "AI design", num: "05" },
  { href: "#provozovny", label: "Provozovny", num: "06" },
  { href: "#recenze", label: "Recenze", num: "08" },
];

export default function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    const onScroll = () => {
      const y = window.scrollY;
      setScrolled(y > 40);
      const max = document.documentElement.scrollHeight - window.innerHeight;
      setProgress(max > 0 ? Math.min(1, y / max) : 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <header
      data-testid="site-header"
      className={`fixed inset-x-0 top-0 z-50 transition-all duration-500 ${
        scrolled
          ? "border-b border-[#EFDCD4] bg-[#FAF3EE]/88 backdrop-blur-xl"
          : "border-b border-transparent bg-transparent"
      }`}
    >
      <div
        className={`mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 transition-all duration-500 sm:gap-4 sm:px-8 ${
          scrolled ? "h-[4.5rem]" : "h-[5.5rem]"
        }`}
      >
        <a
          href="#hero"
          data-testid="nav-brand-logo"
          className="group flex items-center gap-3"
          aria-label="Studio M — domovská stránka"
        >
          <LogoBadge className="w-9 shrink-0 sm:w-12" testId="header-logo-badge" />
          <span className="hidden flex-col leading-none xs:flex">
            <span className="font-heading text-lg tracking-[0.22em] whitespace-nowrap sm:text-xl text-[#5E4238] uppercase">
              Studio M
            </span>
            <span className="font-script text-base text-[#B8776A]">krásné nehty na dosah ruky</span>
          </span>
        </a>

        <nav className="hidden items-center gap-6 lg:flex xl:gap-8" aria-label="Hlavní navigace">
          {ANCHORS.map((a) => (
            <a
              key={a.href}
              href={a.href}
              className="group relative flex items-baseline gap-1.5 text-[12px] tracking-[0.16em] text-[#8A7972] uppercase transition-colors duration-300 hover:text-[#C08272]"
            >
              <span className="font-mono text-[9px] text-[#C79A7B] opacity-60">{a.num}</span>
              {a.label}
              <span
                className="absolute -bottom-1.5 left-0 h-px w-0 bg-[#C08272] transition-[width] duration-400 group-hover:w-full"
                aria-hidden
              />
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-1.5 sm:gap-3">
          <LanguageSwitcher />
          <Link
            to="/admin"
            data-testid="nav-admin-portal-button"
            className="hidden text-[12px] tracking-[0.16em] text-[#A98F84] uppercase transition-colors duration-300 hover:text-[#C08272] md:block"
          >
            Správa
          </Link>
          <Button
            className="gloss-hover h-9 rounded-full bg-[#5E4238] px-3 text-xs text-white transition-transform duration-300 hover:-translate-y-0.5 hover:bg-[#4A3B34] sm:h-10 sm:px-4 sm:text-sm"
            render={
              <a href="#rezervace" data-testid="nav-book-appointment-button">
                <Sparkles className="size-4" aria-hidden />
                Objednat se
              </a>
            }
          />
        </div>
      </div>

      <div
        className="h-px origin-left bg-gradient-to-r from-[#C08272] to-[#A9B5A3] transition-transform duration-200"
        style={{ transform: `scaleX(${progress})` }}
        aria-hidden
      />
    </header>
  );
}
