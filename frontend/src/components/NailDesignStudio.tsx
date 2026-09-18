import { useMemo, useState } from "react";
import { Sparkles } from "lucide-react";

const FINGERS = ["Palec", "Ukazováček", "Prostředníček", "Prsteníček", "Malíček"];
const PALETTE = [
  ["Nude", "#E9B0A6"], ["Milk", "#F7EFEA"], ["Rose", "#C98286"], ["Cherry", "#A9333B"],
  ["Merlot", "#661C2A"], ["Sage", "#8EA18B"], ["Forest", "#2E5D50"], ["Sky", "#6E9DB7"],
  ["Lilac", "#A78BC3"], ["Onyx", "#252228"], ["Gold", "#C59A55"], ["Pearl", "#F6F2E9"],
] as const;

type Props = { onDescriptionChange?: (description: string) => void };

/** Interaktivní návrhář: vlastní vizualizace rukou, bez přebírání cizí hry nebo grafiky. */
export default function NailDesignStudio({ onDescriptionChange }: Props) {
  const [activeFinger, setActiveFinger] = useState(2);
  const [colors, setColors] = useState<string[]>(Array(5).fill("#E9B0A6"));
  const [shape, setShape] = useState("Mandle");
  const [finish, setFinish] = useState("Lesk");
  const [decoration, setDecoration] = useState("Bez zdobení");

  const summary = useMemo(() => {
    const colorName = PALETTE.find(([, value]) => value === colors[activeFinger])?.[0] ?? "vlastní barva";
    return `${shape} tvar, ${finish.toLowerCase()}, ${colorName} na ${FINGERS[activeFinger].toLowerCase()}, ${decoration.toLowerCase()}`;
  }, [activeFinger, colors, decoration, finish, shape]);

  const selectColor = (color: string) => {
    const next = colors.map((current, index) => (index === activeFinger ? color : current));
    setColors(next);
    const name = PALETTE.find(([, value]) => value === color)?.[0] ?? "vlastní barva";
    onDescriptionChange?.(`${shape} tvar, ${finish.toLowerCase()} finiš, ${name}, ${decoration.toLowerCase()}`);
  };

  return (
    <section className="mt-5 overflow-hidden rounded-[26px] border border-[#E8D5CC] bg-[#FBF6F2]" data-testid="interactive-nail-designer">
      <div className="flex items-center justify-between gap-4 border-b border-[#E8D5CC] px-5 py-4">
        <div>
          <p className="flex items-center gap-2 font-heading text-lg text-[#5E4238]"><Sparkles className="size-4 text-[#C08272]" /> Návrhář vašich nehtů</p>
          <p className="mt-0.5 text-xs text-[#8A7972]">Klepněte na nehet a upravte jej jako v nail baru.</p>
        </div>
        <span className="hidden rounded-full bg-[#8B9A85]/10 px-3 py-1 text-[10px] font-medium tracking-[.13em] text-[#66735F] uppercase sm:block">živý náhled</span>
      </div>

      <div className="grid lg:grid-cols-[minmax(0,1fr)_260px]">
        <div className="relative min-h-[340px] overflow-hidden bg-[radial-gradient(circle_at_50%_5%,#fff_0,transparent_38%),linear-gradient(135deg,#f4ddd4,#e8d4cd_45%,#d9c1b5)] p-5">
          <div className="absolute -right-10 -top-14 size-48 rounded-full bg-[#fff7f2]/60 blur-2xl" aria-hidden />
          <p className="relative text-center text-[10px] tracking-[.18em] text-[#896E62] uppercase">Vyberte jeden z nehtů</p>
          <div className="relative mx-auto mt-4 h-[270px] max-w-[410px]" aria-label="Interaktivní vizualizace ruky">
            {/* Dvě stylizované, dospělé ruce s jemným stínováním; neobsahuje cizí herní assety. */}
            <div className="absolute bottom-0 left-[7%] h-[206px] w-[170px] rotate-[-13deg] rounded-[70%_35%_42%_35%] border border-[#b58675]/20 bg-[linear-gradient(110deg,#c78d78,#f5cbb8_50%,#b97665)] shadow-[18px_18px_25px_rgba(83,53,44,.18)]" />
            <div className="absolute bottom-0 right-[7%] h-[206px] w-[170px] rotate-[13deg] rounded-[35%_70%_35%_42%] border border-[#b58675]/20 bg-[linear-gradient(70deg,#b97665,#f5cbb8_50%,#c78d78)] shadow-[-18px_18px_25px_rgba(83,53,44,.18)]" />
            {[0,1,2,3,4].map((index) => {
              const x = 40 + index * 16.1;
              const nailHeight = [58, 72, 78, 73, 55][index];
              return <button key={FINGERS[index]} type="button" onClick={() => setActiveFinger(index)} aria-label={`${FINGERS[index]} — vybrat nehet`} className={`absolute top-[44px] z-10 w-[42px] -translate-x-1/2 rounded-[48%_48%_38%_38%] border-2 transition-all duration-300 ${activeFinger === index ? "scale-110 border-white ring-4 ring-[#C08272]/45" : "border-white/70 hover:scale-105"}`} style={{ left: `${x}%`, height: nailHeight, background: `linear-gradient(145deg,rgba(255,255,255,.6),transparent 28%), ${colors[index]}`, boxShadow: "0 8px 13px rgba(77,45,37,.24)", transform: `translateX(-50%) rotate(${[-20,-8,0,8,20][index]}deg)` }}><span className="sr-only">{FINGERS[index]}</span>{decoration !== "Bez zdobení" && <span className="pointer-events-none absolute inset-0 grid place-items-center text-sm">{decoration === "Kamínky" ? "✦" : decoration === "Srdíčko" ? "♥" : decoration === "Květ" ? "✿" : "✧"}</span>}</button>;
            })}
            <div className="absolute inset-x-[22%] bottom-[22px] h-20 rounded-[50%] bg-[#eab6a4]/25 blur-xl" aria-hidden />
          </div>
          <p className="relative text-center text-xs font-medium text-[#6B4F45]">Upravujete: <span className="text-[#B06E60]">{FINGERS[activeFinger]}</span></p>
        </div>

        <div className="space-y-4 bg-white/80 p-5">
          <div><p className="text-[10px] tracking-[.16em] text-[#A98F84] uppercase">Barva</p><div className="mt-2 grid grid-cols-6 gap-2">{PALETTE.map(([name, color]) => <button key={name} type="button" title={name} aria-label={name} onClick={() => selectColor(color)} className={`size-7 rounded-full border-2 transition-transform hover:scale-110 ${colors[activeFinger] === color ? "border-[#5E4238] ring-2 ring-[#C59A55]/40" : "border-white"}`} style={{ backgroundColor: color }} />)}</div></div>
          <Choice label="Tvar" values={["Mandle", "Oval", "Square", "Stiletto"]} value={shape} onChange={(v) => { setShape(v); onDescriptionChange?.(`${v} tvar, ${finish.toLowerCase()} finiš, ${decoration.toLowerCase()}`); }} />
          <Choice label="Finiš" values={["Lesk", "Mat", "Ombré", "Chrom", "Třpyt"]} value={finish} onChange={setFinish} />
          <Choice label="Ozdoba" values={["Bez zdobení", "Kamínky", "Květ", "Srdíčko", "Linka"]} value={decoration} onChange={setDecoration} />
          <p className="rounded-xl bg-[#F7ECE6] p-3 text-xs leading-relaxed text-[#745D54]">{summary}</p>
        </div>
      </div>
    </section>
  );
}

function Choice({ label, values, value, onChange }: { label: string; values: string[]; value: string; onChange: (value: string) => void }) {
  return <div><p className="text-[10px] tracking-[.16em] text-[#A98F84] uppercase">{label}</p><div className="mt-1.5 flex flex-wrap gap-1.5">{values.map((item) => <button key={item} type="button" onClick={() => onChange(item)} className={`rounded-full border px-2 py-1 text-[10px] transition-colors ${value === item ? "border-[#8B9A85] bg-[#8B9A85] text-white" : "border-[#E8D5CC] bg-white text-[#6B4F45]"}`}>{item}</button>)}</div></div>;
}
