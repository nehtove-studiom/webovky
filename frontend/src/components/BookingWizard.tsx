// BookingWizard — 4-krokový průvodce rezervací:
// 1) výběr služby → 2) datum + volný čas → 3) kontakt → 4) potvrzení + AI návrh designu.

import { useEffect, useState } from "react";
import { useMutation, useQuery } from "@tanstack/react-query";
import { toast } from "sonner";
import { format } from "date-fns";
import { cs } from "date-fns/locale";
import { CalendarDays, CheckCircle2, Clock, Sparkles } from "lucide-react";
import { ApiError, apiGet, apiPost } from "@/lib/api";
import type { Availability, Booking, Service } from "@/types";
import { formatCzechDate } from "@/types";
import { AiPipeline } from "@/components/AiPipeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

const STEP_NAMES = ["Služba", "Termín", "Kontakt", "Návrh"];
const PROCESSING = ["prompt", "image", "calendar"];

function czechError(error: unknown, fallback: string): string {
  if (error instanceof ApiError) {
    const detail = (error.body as { detail?: unknown } | null)?.detail;
    if (typeof detail === "string") return detail;
  }
  return fallback;
}

export default function BookingWizard({ autoServiceId }: { autoServiceId: string | null }) {
  const [step, setStep] = useState(1);
  const [serviceId, setServiceId] = useState<string | null>(null);
  const [locationId, setLocationId] = useState<string | null>(null);
  const [date, setDate] = useState<Date | undefined>(undefined);
  const [time, setTime] = useState<string | null>(null);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [bookingId, setBookingId] = useState<string | null>(null);
  const [designSent, setDesignSent] = useState(false);
  const [designText, setDesignText] = useState("");
  const [designShape, setDesignShape] = useState("mandlový");
  const [designLength, setDesignLength] = useState("střední");
  const [designFinish, setDesignFinish] = useState("lesklý");
  const [designColor, setDesignColor] = useState("pudrově růžová");
  const [designDecoration, setDesignDecoration] = useState("bez zdobení");

  // Výběr služby z ceníku přeskočí rovnou na krok s termínem.
  useEffect(() => {
    if (autoServiceId) {
      setServiceId(autoServiceId);
      setStep(2);
    }
  }, [autoServiceId]);

  const servicesQuery = useQuery({
    queryKey: ["services"],
    queryFn: () => apiGet<Service[]>("/services"),
  });
  const services = servicesQuery.data ?? [];
  const selectedService = services.find((s) => s.id === serviceId) ?? null;

  const dateStr = date ? format(date, "yyyy-MM-dd") : "";
  const availabilityQuery = useQuery({
    queryKey: ["availability", dateStr],
    queryFn: () => apiGet<Availability>(`/availability?date=${dateStr}`),
    enabled: step >= 2 && !!dateStr,
  });
  const availability = availabilityQuery.data ?? null;

  const bookingQuery = useQuery({
    queryKey: ["booking", bookingId],
    queryFn: () => apiGet<Booking>(`/bookings/${bookingId}`),
    enabled: !!bookingId,
    refetchInterval: (query) =>
      query.state.data && PROCESSING.includes(query.state.data.pipeline_status) ? 2500 : false,
  });
  const booking = bookingQuery.data ?? null;

  const createBooking = useMutation({
    mutationFn: () =>
      apiPost<Booking>("/bookings", {
        service_id: serviceId,
        location_id: locationId,
        date: dateStr,
        time,
        name,
        phone,
        email: email.trim() ? email.trim() : null,
      }),
    onSuccess: (created) => {
      setBookingId(created.id);
      setStep(4);
      toast.success("Rezervace vytvořena! Termín jsme připravili pro Studio M.");
    },
    onError: (error) =>
      toast.error(czechError(error, "Rezervaci se nepodařilo vytvořit. Zkuste to prosím znovu.")),
  });

  const submitDesign = useMutation({
    mutationFn: (description: string) =>
      apiPost<Booking>(`/bookings/${bookingId}/design`, { design_description: description }),
    onSuccess: () => {
      setDesignSent(true);
      toast.success("Asistentka a nail artista se ujali vašeho návrhu!");
    },
    onError: (error) =>
      toast.error(czechError(error, "Návrh se nepodařilo odeslat. Zkuste to prosím znovu.")),
  });

  const approveDesign = useMutation({
    mutationFn: () => apiPost<Booking>(`/bookings/${bookingId}/approve-design`, {}),
    onSuccess: () => {
      void bookingQuery.refetch();
      toast.success("Návrh jsme přiložili k vašemu termínu.");
    },
    onError: (error) =>
      toast.error(czechError(error, "Návrh se zatím nepodařilo uložit ke kalendáři.")),
  });

  const pipelineRunning = booking ? PROCESSING.includes(booking.pipeline_status) : false;

  const reset = () => {
    setStep(1);
    setServiceId(null);
    setLocationId(null);
    setDate(undefined);
    setTime(null);
    setName("");
    setPhone("");
    setEmail("");
    setBookingId(null);
    setDesignSent(false);
    setDesignText("");
  };

  const contactValid = name.trim().length >= 2 && phone.trim().length >= 6 && !!serviceId && !!time && !!dateStr;
  const showPipeline = !!booking && (designSent || booking.pipeline_status !== "none");
  const makeDesignDescription = () => `${designShape} tvar, ${designLength} délka, ${designColor}, ${designFinish} finiš, ${designDecoration}. ${designText.trim()}`.trim();

  return (
    <div
      className="overflow-hidden rounded-3xl border border-[#EFDCD4] bg-white shadow-[0_30px_80px_-40px_rgba(28,25,23,0.25)]"
      data-testid="online-booking-wizard"
    >
      {/* indikátor kroků */}
      <div className="border-b border-[#EFDCD4] bg-[#F8EAE3]/60 px-6 py-5 sm:px-10">
        <div className="flex items-center justify-between gap-2" data-testid="booking-steps-indicator">
          {STEP_NAMES.map((label, i) => {
            const n = i + 1;
            const reached = step >= n;
            return (
              <div key={label} className="flex flex-1 items-center gap-2 last:flex-none">
                <span
                  className={`flex size-8 shrink-0 items-center justify-center rounded-full text-sm font-medium transition-colors duration-300 ${
                    reached ? "bg-[#C08272] text-white" : "bg-white text-[#8A7972] border border-[#EFDCD4]"
                  }`}
                >
                  {n}
                </span>
                <span className={`hidden text-sm sm:block ${reached ? "text-[#5E4238]" : "text-[#8A7972]"}`}>{label}</span>
                {n < STEP_NAMES.length && <span className="mx-1 h-px flex-1 bg-[#EFDCD4]" aria-hidden />}
              </div>
            );
          })}
        </div>
      </div>

      <div className="px-6 py-8 sm:px-10">
        {/* KROK 1 — služba */}
        {step === 1 && (
          <div data-testid="booking-step-service-selector">
            <h3 className="font-heading text-2xl text-[#5E4238]">Vyberte službu</h3>
            <p className="mt-1 text-sm text-[#8A7972]">Na co se dnes těšíte?</p>
            {servicesQuery.isError && (
              <p className="mt-4 rounded-xl border border-[#B4544A]/25 bg-[#B4544A]/5 p-4 text-sm text-[#B4544A]">
                Ceník se nepodařilo načíst. Obnovte prosím stránku nebo to zkuste za chvíli.
              </p>
            )}
            <div className="mt-5 grid gap-3 sm:grid-cols-2">
              {services.map((s) => {
                const selected = serviceId === s.id;
                return (
                  <button
                    key={s.id}
                    type="button"
                    data-testid={`service-option-${s.id}`}
                    onClick={() => setServiceId(s.id)}
                    className={`rounded-2xl border p-4 text-left transition-all duration-300 hover:-translate-y-0.5 hover:shadow-[0_14px_30px_-18px_rgba(28,25,23,0.4)] ${
                      selected ? "border-[#C08272] ring-1 ring-[#C08272]" : "border-[#EFDCD4] bg-white"
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-medium text-[#5E4238]">{s.name}</span>
                      <Badge variant="secondary">{s.tag}</Badge>
                    </div>
                    <p className="mt-1 text-xs text-[#8A7972]">{s.description}</p>
                    <p className="mt-2 text-xs text-[#8A7972]">Délka služby: {s.duration_min} min</p>
                  </button>
                );
              })}
            </div>
            {serviceId && <div className="mt-5"><p className="text-[10px] tracking-[.18em] text-[#A98F84] uppercase">Vyberte provozovnu</p><div className="mt-2 flex flex-wrap gap-2">{[["neratovice","Neratovice"],["krasna-lipa","Krásná Lípa"]].map(([id,label]) => <button key={id} type="button" onClick={() => setLocationId(id)} className={`rounded-full px-4 py-2 text-sm ${locationId === id ? "bg-[#8B9A85] text-white" : "border border-[#E5CFC6] bg-white text-[#5E4238]"}`}>{label}</button>)}</div></div>}
            <div className="mt-6 flex justify-end">
              <Button disabled={!serviceId || !locationId} onClick={() => setStep(2)} data-testid="wizard-continue-to-date-button">
                Pokračovat na termín
              </Button>
            </div>
          </div>
        )}

        {/* KROK 2 — datum a čas */}
        {step === 2 && (
          <div className="grid gap-8 lg:grid-cols-[auto_1fr]" data-testid="booking-step-date-picker">
            <div>
              <h3 className="font-heading text-2xl text-[#5E4238]">Kdy vám to přijde vhod?</h3>
              <p className="mt-1 text-sm text-[#8A7972]">Vyberte datum — neděle je u nás volná.</p>
              <div className="mt-4 rounded-2xl border border-[#EFDCD4] p-3">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => {
                    setDate(d);
                    setTime(null);
                  }}
                  disabled={[{ before: new Date() }, { dayOfWeek: [0] }]}
                  locale={cs}
                />
              </div>
            </div>
            <div data-testid="booking-step-time-slot">
              <p className="flex items-center gap-2 text-sm font-medium text-[#5E4238]">
                <Clock className="size-4 text-[#C08272]" aria-hidden />
                Volné časy{date ? ` — ${format(date, "d. MMMM", { locale: cs })}` : ""}
              </p>
              {availability?.location_name && (
                <p className="mt-1.5 text-xs text-[#8A7972]" data-testid="availability-location">
                  Tento týden se pracuje v provozovně{" "}
                  <span className="font-medium text-[#C08272]">{availability.location_name}</span>
                </p>
              )}
              {!date && <p className="mt-4 text-sm text-[#8A7972]">Nejdřív vyberte datum v kalendáři.</p>}
              {date && availabilityQuery.isPending && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="h-10 animate-pulse rounded-xl bg-[#F8EAE3]" />
                  ))}
                </div>
              )}
              {date && availability?.closed && (
                <p className="mt-4 rounded-xl border border-[#C79A7B]/25 bg-[#F8EAE3] p-4 text-sm text-[#6B4F45]">
                  {availability.message}
                </p>
              )}
              {date && availability && !availability.closed && (
                <div className="mt-4 grid grid-cols-3 gap-2 sm:grid-cols-4">
                  {availability.slots.map((slot) => (
                    <button
                      key={slot.time}
                      type="button"
                      data-testid={`slot-button-${slot.time.replace(":", "")}`}
                      disabled={!slot.available}
                      onClick={() => setTime(slot.time)}
                      className={`rounded-xl border px-2 py-2.5 text-sm transition-all duration-300 disabled:cursor-not-allowed disabled:opacity-35 ${
                        time === slot.time
                          ? "border-[#C08272] bg-[#C08272] text-white"
                          : "border-[#EFDCD4] bg-white text-[#5E4238] hover:border-[#C08272]/50"
                      }`}
                    >
                      {slot.time}
                    </button>
                  ))}
                </div>
              )}
              {date && availability && !availability.closed && (
                <p className="mt-3 text-xs text-[#8A7972]">Šedé časy už jsou bohužel obsazené.</p>
              )}
              <div className="mt-6 flex items-center justify-between">
                <Button variant="ghost" onClick={() => setStep(1)} data-testid="wizard-back-to-service-button">
                  Zpět na služby
                </Button>
                <Button disabled={!time} onClick={() => setStep(3)} data-testid="wizard-continue-to-contact-button">
                  Pokračovat na kontakt
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* KROK 3 — kontakt */}
        {step === 3 && (
          <div data-testid="booking-step-client-form">
            <h3 className="font-heading text-2xl text-[#5E4238]">Na vědomí vám to dáme</h3>
            <p className="mt-1 text-sm text-[#8A7972]">Zadejte kontaktní údaje — potvrzení vám připravíme k termínu.</p>
            {selectedService && date && (
              <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-1 rounded-xl bg-[#F8EAE3] px-4 py-3 text-sm text-[#6B4F45]">
                <span className="font-medium text-[#5E4238]">{selectedService.name}</span>
                <span>{formatCzechDate(dateStr)}</span>
                <span>{time}</span>
                {availability?.location_name && <span>{availability.location_name}</span>}
                <span className="ml-auto font-heading text-base text-[#C08272]" data-testid="summary-price">
                  {availability?.location_id
                    ? (selectedService.prices?.[availability.location_id] ?? selectedService.price)
                    : selectedService.price}
                </span>
              </div>
            )}
            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <div className="grid gap-2 sm:col-span-2">
                <Label htmlFor="booking-name">Jméno a příjmení *</Label>
                <Input
                  id="booking-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Např. Tereza Nováková"
                  data-testid="booking-name-input"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="booking-phone">Telefon *</Label>
                <Input
                  id="booking-phone"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder="+420 …"
                  inputMode="tel"
                  data-testid="booking-phone-input"
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="booking-email">E-mail (nepovinný)</Label>
                <Input
                  id="booking-email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="vas@email.cz"
                  data-testid="booking-email-input"
                />
              </div>
            </div>
            <div className="mt-6 flex items-center justify-between">
              <Button variant="ghost" onClick={() => setStep(2)} data-testid="wizard-back-to-date-button">
                Zpět na termín
              </Button>
              <Button
                disabled={!contactValid || createBooking.isPending}
                onClick={() => createBooking.mutate()}
                data-testid="booking-submit-confirm-button"
              >
                {createBooking.isPending ? "Rezervuji…" : "Dokončit rezervaci"}
              </Button>
            </div>
          </div>
        )}

        {/* KROK 4 — potvrzení + AI návrh designu */}
        {step === 4 && (
          <div className="space-y-6">
            <div
              className="rounded-2xl border border-[#7E8C78]/30 bg-[#7E8C78]/5 p-5"
              data-testid="booking-success-confirmation"
            >
              <div className="flex items-start gap-3">
                <CheckCircle2 className="mt-0.5 size-5 text-[#7E8C78]" aria-hidden />
                <div>
                  <h3 className="font-heading text-xl text-[#5E4238]">
                    Rezervace potvrzena{booking ? ` — ${formatCzechDate(booking.date)} v ${booking.time}` : ""}
                  </h3>
                  <p className="mt-1 text-sm text-[#6B4F45]">
                    Těšíme se na vás, {booking?.name ?? name}! {booking?.service_name} ({booking?.service_price}).
                  </p>
                  <p className="mt-2 text-sm text-[#6B4F45]">
                    {booking?.calendar_synced
                      ? "Termín je zapsaný v Google Kalendáři studia — vše připravené na jednom místě."
                      : "Termín máme uložený v systému studia; do Google Kalendáře ho majitelka uvidí hned po připojení kalendáře."}
                  </p>
                </div>
              </div>
            </div>

            {booking && !pipelineRunning && booking.design_generation_count < 3 && (
              <div className="rounded-2xl border border-[#EFDCD4] bg-[#FAF3EE]/70 p-5" data-testid="design-description-form">
                <p className="flex items-center gap-2 font-heading text-lg text-[#5E4238]">
                  <Sparkles className="size-4 text-[#C08272]" aria-hidden />
                  Jaké nehty si vysníváte?
                </p>
                <p className="mt-1 text-sm text-[#8A7972]">
                  Vyberte si barvy, tvar, délku i efekt — nail artista připraví fotorealistický náhled přímo k vašemu termínu.
                  Zbývá vám {3 - booking.design_generation_count} {3 - booking.design_generation_count === 1 ? "návrh" : "návrhy"}.
                </p>
                <Textarea
                  value={designText}
                  onChange={(e) => setDesignText(e.target.value)}
                  placeholder="Případně doplňte vlastní přání — například na prsteníček zlatou linku…"
                  rows={4}
                  className="mt-3 bg-white"
                  data-testid="booking-ai-design-description-input"
                />
                <div className="mt-4 grid gap-3 sm:grid-cols-2">
                  {[
                    ["Tvar", designShape, setDesignShape, ["mandlový", "oválný", "square", "stiletto"]],
                    ["Délka", designLength, setDesignLength, ["krátká", "střední", "dlouhá"]],
                    ["Finiš", designFinish, setDesignFinish, ["lesklý", "matný", "ombré", "chrom", "třpytivý"]],
                    ["Zdobení", designDecoration, setDesignDecoration, ["bez zdobení", "kamínky", "3D květiny", "mašličky", "mušličky", "hvězdičky", "srdíčka", "malůvky"]],
                  ].map(([label, value, setter, values]) => <div key={label as string}><p className="text-[10px] tracking-[.16em] text-[#A98F84] uppercase">{label as string}</p><div className="mt-1 flex flex-wrap gap-1.5">{(values as string[]).map(v => <button type="button" key={v} onClick={() => (setter as (v:string)=>void)(v)} className={`rounded-full border px-2.5 py-1 text-[11px] ${value === v ? "border-[#C08272] bg-[#C08272] text-white" : "border-[#E5CFC6] bg-white text-[#6B4F45]"}`}>{v}</button>)}</div></div>)}
                  <div className="sm:col-span-2"><p className="text-[10px] tracking-[.16em] text-[#A98F84] uppercase">Barva</p><div className="mt-1 flex flex-wrap gap-2">{[["pudrově růžová","#E9B0A6"],["nude","#D2A67E"],["sage green","#A5B19E"],["červená","#B4544A"],["černá","#222"],["bílá","#fff"],["fialová","#7C6FB1"],["modrá","#4F7791"],["zlatá","#C79A7B"]].map(([name,color]) => <button key={name} type="button" aria-label={name} onClick={() => setDesignColor(name)} className={`size-7 rounded-full border-2 ${designColor === name ? "border-[#5E4238] ring-2 ring-[#C79A7B]/40" : "border-white"}`} style={{backgroundColor:color}} />)}</div></div>
                </div>
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <Button
                    disabled={submitDesign.isPending}
                    onClick={() => { const description = makeDesignDescription(); setDesignText(description); submitDesign.mutate(description); }}
                    data-testid="design-submit-button"
                  >
                    {submitDesign.isPending ? "Odesílám…" : "Nechat vytvořit návrh"}
                  </Button>
                  <Button variant="ghost" onClick={() => setDesignSent(true)} data-testid="design-skip-button">
                    Zatím vynechat
                  </Button>
                </div>
              </div>
            )}

            {showPipeline && booking && <AiPipeline booking={booking} />}

            {booking && !pipelineRunning && booking.design_generation_count >= 3 && (
              <p className="rounded-2xl bg-[#F8EAE3] p-4 text-sm text-[#6B4F45]" data-testid="design-limit-reached-note">
                Pro tento termín jste už využila všechny 3 návrhy. Vybraný návrh zůstává uložený u rezervace.
              </p>
            )}

            {!pipelineRunning && booking?.pipeline_status === "done" && (
              <div className="rounded-2xl bg-[#F8EAE3] p-4 text-sm text-[#6B4F45]" data-testid="pipeline-done-note">
                <p>
                  Návrh je hotový. Pokud se vám líbí, potvrďte ho a paní M. ho uvidí přímo u vašeho termínu v kalendáři.
                </p>
                {booking.design_approved ? (
                  <p className="mt-3 font-medium text-[#5E4238]" data-testid="design-approved-note">
                    Návrh je přiložený k vašemu termínu v kalendáři.
                  </p>
                ) : (
                  <Button
                    className="mt-3"
                    onClick={() => approveDesign.mutate()}
                    disabled={approveDesign.isPending}
                    data-testid="design-approve-button"
                  >
                    {approveDesign.isPending ? "Ukládám…" : "Návrh se mi líbí — přiložit k termínu"}
                  </Button>
                )}
              </div>
            )}

            <div className="flex justify-end">
              <Button variant="ghost" onClick={reset} data-testid="booking-reset-button">
                Nová rezervace
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
