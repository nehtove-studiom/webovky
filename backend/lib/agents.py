"""AI agenti pipeline Studio M.

Agent 1 — Claude („chytrý“): z popisu zákaznice připraví přesný prompt pro
generování obrázku. Nic negeneruje, jen píše prompt.
Agent 2 — Execution Agent („hloupý“): vezme prompt a zavolá generátor
fotorealistických obrázků. Nic neinterpretuje, jen vykoná.

Klíče (backend/.env): ANTHROPIC_API_KEY a GEMINI_API_KEY zákaznice mají
přednost; EMERGENT_LLM_KEY slouží jako automatická záloha, ať pipeline
nikdy nezastaví výpadek externího engine.
"""

import asyncio
import logging
import os

from anthropic import AsyncAnthropic

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-5-20250929"
# Nejlevnější vhodný model pro náhledy nehtů. Starší 2.5 Flash Image končí
# v říjnu 2026 a Imagen už pro Gemini Developer API není dostupný.
IMAGE_MODEL_NANO_BANANA = "gemini-3.1-flash-lite-image"

CLAUDE_SYSTEM = (
    "Jsi prompt agent beauty studia Studio M. Tvoje jediná úloha: vezmi popis "
    "vysněného designu nehtů od zákaznice (píše česky) a přepiš ho do JEDNOHO "
    "precizního promptu pro generátor fotorealistických obrázků.\n"
    "Pravidla:\n"
    "- Prompt piš v angličtině, jeden odstavec, 60–120 slov.\n"
    "- Zachyť tvar nehtů, délku, bázi i finální úpravu, konkrétní odstíny barev, "
    "efekty (chrom, ombré, linky, lesk, mat), stav kůžičky.\n"
    "- Doplň fotografický styl: macro close-up elegantní ženské ruky, měkké "
    "studiové světlo, krémově neutrální pozadí, vysoká detailizace.\n"
    "- Nikdy nezmiňuj text, logo ani watermark v obraze.\n"
    "Vrať POUZE finální prompt — bez uvozovek, bez úvodu, bez komentářů."
)


def anthropic_keys() -> list[str]:
    """Vlastní Claude klíč studia uložený mimo repozitář."""
    key = os.environ.get("ANTHROPIC_API_KEY")
    if not key:
        raise RuntimeError("Chybí ANTHROPIC_API_KEY v nastavení služby.")
    return [key]


async def claude_prompt_agent(design_description: str, service_name: str) -> str:
    """Agent 1 — Claude: popis zákaznice → přesný prompt pro generování obrázku."""
    user_text = (
        f"Objednaná služba: {service_name}\n"
        f"Popis designu od zákaznice (česky): {design_description}"
    )
    keys = anthropic_keys()
    last_error: Exception | None = None

    for index, api_key in enumerate(keys):
        try:
            response = await AsyncAnthropic(api_key=api_key).messages.create(
                model=CLAUDE_MODEL,
                max_tokens=2048,
                system=CLAUDE_SYSTEM,
                messages=[{"role": "user", "content": user_text}],
            )
            prompt = "".join(
                block.text for block in response.content if block.type == "text"
            )
            prompt = (prompt or "").strip().strip('"').strip()
            if not prompt:
                raise RuntimeError("Claude nevrátil žádný prompt.")
            logger.info(
                "Agent 1 (Claude): prompt připraven (%d znaků, klíč #%d)", len(prompt), index + 1
            )
            return prompt
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Agent 1: klíč #%d selhal (%s) — zkouším další", index + 1, str(exc)[:160]
            )

    raise RuntimeError(f"Agent 1 (Claude) selhal: {last_error}")


def _gemini_nanobanana_sync(api_key: str, prompt: str) -> bytes:
    """Vlastní Gemini klíč — nano banana přes Gemini Developer API režim."""
    from google import genai

    client = genai.Client(api_key=api_key)
    response = client.models.generate_content(
        model=IMAGE_MODEL_NANO_BANANA,
        contents=[prompt],
    )
    for part in response.candidates[0].content.parts:
        if part.inline_data and part.inline_data.data:
            return part.inline_data.data
    raise RuntimeError("Nano banana nevrátil obrázek.")


async def _gemini_generate_image(api_key: str, prompt: str) -> bytes:
    image = await asyncio.to_thread(_gemini_nanobanana_sync, api_key, prompt)
    logger.info("Agent 2 (Nail Stylist): obrázek z Gemini Flash Lite Image")
    return image


async def execution_agent_generate_image(prompt: str) -> bytes:
    """Agent 2 — Execution Agent: prompt → fotorealistický obrázek nehtů.

    Pro produkci používá pouze vlastní Gemini klíč a levný Flash Lite Image
    model. Dražší vývojová záloha se smí použít jen po výslovném nastavení.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        return await _gemini_generate_image(gemini_key, prompt)
    raise RuntimeError("Chybí GEMINI_API_KEY pro generování návrhů nehtů.")
