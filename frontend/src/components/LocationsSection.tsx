// LocationsSection — každá provozovna má vlastní banner: adresa, rozklikávací
// ceník (ceny se liší podle provozovny) a rozklikávací mapa.
// Na hlavní stránce se tak nikde neukazují dvě různé ceny vedle sebe.

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { CalendarClock, ChevronDown, Clock, MapPin, Navigation } from "lucide-react";
import { GoldDust, GoldRule } from "@/components/GoldOrnament";
import { apiGet } from "@/lib/api";
import type { CurrentLocation, Location } from "@/types";
import { formatCzechDate } from "@/types";

function mapsEmbed(query: string): string {
  return `https://maps.google.com/maps?q=${encodeURIComponent(query)}&z=15&output=embed`;
}

function mapsLink(query: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`;
}

// Provozovny a ceníky jsou záměrně přímo na stránce: návštěvnice je tak vidí
// i v případě, že rezervační server zrovna není dostupný.
const STUDIO_LOCATIONS: Location[] = [
  {
    id: "krasna-lipa",
    name: "Krásná Lípa",
    address: "Varnsdorfská 89/52",
    city: "Krásná Lípa",
    maps_query: "Varnsdorfská 89/52, Krásná Lípa",
  },
  {
    id: "neratovice",
    name: "Neratovice",
    address: "Dr. E. Beneše 1184",
    city: "Neratovice",
    maps_query: "Dr. E. Beneše 1184, Neratovice",
  },
];

const PRICE_LISTS: Record<string, Array<{ name: string; duration: number; price: string }>> = {
  "krasna-lipa": [
    { name: "Nová modeláž", duration: 120, price: "650 Kč" },
    { name: "Doplnění", duration: 120, price: "530 Kč" },
    { name: "Gel lak", duration: 60, price: "580 Kč" },
    { name: "Manikúra", duration: 60, price: "400 Kč" },
    { name: "Pedikúra", duration: 60, price: "380 Kč" },
  ],
  neratovice: [
    { name: "Nová modeláž", duration: 120, price: "900 Kč" },
    { name: "Doplnění", duration: 120, price: "780 Kč" },
    { name: "Gel lak", duration: 60, price: "580 Kč" },
    { name: "Manikúra", duration: 60, price: "400 Kč" },
  ],
};

/** Úzký banner „tento týden pracujeme v…“ — vhodný hned pod hero. */
export function CurrentWeekBanner() {
  const currentQuery = useQuery({
    queryKey: ["current-location"],
    queryFn: () => apiGet<CurrentLocation>("/locations/current"),
  });
  const current = currentQuery.data ?? null;

  return (
    <div
      className="relative overflow-hidden rounded-[22px] border border-[#E0C6A8] bg-gradient-to-r from-[#FBF1EC] via-[#F7E7DC] to-[#F1E3D3] px-5 py-4 sm:px-7"
      data-testid="current-week-banner"
    >
      <GoldDust count={8} seed={11} />
      <div className="relative flex flex-wrap items-center gap-x-6 gap-y-2">
        <span className="flex items-center gap-2 text-[10px] tracking-[0.24em] text-[#A98F84] uppercase">
          <CalendarClock className="size-3.5 text-[#C08272]" aria-hidden />
          Tento týden pracujeme v
        </span>
        <span
          className="gold-text font-heading text-[1.35rem] tracking-[0.1em] uppercase"
          data-testid="current-week-location-name"
        >
          {current?.location?.name ?? "—"}
        </span>
        {current?.location && (
          <span className="text-sm text-[#6B4F45]">
            {current.location.address}, {current.location.city}
          </span>
        )}
        {current && (
          <span className="ml-auto text-[11px] text-[#A98F84]">
            {formatCzechDate(current.monday)} – {formatCzechDate(current.sunday)}
          </span>
        )}
      </div>
    </div>
  );
}

/** Rozklikávací panel se zlatým rámem. */
function Collapsible({
  label,
  openLabel,
  open,
  onToggle,
  testId,
  children,
}: {
  label: string;
  openLabel: string;
  open: boolean;
  onToggle: () => void;
  testId: string;
  children: React.ReactNode;
}) {
  return (
    <div className="border-t border-[#F1E2DA] pt-4">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        data-testid={`${testId}-toggle`}
        className="gloss-hover mx-6 mb-4 inline-flex items-center gap-2 rounded-full bg-[#8B9A85] px-5 py-3 text-left text-[11px] font-medium tracking-[0.12em] text-white uppercase shadow-[0_10px_20px_-14px_rgba(71,91,68,0.8)] transition-all duration-300 hover:-translate-y-0.5 hover:bg-[#7E8C78] focus-visible:ring-2 focus-visible:ring-[#C79A7B] focus-visible:ring-offset-2"
      >
        {open ? openLabel : label}
        <ChevronDown
          className={`size-4 text-white/90 transition-transform duration-500 ${
            open ? "rotate-180" : ""
          }`}
          aria-hidden
        />
      </button>
      <div
        className={`grid transition-[grid-template-rows,opacity] duration-500 ease-out ${
          open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"
        }`}
      >
        <div className="overflow-hidden">
          <div data-testid={`${testId}-panel`}>{children}</div>
        </div>
      </div>
    </div>
  );
}

/** Ceník jedné provozovny — otevírá se přímo nad její mapou. */
function LocationPricelist({ locationId }: { locationId: string }) {
  return (
    <ul className="px-6 pb-6" data-testid={`pricelist-${locationId}`}>
      {PRICE_LISTS[locationId].map((service) => (
        <li
          key={service.name}
          data-testid={`pricelist-${locationId}-${service.name}`}
          className="flex items-baseline gap-3 border-b border-dashed border-[#EFDCD4] py-3 last:border-b-0"
        >
          <span className="font-heading text-[1.05rem] text-[#5E4238]">{service.name}</span>
          <span className="flex items-center gap-1 text-[10px] tracking-[0.12em] text-[#A98F84] uppercase">
            <Clock className="size-3" aria-hidden />
            {service.duration} min
          </span>
          <span className="mx-2 h-px flex-1 bg-[#EFDCD4]" aria-hidden />
          <span className="gold-text font-heading text-[1.15rem] whitespace-nowrap">
            {service.price}
          </span>
        </li>
      ))}
    </ul>
  );
}

/** Sekce se dvěma samostatnými bannery provozoven. */
export default function LocationsSection() {
  const [openPrice, setOpenPrice] = useState<string | null>(null);
  const currentQuery = useQuery({
    queryKey: ["current-location"],
    queryFn: () => apiGet<CurrentLocation>("/locations/current"),
  });
  const currentId = currentQuery.data?.location?.id ?? null;

  return (
    <div className="grid gap-6 lg:grid-cols-2" data-testid="locations-grid">
      {STUDIO_LOCATIONS.map((loc) => {
        const active = loc.id === currentId;
        return (
          <article
            key={loc.id}
            data-testid={`location-card-${loc.id}`}
            className={`gold-frame relative overflow-hidden rounded-[26px] border bg-white/88 transition-all duration-500 hover:gold-frame-hover ${
              active ? "border-[#C08272]" : "border-[#EFDCD4]"
            }`}
          >
            {/* vlastní banner provozovny */}
            <div className="relative overflow-hidden bg-gradient-to-r from-[#FBF1EC] via-[#F7E7DC] to-[#F2E4D6] px-6 py-7 sm:px-8">
              <GoldDust count={8} seed={loc.id === "neratovice" ? 5 : 9} />
              <div className="relative flex flex-wrap items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] tracking-[0.26em] text-[#A98F84] uppercase">
                    Provozovna
                  </p>
                  <h3 className="mt-1.5 font-heading text-[1.7rem] tracking-[0.12em] text-[#5E4238] uppercase sm:text-[2rem]">
                    {loc.name}
                  </h3>
                  <p className="mt-2 flex items-center gap-2 text-sm text-[#6B4F45]">
                    <MapPin className="size-4 text-[#C08272]" aria-hidden />
                    {loc.address}, {loc.city}
                  </p>
                </div>
                {active && (
                  <span
                    className="animate-pulse-soft rounded-full border border-[#C08272]/50 bg-white/70 px-3 py-1 text-[10px] tracking-[0.16em] text-[#B8776A] uppercase"
                    data-testid={`location-active-badge-${loc.id}`}
                  >
                    Tento týden
                  </span>
                )}
              </div>
              <GoldRule className="mt-5 justify-start" />
            </div>

            {/* ceník na rozkliknutí */}
            <Collapsible
              label="Zobrazit ceník provozovny"
              openLabel="Skrýt ceník provozovny"
              open={openPrice === loc.id}
              onToggle={() => setOpenPrice(openPrice === loc.id ? null : loc.id)}
              testId={`location-pricelist-${loc.id}`}
            >
              {openPrice === loc.id && <LocationPricelist locationId={loc.id} />}
            </Collapsible>

            {/* mapa je vždy viditelná přímo pod ceníkem */}
            <div className="px-6 pb-6 pt-2">
              <div className="aspect-[4/3] w-full overflow-hidden rounded-[18px] border border-[#EFDCD4]">
                <iframe
                  src={mapsEmbed(loc.maps_query)}
                  title={`Mapa — ${loc.name}`}
                  loading="lazy"
                  className="size-full"
                  data-testid={`location-map-frame-${loc.id}`}
                />
              </div>
              <a
                href={mapsLink(loc.maps_query)}
                target="_blank"
                rel="noreferrer"
                data-testid={`location-directions-${loc.id}`}
                className="mt-4 inline-flex items-center gap-2 text-[11px] tracking-[0.16em] text-[#C08272] uppercase transition-colors duration-300 hover:text-[#8B9A85]"
              >
                <Navigation className="size-3.5" aria-hidden />
                Navigovat
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
