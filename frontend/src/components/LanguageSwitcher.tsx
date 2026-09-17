import { useEffect, useState } from "react";
import { Check, ChevronDown, Languages } from "lucide-react";

type Language = "cs" | "en" | "de" | "uk";

const LANGUAGES: Record<Language, { label: string; short: string }> = {
  cs: { label: "Čeština", short: "CZ" },
  en: { label: "English", short: "EN" },
  de: { label: "Deutsch", short: "DE" },
  uk: { label: "Українська", short: "UA" },
};

const STORAGE_KEY = "studio-m-language";

function savedLanguage(): Language {
  const value = window.localStorage.getItem(STORAGE_KEY);
  return value === "en" || value === "de" || value === "uk" ? value : "cs";
}

/**
 * Přepínač používá Google Website Translator: přeloží obsah celé stránky,
 * včetně ceníku a časů, které se doplní z API až po načtení stránky.
 */
export default function LanguageSwitcher() {
  const [language, setLanguage] = useState<Language>(() => savedLanguage());
  const [open, setOpen] = useState(false);

  useEffect(() => {
    document.documentElement.lang = language;

    const translatorWindow = window as Window & {
      googleTranslateElementInit?: () => void;
      google?: { translate?: { TranslateElement?: new (options: object, elementId: string) => unknown } };
    };

    translatorWindow.googleTranslateElementInit = () => {
      const TranslateElement = translatorWindow.google?.translate?.TranslateElement;
      if (TranslateElement && !document.querySelector("#google_translate_element select")) {
        new TranslateElement(
          { pageLanguage: "cs", includedLanguages: "en,de,uk", autoDisplay: false },
          "google_translate_element",
        );
      }
    };

    if (translatorWindow.google?.translate?.TranslateElement) {
      translatorWindow.googleTranslateElementInit();
      return;
    }

    if (!document.querySelector('script[data-google-translate="true"]')) {
      const script = document.createElement("script");
      script.src = "https://translate.google.com/translate_a/element.js?cb=googleTranslateElementInit";
      script.async = true;
      script.dataset.googleTranslate = "true";
      document.head.appendChild(script);
    }
  }, [language]);

  const changeLanguage = (next: Language) => {
    window.localStorage.setItem(STORAGE_KEY, next);
    document.cookie = `googtrans=/cs/${next};path=/;max-age=31536000;SameSite=Lax`;
    setLanguage(next);
    setOpen(false);
    // Translator načte zvolený jazyk z cookie před vykreslením stránky.
    window.location.reload();
  };

  return (
    <div className="relative" data-testid="language-switcher">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Změnit jazyk stránky"
        className="flex h-9 items-center gap-1.5 rounded-full border border-[#E5CFC6] bg-white/75 px-2.5 text-[11px] font-medium tracking-[0.08em] text-[#6B4F45] transition-colors hover:border-[#C08272] hover:bg-white"
      >
        <Languages className="size-3.5 text-[#C08272]" aria-hidden />
        <span>{LANGUAGES[language].short}</span>
        <ChevronDown className={`size-3 transition-transform ${open ? "rotate-180" : ""}`} aria-hidden />
      </button>

      {open && (
        <div
          role="menu"
          aria-label="Výběr jazyka"
          className="absolute right-0 top-11 z-[70] w-40 overflow-hidden rounded-2xl border border-[#E5CFC6] bg-[#FFF9F6] p-1.5 shadow-[0_18px_40px_-18px_rgba(90,55,44,0.45)]"
        >
          {(Object.keys(LANGUAGES) as Language[]).map((code) => (
            <button
              key={code}
              type="button"
              role="menuitem"
              onClick={() => changeLanguage(code)}
              className="flex w-full items-center justify-between rounded-xl px-3 py-2 text-left text-sm text-[#6B4F45] transition-colors hover:bg-[#F8E6E0]"
            >
              {LANGUAGES[code].label}
              {language === code && <Check className="size-3.5 text-[#C08272]" aria-hidden />}
            </button>
          ))}
        </div>
      )}

      <div id="google_translate_element" className="hidden" aria-hidden />
    </div>
  );
}
