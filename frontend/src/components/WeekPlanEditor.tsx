// WeekPlanEditor — ruční plán týdnů pro administraci: majitelka u každého
// týdne vybere provozovnu (manikérka je jedna a střídá se).

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { CalendarRange } from "lucide-react";
import { apiGet, apiPut } from "@/lib/api";
import type { Location, WeekPlanItem } from "@/types";
import { formatCzechDate } from "@/types";

export default function WeekPlanEditor() {
  const queryClient = useQueryClient();

  const locationsQuery = useQuery({
    queryKey: ["locations"],
    queryFn: () => apiGet<Location[]>("/locations"),
  });
  const planQuery = useQuery({
    queryKey: ["location-weeks"],
    queryFn: () => apiGet<WeekPlanItem[]>("/location-weeks?weeks=12"),
  });

  const setWeek = useMutation({
    mutationFn: ({ isoWeek, locationId }: { isoWeek: string; locationId: string }) =>
      apiPut<WeekPlanItem>(`/location-weeks/${isoWeek}`, { location_id: locationId }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["location-weeks"] });
      void queryClient.invalidateQueries({ queryKey: ["current-location"] });
      void queryClient.invalidateQueries({ queryKey: ["availability"] });
      toast.success("Plán týdne byl upraven.");
    },
    onError: () => toast.error("Týden se nepodařilo uložit. Zkuste to prosím znovu."),
  });

  const locations = locationsQuery.data ?? [];
  const plan = planQuery.data ?? [];

  return (
    <section
      className="mt-10 overflow-hidden rounded-3xl border border-[#EFEAE4] bg-white"
      data-testid="admin-week-plan"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#EFEAE4] bg-[#F5EFEB]/70 px-6 py-4">
        <div>
          <h2 className="flex items-center gap-2 font-heading text-xl text-[#1C1917]">
            <CalendarRange className="size-5 text-[#9E4733]" aria-hidden />
            Plán provozoven po týdnech
          </h2>
          <p className="mt-1 text-sm text-[#6E675F]">
            U každého týdne vyberte, kde se pracuje. Ceny i rezervace se tím řídí.
          </p>
        </div>
      </header>

      <div className="divide-y divide-[#F1ECE6]">
        {plan.map((week) => (
          <div
            key={week.iso_week}
            className="flex flex-wrap items-center gap-x-6 gap-y-3 px-6 py-4"
            data-testid={`week-row-${week.iso_week}`}
          >
            <div className="min-w-[210px]">
              <p className="text-sm font-medium text-[#1C1917]">
                {formatCzechDate(week.monday)} – {formatCzechDate(week.sunday)}
              </p>
              <p className="text-xs text-[#6E675F]">
                {week.iso_week}
                {week.is_current ? " · aktuální týden" : ""}
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              {locations.map((loc) => {
                const active = week.location_id === loc.id;
                return (
                  <button
                    key={loc.id}
                    type="button"
                    disabled={setWeek.isPending}
                    onClick={() =>
                      setWeek.mutate({ isoWeek: week.iso_week, locationId: loc.id })
                    }
                    data-testid={`week-${week.iso_week}-set-${loc.id}`}
                    className={`rounded-full border px-4 py-1.5 text-xs transition-all duration-300 disabled:opacity-50 ${
                      active
                        ? "border-[#9E4733] bg-[#9E4733] text-white"
                        : "border-[#E7DFD5] bg-white text-[#57534E] hover:border-[#9E4733]/60"
                    }`}
                  >
                    {loc.name}
                  </button>
                );
              })}
            </div>

            {!week.location_id && (
              <span className="text-xs text-[#B45309]" data-testid={`week-${week.iso_week}-unset`}>
                Neurčeno
              </span>
            )}
          </div>
        ))}
      </div>
    </section>
  );
}
