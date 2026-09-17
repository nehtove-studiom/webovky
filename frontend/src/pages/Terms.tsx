import { Link } from "react-router-dom";

export default function Terms() {
  return (
    <main className="min-h-svh bg-[#FAF3EE] px-5 py-12 text-[#4A3B34] sm:px-8 sm:py-20">
      <article className="mx-auto max-w-3xl rounded-[28px] border border-[#EFDCD4] bg-white p-7 shadow-[0_30px_70px_-45px_rgba(74,59,52,0.35)] sm:p-12">
        <Link to="/" className="text-[11px] tracking-[0.16em] text-[#C08272] uppercase hover:text-[#8B9A85]">
          ← Zpět na Studio M
        </Link>
        <p className="mt-8 font-heading text-[10px] tracking-[0.28em] text-[#A98F84] uppercase">Studio M</p>
        <h1 className="mt-3 font-heading text-3xl tracking-[0.06em] text-[#5E4238] uppercase sm:text-4xl">
          Obchodní a rezervační podmínky
        </h1>
        <p className="mt-3 text-sm text-[#8A7972]">Platné od 17. 9. 2026</p>

        <div className="mt-10 space-y-8 text-sm leading-relaxed text-[#6B4F45]">
          <section>
            <h2 className="font-heading text-xl text-[#5E4238]">1. Provozovatel a kontakt</h2>
            <p className="mt-2">
              Služby poskytuje Martina Holánková, IČO 63854023, pod značkou Studio M.
              Kontakt: <a className="text-[#C08272] underline" href="tel:+420777575796">777 575 796</a> a{" "}
              <a className="text-[#C08272] underline" href="mailto:martina.holankova@email.cz">martina.holankova@email.cz</a>.
              Služby jsou poskytovány v provozovnách Krásná Lípa, Varnsdorfská 89/52,
              a Neratovice, Dr. E. Beneše 1184.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl text-[#5E4238]">2. Rezervace</h2>
            <p className="mt-2">
              Termín lze rezervovat online nebo po dohodě se studiem. Odesláním rezervace
              zákaznice potvrzuje správnost zadaných údajů. Rezervace je platná po potvrzení
              studiem nebo po úspěšném dokončení online platebního kroku, je-li pro daný termín nabízen.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl text-[#5E4238]">3. Ceny a platba</h2>
            <p className="mt-2">
              Aktuální ceny jsou uvedeny v ceníku u každé provozovny na webu. Cena služby je
              konečná v Kč. Pokud je zvolena online platba, probíhá prostřednictvím zabezpečené
              platební brány; Studio M neukládá údaje o platební kartě.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl text-[#5E4238]">4. Změna nebo zrušení termínu</h2>
            <p className="mt-2">
              Pokud potřebujete termín změnit nebo zrušit, kontaktujte Studio M co nejdříve na
              uvedeném telefonu nebo e-mailu. Individuální storno podmínky či případný zálohový
              poplatek budou vždy zákaznici sděleny před potvrzením rezervace.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl text-[#5E4238]">5. Reklamace a řešení sporů</h2>
            <p className="mt-2">
              Případnou reklamaci lze uplatnit e-mailem nebo osobně v provozovně. Studio M ji
              vyřídí bez zbytečného odkladu. Spotřebitel se může obrátit také na Českou obchodní
              inspekci v rámci mimosoudního řešení spotřebitelských sporů.
            </p>
          </section>
          <section>
            <h2 className="font-heading text-xl text-[#5E4238]">6. Ochrana osobních údajů</h2>
            <p className="mt-2">
              Kontaktní údaje používáme pouze pro vyřízení rezervace a komunikaci se zákaznicí.
              Údaje neposkytujeme třetím stranám s výjimkou poskytovatelů nezbytných pro provoz
              rezervace a platby.
            </p>
          </section>
        </div>
      </article>
    </main>
  );
}
