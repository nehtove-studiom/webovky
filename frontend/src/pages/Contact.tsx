import { Link } from "react-router-dom";
import { Mail, MapPin, Phone } from "lucide-react";

export default function Contact() {
  return (
    <main className="min-h-svh bg-[#FAF3EE] px-5 py-12 text-[#4A3B34] sm:px-8 sm:py-20">
      <section className="mx-auto max-w-3xl rounded-[28px] border border-[#EFDCD4] bg-white p-7 shadow-[0_30px_70px_-45px_rgba(74,59,52,0.35)] sm:p-12">
        <Link to="/" className="text-[11px] tracking-[0.16em] text-[#C08272] uppercase hover:text-[#8B9A85]">
          ← Zpět na Studio M
        </Link>
        <p className="mt-8 font-heading text-[10px] tracking-[0.28em] text-[#A98F84] uppercase">Studio M</p>
        <h1 className="mt-3 font-heading text-3xl tracking-[0.06em] text-[#5E4238] uppercase sm:text-4xl">Kontakt</h1>
        <div className="mt-10 space-y-5 text-base leading-relaxed text-[#6B4F45]">
          <p><strong>Martina Holánková</strong><br />IČO 63854023</p>
          <p className="flex items-center gap-3"><Phone className="size-5 text-[#C08272]" /><a className="underline" href="tel:+420777575796">+420 777 575 796</a></p>
          <p className="flex items-center gap-3"><Mail className="size-5 text-[#C08272]" /><a className="underline" href="mailto:martina.holankova@email.cz">martina.holankova@email.cz</a></p>
          <p className="flex items-start gap-3"><MapPin className="mt-1 size-5 shrink-0 text-[#C08272]" /><span>Krásná Lípa — Varnsdorfská 89/52<br />Neratovice — Dr. E. Beneše 1184</span></p>
        </div>
      </section>
    </main>
  );
}
