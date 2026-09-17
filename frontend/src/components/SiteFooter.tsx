// SiteFooter — patička v pudrové paletě s kontaktem, hodinami a správou.

import { Link } from "react-router-dom";
import { Instagram, Mail, MapPin, Phone } from "lucide-react";
import LogoBadge from "@/components/LogoBadge";

export default function SiteFooter() {
  return (
    <footer className="border-t border-[#EFDCD4] bg-[#F3E4DC] text-[#5E4238]">
      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-16 sm:px-8 md:grid-cols-[0.7fr_1fr_1fr]">
        <div>
          <LogoBadge className="w-40" testId="footer-logo-badge" />
        </div>

        <div>
          <p className="font-heading text-[10px] tracking-[0.26em] text-[#A98F84] uppercase">
            Kontakt
          </p>
          <ul className="mt-4 space-y-3 text-sm text-[#6B4F45]" data-testid="footer-contact">
            <li className="flex items-start gap-2.5">
              <MapPin className="mt-0.5 size-4 shrink-0 text-[#C08272]" aria-hidden />
              <span>
                Varnsdorfská 89/52, Krásná Lípa
                <span className="block">Dr. E. Beneše 1184, Neratovice</span>
              </span>
            </li>
            <li className="flex items-center gap-2.5">
              <Phone className="size-4 text-[#C08272]" aria-hidden />
              <a href="tel:+420777575796" className="transition-colors duration-300 hover:text-[#C08272]">
                777 575 796
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Mail className="size-4 text-[#C08272]" aria-hidden />
              <a
                href="mailto:martina.holankova@email.cz"
                className="break-all transition-colors duration-300 hover:text-[#C08272]"
              >
                martina.holankova@email.cz
              </a>
            </li>
            <li className="flex items-center gap-2.5">
              <Instagram className="size-4 text-[#C08272]" aria-hidden />
              @studio.m.nails
            </li>
          </ul>
          <p className="mt-4 text-xs leading-relaxed text-[#8A7972]">
            Martina Holánková · IČO 63854023
            <span className="block">
              Jedna technička, dvě provozovny — střídají se po týdnech.
            </span>
          </p>
        </div>

        <div>
          <p className="font-heading text-[10px] tracking-[0.26em] text-[#A98F84] uppercase">
            Otevírací doba
          </p>
          <ul className="mt-4 space-y-2 text-sm text-[#6B4F45]">
            <li className="flex justify-between gap-6">
              <span>Pondělí – pátek</span>
              <span className="text-[#5E4238]">9:00 – 19:00</span>
            </li>
            <li className="flex justify-between gap-6">
              <span>Sobota</span>
              <span className="text-[#5E4238]">9:00 – 18:00</span>
            </li>
            <li className="flex justify-between gap-6">
              <span>Neděle</span>
              <span className="text-[#C08272]">Zavřeno</span>
            </li>
          </ul>
          <p className="mt-5 text-sm leading-relaxed text-[#8A7972]">
            Online objednání je dostupné nepřetržitě — termín vyberete i večer z mobilu.
          </p>
        </div>
      </div>

      <div className="border-t border-[#E6D2CA]">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-3 px-5 py-6 text-[11px] text-[#A98F84] sm:flex-row sm:px-8">
          <p>© {new Date().getFullYear()} Studio M · Martina Holánková, IČO 63854023</p>
          <p>Objednávkový systém s AI asistencí</p>
          <Link to="/obchodni-podminky" className="transition-colors duration-300 hover:text-[#C08272]">
            Obchodní podmínky
          </Link>
          <Link to="/kontakt" className="transition-colors duration-300 hover:text-[#C08272]">
            Kontakt
          </Link>
          <Link
            to="/admin"
            className="transition-colors duration-300 hover:text-[#C08272]"
            data-testid="footer-admin-link"
          >
            Správa rezervací
          </Link>
        </div>
      </div>
    </footer>
  );
}
