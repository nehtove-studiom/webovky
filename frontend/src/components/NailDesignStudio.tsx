import { RotateCcw, Sparkles, WandSparkles } from "lucide-react";
import { useMemo, useState } from "react";

const COLORS = [["Pudrová", "#E8B5AC"], ["Starorůžová", "#B97978"], ["Mléčná", "#F8F2ED"], ["Pistácie", "#9DAA91"], ["Šalvěj", "#647663"], ["Višňová", "#A83E49"], ["Čokoláda", "#5A3C34"], ["Švestka", "#6D507F"], ["Modrá", "#5D849A"], ["Zlatá", "#C8A160"], ["Stříbrná", "#B8BBC0"], ["Onyx", "#26272A"]] as const;
const SHAPES = ["Mandle", "Ovál", "Square", "Stiletto", "Coffin"];
const LENGTHS = ["Krátká", "Střední", "Dlouhá"];
const FINISHES = ["Lesk", "Velvet mat", "Glazed", "Ombré", "Chrom", "Třpyt"];
const DECORATIONS = ["Bez zdobení", "Kamínky", "3D květy", "Mašličky", "Hvězdičky", "Srdíčka", "Zlatá linka"];
const FINGERS = ["Levý palec", "Levý ukazováček", "Levý prostředníček", "Levý prsteníček", "Levý malíček", "Pravý palec", "Pravý ukazováček", "Pravý prostředníček", "Pravý prsteníček", "Pravý malíček"];
type Props = { onDescriptionChange?: (description: string) => void };

function mark(decoration: string) { return decoration === "Kamínky" ? "✦" : decoration === "3D květy" ? "✿" : decoration === "Mašličky" ? "⌁" : decoration === "Hvězdičky" ? "✧" : decoration === "Srdíčka" ? "♥" : decoration === "Zlatá linka" ? "⌇" : ""; }

/** Original Studio M mini-game, drawn in CSS — no copied or licensed game assets. */
export default function NailDesignStudio({ onDescriptionChange }: Props) {
  const [selected, setSelected] = useState(7);
  const [nails, setNails] = useState(Array(10).fill("#E8B5AC"));
  const [shape, setShape] = useState("Mandle");
  const [length, setLength] = useState("Střední");
  const [finish, setFinish] = useState("Lesk");
  const [decoration, setDecoration] = useState("Bez zdobení");
  const [ready, setReady] = useState(false);
  const summary = useMemo(() => {
    const used = [...new Set(nails)].map((color) => COLORS.find(([, value]) => value === color)?.[0] ?? "vlastní barva");
    return `${shape}, ${length.toLowerCase()} délka, ${finish.toLowerCase()}, ${used.join(" a ").toLowerCase()}, ${decoration.toLowerCase()}`;
  }, [decoration, finish, length, nails, shape]);
  const describe = (next?: Partial<{ shape: string; length: string; finish: string; decoration: string; nails: string[] }>) => {
    const used = [...new Set(next?.nails ?? nails)].map((color) => COLORS.find(([, value]) => value === color)?.[0] ?? "vlastní barva");
    onDescriptionChange?.(`${next?.shape ?? shape}, ${(next?.length ?? length).toLowerCase()} délka, ${(next?.finish ?? finish).toLowerCase()}, ${used.join(" a ").toLowerCase()}, ${(next?.decoration ?? decoration).toLowerCase()}`);
  };
  const setOption = (kind: "shape" | "length" | "finish" | "decoration", value: string) => {
    setReady(false); if (kind === "shape") setShape(value); if (kind === "length") setLength(value); if (kind === "finish") setFinish(value); if (kind === "decoration") setDecoration(value); describe({ [kind]: value });
  };
  const paint = (color: string) => { setReady(false); const next = nails.map((value, index) => index === selected ? color : value); setNails(next); describe({ nails: next }); };
  const reset = () => { const base = Array(10).fill("#E8B5AC"); setNails(base); setSelected(7); setShape("Mandle"); setLength("Střední"); setFinish("Lesk"); setDecoration("Bez zdobení"); setReady(false); onDescriptionChange?.("Mandlový tvar, střední délka, lesk, pudrová, bez zdobení"); };
  const handNails = (side: "left" | "right") => {
    const indexes = side === "left" ? [4, 3, 2, 1, 0] : [5, 6, 7, 8, 9];
    return indexes.map((index, slot) => <button type="button" key={FINGERS[index]} aria-label={`${FINGERS[index]}: vybrat nehet`} onClick={() => { setSelected(index); setReady(false); }} className={`nail-game-nail nail-game-nail-${side}-${slot} ${selected === index ? "is-selected" : ""} ${shape === "Stiletto" ? "is-stiletto" : shape === "Square" ? "is-square" : shape === "Coffin" ? "is-coffin" : ""}`} style={{ background: `linear-gradient(125deg, rgba(255,255,255,.76), transparent 30%), ${nails[index]}` }}>{decoration !== "Bez zdobení" && <span aria-hidden>{mark(decoration)}</span>}</button>);
  };
  return <section className="overflow-hidden rounded-[28px] border border-[#e6cdc3] bg-[#fffaf7] shadow-[0_22px_55px_-40px_rgba(78,51,43,.55)]" data-testid="interactive-nail-designer">
    <header className="flex items-center justify-between border-b border-[#eeddd5] bg-[#fff7f2] px-4 py-3 sm:px-6"><div><p className="flex items-center gap-2 font-heading text-base tracking-[.08em] text-[#63463d] uppercase"><Sparkles className="size-4 text-[#c38575]" /> Nail design bar</p><p className="mt-0.5 text-[11px] text-[#967d73]">Klepněte na jeden z deseti nehtů a začněte tvořit.</p></div><button onClick={reset} type="button" className="inline-flex items-center gap-1.5 rounded-full border border-[#e7d0c6] bg-white px-3 py-1.5 text-[10px] font-medium tracking-[.12em] text-[#89685e] uppercase hover:bg-[#f9ede7]"><RotateCcw className="size-3" /> Reset</button></header>
    <div className="grid xl:grid-cols-[1.05fr_.95fr]">
      <div className="relative min-h-[410px] overflow-hidden bg-[radial-gradient(circle_at_50%_8%,#fffdfb_0,transparent_31%),radial-gradient(circle_at_90%_85%,#c8d1bf_0,transparent_38%),linear-gradient(140deg,#f4dfd7,#ead2ca_48%,#dfc4b9)] px-3 py-6 sm:px-6"><div className="pointer-events-none absolute -left-16 top-10 size-44 rounded-full bg-[#fff8f4]/80 blur-3xl" /><div className="pointer-events-none absolute bottom-0 right-0 size-44 rounded-full bg-[#a4b09a]/25 blur-3xl" /><div className="relative mx-auto h-[335px] max-w-[520px]" aria-label="Dvě interaktivní ruce s deseti nehty"><p className="absolute inset-x-0 top-0 z-20 text-center text-[10px] font-medium tracking-[.2em] text-[#806258] uppercase">{FINGERS[selected]} · vybraný nehet</p><div className="nail-game-hand nail-game-left"><div className="nail-game-palm" />{handNails("left")}</div><div className="nail-game-hand nail-game-right"><div className="nail-game-palm" />{handNails("right")}</div><div className="pointer-events-none absolute inset-x-[20%] bottom-1 h-9 rounded-[50%] bg-[#805244]/20 blur-xl" /></div><div className="relative mx-auto mt-1 flex max-w-[440px] items-center justify-center gap-2 rounded-full bg-white/55 px-4 py-2 text-center text-[11px] text-[#79594f] backdrop-blur-sm"><span className="size-2 animate-pulse rounded-full bg-[#9ba993]" /> Vyberte nehet, barvu a ozdobu. Každý nehet může být jiný.</div></div>
      <div className="space-y-4 p-4 sm:p-6"><GameChoices label="Barva pro vybraný nehet" className="grid grid-cols-6 gap-2">{COLORS.map(([name, color]) => <button key={name} type="button" onClick={() => paint(color)} title={name} aria-label={name} className={`size-8 rounded-full border-2 transition duration-200 hover:scale-110 ${nails[selected] === color ? "border-[#61453d] ring-2 ring-[#c99886]/40" : "border-white shadow-sm"}`} style={{ backgroundColor: color }} />)}</GameChoices><GameChoices label="Tvar"><Chips values={SHAPES} value={shape} onClick={(value) => setOption("shape", value)} /></GameChoices><GameChoices label="Délka"><Chips values={LENGTHS} value={length} onClick={(value) => setOption("length", value)} /></GameChoices><GameChoices label="Finiš"><Chips values={FINISHES} value={finish} onClick={(value) => setOption("finish", value)} /></GameChoices><GameChoices label="Zdobení"><Chips values={DECORATIONS} value={decoration} onClick={(value) => setOption("decoration", value)} /></GameChoices><div className={`rounded-2xl border p-3 transition-colors ${ready ? "border-[#a5b398] bg-[#f0f5ed]" : "border-[#ecd8cf] bg-[#fbf2ed]"}`}><p className="text-[10px] font-medium tracking-[.14em] text-[#9b776b] uppercase">Váš návrh</p><p className="mt-1 text-xs leading-relaxed text-[#654a42]">{summary}</p></div><button type="button" onClick={() => { setReady(true); onDescriptionChange?.(summary); }} className="flex w-full items-center justify-center gap-2 rounded-xl bg-[#8b9a85] px-4 py-3 text-xs font-medium tracking-[.13em] text-white uppercase transition hover:bg-[#798a73]"><WandSparkles className="size-4" /> Vytvořit můj návrh</button>{ready && <button type="button" onClick={() => document.getElementById("rezervace")?.scrollIntoView({ behavior: "smooth" })} className="w-full text-xs font-medium tracking-[.1em] text-[#b46f61] underline underline-offset-4">Pokračovat k rezervaci →</button>}</div>
    </div>
  </section>;
}
function GameChoices({ label, className, children }: { label: string; className?: string; children: React.ReactNode }) { return <div><p className="mb-2 text-[10px] font-medium tracking-[.17em] text-[#a08479] uppercase">{label}</p><div className={className ?? "flex flex-wrap gap-1.5"}>{children}</div></div>; }
function Chips({ values, value, onClick }: { values: string[]; value: string; onClick: (value: string) => void }) { return <>{values.map((item) => <button type="button" key={item} onClick={() => onClick(item)} className={`rounded-full border px-2.5 py-1.5 text-[10px] transition ${value === item ? "border-[#8b9a85] bg-[#8b9a85] text-white shadow-sm" : "border-[#ead8d0] bg-white text-[#795b51] hover:border-[#c58c7e]"}`}>{item}</button>)}</>; }
