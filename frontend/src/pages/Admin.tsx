// Admin — správa rezervací pro majitelku studia: přehled, stav, AI návrhy a
// stav připojení Google Kalendáře.

import { useEffect } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { ArrowLeft, CalendarCheck2, CircleAlert, Eye } from "lucide-react";
import { apiGet, apiPatch, apiUrl } from "@/lib/api";
import type { Booking, BookingStatus, CalendarStatus } from "@/types";
import { PIPELINE_LABELS, STATUS_LABELS, STATUS_ORDER, formatCzechDate } from "@/types";
import WeekPlanEditor from "@/components/WeekPlanEditor";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

const STATUS_DOT: Record<BookingStatus, string> = {
  nova: "bg-[#B45309]",
  potvrzena: "bg-[#15803D]",
  dokoncena: "bg-[#1C1917]",
  zrusena: "bg-[#B91C1C]",
};

export default function Admin() {
  const queryClient = useQueryClient();
  const [searchParams, setSearchParams] = useSearchParams();

  const calendarQuery = useQuery({
    queryKey: ["calendar-status"],
    queryFn: () => apiGet<CalendarStatus>("/calendar/status"),
  });
  const calendar = calendarQuery.data ?? null;

  const bookingsQuery = useQuery({
    queryKey: ["bookings"],
    queryFn: () => apiGet<Booking[]>("/bookings"),
    refetchInterval: 5000,
  });
  const bookings = bookingsQuery.data ?? [];

  const updateStatus = useMutation({
    mutationFn: ({ id, status }: { id: string; status: BookingStatus }) =>
      apiPatch<Booking>(`/bookings/${id}`, { status }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["bookings"] });
      toast.success("Stav rezervace byl upraven.");
    },
    onError: () => toast.error("Stav se nepodařilo upravit. Zkuste to prosím znovu."),
  });

  // Hlášky po návratu z Google OAuth
  useEffect(() => {
    const result = searchParams.get("calendar");
    if (result === "connected") toast.success("Google kalendář byl úspěšně připojen.");
    if (result === "error")
      toast.error("Připojení kalendáře se nepodařilo. Zkuste to prosím znovu.");
    if (result) setSearchParams({}, { replace: true });
  }, [searchParams, setSearchParams]);

  return (
    <div className="min-h-svh bg-[#FAF7F2] text-[#1C1917] antialiased">
      <div className="mx-auto max-w-6xl px-5 py-10 sm:px-8">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-sm text-[#6E675F] transition-colors duration-300 hover:text-[#9E4733]"
              data-testid="admin-back-to-site-link"
            >
              <ArrowLeft className="size-4" aria-hidden />
              Zpět na web
            </Link>
            <h1 className="mt-2 font-heading text-3xl tracking-[-0.02em] sm:text-4xl">Správa rezervací</h1>
            <p className="mt-1 text-sm text-[#6E675F]">
              Přehled všech termínů, popisů designu a AI návrhů — vše na jednom místě.
            </p>
          </div>

          <div
            className="flex items-center gap-3 rounded-2xl border border-[#EFEAE4] bg-white px-4 py-3"
            data-testid="admin-gcal-sync-status"
          >
            {calendar?.connected ? (
              <>
                <span className="flex items-center gap-2 text-sm text-[#15803D]">
                  <CalendarCheck2 className="size-4" aria-hidden />
                  Kalendář připojen{calendar.email ? `: ${calendar.email}` : ""}
                </span>
              </>
            ) : calendar?.configured ? (
              <>
                <span className="flex items-center gap-2 text-sm text-[#78350F]">
                  <CircleAlert className="size-4" aria-hidden />
                  Kalendář není připojený
                </span>
                <Button
                  size="sm"
                  render={
                    <a href={apiUrl("/oauth/calendar/login")} data-testid="admin-connect-calendar-button" />
                  }
                >
                  Připojit Google kalendář
                </Button>
              </>
            ) : (
              <span className="max-w-sm text-xs leading-relaxed text-[#78350F]">
                Demo režim — rezervace se ukládají do systému studia. Připojení
                kalendáře zapnete doplněním GOOGLE_CLIENT_ID a
                GOOGLE_CLIENT_SECRET do backend/.env.
              </span>
            )}
          </div>
        </div>

        <WeekPlanEditor />

        {bookingsQuery.isError && (
          <p className="mt-8 rounded-2xl border border-[#B91C1C]/25 bg-[#B91C1C]/5 p-5 text-sm text-[#B91C1C]" data-testid="admin-error">
            Rezervace se nepodařilo načíst. Zkuste obnovit stránku.
          </p>
        )}

        {bookingsQuery.isPending && (
          <div className="mt-8 space-y-3" data-testid="admin-loading">
            {Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-14 animate-pulse rounded-2xl bg-[#F5EFEB]" />
            ))}
          </div>
        )}

        {bookingsQuery.isSuccess && bookings.length === 0 && (
          <p className="mt-10 rounded-3xl border border-dashed border-[#E7DFD5] bg-white/60 p-12 text-center text-[#6E675F]" data-testid="admin-empty-state">
            Zatím tu nejsou žádné rezervace. Jakmile někdo termín rezervuje, objeví se tady.
          </p>
        )}

        {bookings.length > 0 && (
          <div className="mt-8 overflow-hidden rounded-3xl border border-[#EFEAE4] bg-white">
            <Table data-testid="admin-reservations-table">
              <TableHeader>
                <TableRow className="bg-[#F5EFEB]/70">
                  <TableHead>Datum</TableHead>
                  <TableHead>Čas</TableHead>
                  <TableHead>Klientka</TableHead>
                  <TableHead>Služba</TableHead>
                  <TableHead>AI návrh</TableHead>
                  <TableHead>Stav</TableHead>
                  <TableHead className="text-right">Detail</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {bookings.map((booking) => (
                  <TableRow key={booking.id} data-testid={`admin-booking-row-${booking.id}`}>
                    <TableCell className="whitespace-nowrap font-medium">
                      {formatCzechDate(booking.date)}
                      <span className="block text-xs text-[#6E675F]">
                        {booking.location_name ?? "—"}
                      </span>
                    </TableCell>
                    <TableCell>{booking.time}</TableCell>
                    <TableCell>
                      {booking.name}
                      <span className="block text-xs text-[#6E675F]">{booking.phone}</span>
                    </TableCell>
                    <TableCell>
                      {booking.service_name}
                      <span className="block text-xs text-[#6E675F]">{booking.service_price}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={booking.pipeline_status === "done" ? "secondary" : "outline"}
                        className={
                          booking.pipeline_status === "done"
                            ? "bg-[#15803D]/10 text-[#15803D]"
                            : booking.pipeline_status === "failed"
                              ? "border-[#B91C1C]/30 text-[#B91C1C]"
                              : ""
                        }
                        data-testid={`admin-design-status-${booking.id}`}
                      >
                        {PIPELINE_LABELS[booking.pipeline_status]}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <Select
                        value={booking.status}
                        onValueChange={(value) =>
                          updateStatus.mutate({ id: booking.id, status: value as BookingStatus })
                        }
                      >
                        <SelectTrigger size="sm" className="w-[140px]" data-testid={`admin-status-select-${booking.id}`}>
                          <SelectValue>{(v: string) => STATUS_LABELS[v as BookingStatus]}</SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {STATUS_ORDER.map((status) => (
                            <SelectItem key={status} value={status}>
                              {STATUS_LABELS[status]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="text-right">
                      <Dialog>
                        <DialogTrigger
                          render={
                            <Button variant="ghost" size="icon-sm" data-testid={`admin-detail-button-${booking.id}`} aria-label={`Detail rezervace ${booking.name}`} />
                          }
                        >
                          <Eye className="size-4" aria-hidden />
                        </DialogTrigger>
                        <DialogContent className="max-w-lg">
                          <DialogHeader>
                            <DialogTitle className="font-heading text-2xl">
                              {booking.name} — {formatCzechDate(booking.date)} {booking.time}
                            </DialogTitle>
                            <DialogDescription>
                              {booking.service_name} · {booking.service_price} ·{" "}
                              {booking.service_duration_min} min
                              {booking.location_name ? ` · ${booking.location_name}` : ""}
                            </DialogDescription>
                          </DialogHeader>
                          <div className="space-y-4" data-testid="admin-booking-detail">
                            <div className="rounded-2xl bg-[#F5EFEB] p-4 text-sm">
                              <p className="font-medium text-[#1C1917]">Kontakt</p>
                              <p className="mt-1 text-[#57534E]">
                                {booking.phone}
                                {booking.email ? ` · ${booking.email}` : ""}
                              </p>
                              <p className="mt-2 text-[#57534E]">
                                {booking.calendar_synced
                                  ? `Zapsáno v Google Kalendáři (událost ${booking.event_id})`
                                  : "Google Kalendář není připojený — událost doplníme po připojení."}
                              </p>
                            </div>
                            {booking.design_description && (
                              <div className="rounded-2xl border border-[#EFEAE4] p-4 text-sm">
                                <p className="font-medium text-[#1C1917]">Popis designu od klientky</p>
                                <p className="mt-1 leading-relaxed text-[#57534E]">{booking.design_description}</p>
                              </div>
                            )}
                            {booking.design_prompt && (
                              <div className="rounded-2xl bg-[#1C1917] p-4 text-xs leading-relaxed text-[#D6D3D1]">
                                <p className="mb-1 font-medium text-[#C49A6C]">Prompt od agenta Claude</p>
                                {booking.design_prompt}
                              </div>
                            )}
                            {booking.has_design_image && (
                              <img
                                src={apiUrl(`/bookings/${booking.id}/design-image?v=${encodeURIComponent(booking.updated_at)}`)}
                                alt={`AI návrh designu nehtů — ${booking.name}`}
                                className="w-full rounded-2xl border border-[#EFEAE4]"
                                data-testid="admin-design-image"
                              />
                            )}
                          </div>
                        </DialogContent>
                      </Dialog>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </div>
        )}

        <p className="mt-8 flex items-center gap-2 text-xs text-[#6E675F]">
          <span className={`size-2 rounded-full ${STATUS_DOT.potvrzena}`} aria-hidden />
          Tabulka se automaticky obnovuje každých 5 sekund — nové rezervace i průběh AI pipeline uvidíte hned.
        </p>
      </div>
    </div>
  );
}
