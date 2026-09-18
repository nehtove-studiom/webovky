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
import uuid

from emergentintegrations.llm.chat import LlmChat, UserMessage
from emergentintegrations.llm.openai.image_generation import OpenAIImageGeneration

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-5-20250929"
IMAGE_MODEL_OPENAI = "gpt-image-1"
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
    """Klíče pro Claude v pořadí priority: vlastní klíč studia, pak Emergent.

    Vlastní klíč může přestat platit (rotace, vypršení) — proto vracíme seznam
    a volající zkusí další v řadě, aby asistentka i návrhy designu běžely dál.
    """
    keys = [os.environ.get("ANTHROPIC_API_KEY"), os.environ.get("EMERGENT_LLM_KEY")]
    seen: set[str] = set()
    out: list[str] = []
    for key in keys:
        if key and key not in seen:
            seen.add(key)
            out.append(key)
    if not out:
        raise RuntimeError("Chybí ANTHROPIC_API_KEY i EMERGENT_LLM_KEY v backend/.env")
    return out


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
            chat = LlmChat(
                api_key=api_key,
                session_id=f"studio-m-prompt-{uuid.uuid4().hex[:8]}",
                system_message=CLAUDE_SYSTEM,
            )
            chat.with_model("anthropic", CLAUDE_MODEL)
            chat.with_params(max_tokens=2048)
            prompt = await chat.send_message(UserMessage(text=user_text))
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


async def _emergent_generate_image(prompt: str) -> bytes:
    api_key = os.environ.get("EMERGENT_LLM_KEY")
    if not api_key:
        raise RuntimeError("Chybí GEMINI_API_KEY i EMERGENT_LLM_KEY v backend/.env")
    generator = OpenAIImageGeneration(api_key=api_key)
    images = await generator.generate_images(
        prompt=prompt,
        model=IMAGE_MODEL_OPENAI,
        number_of_images=1,
        quality="medium",
    )
    if not images or not images[0]:
        raise RuntimeError("Generátor obrázků nevrátil žádná data.")
    logger.info("Agent 2 (Execution): obrázek z Emergent engine (%d bajtů)", len(images[0]))
    return images[0]


async def execution_agent_generate_image(prompt: str) -> bytes:
    """Agent 2 — Execution Agent: prompt → fotorealistický obrázek nehtů.

    Pro produkci používá pouze vlastní Gemini klíč a levný Flash Lite Image
    model. Dražší vývojová záloha se smí použít jen po výslovném nastavení.
    """
    gemini_key = os.environ.get("GEMINI_API_KEY")
    if gemini_key:
        return await _gemini_generate_image(gemini_key, prompt)
    if os.environ.get("ALLOW_EMERGENT_IMAGE_FALLBACK", "").lower() == "true":
        return await _emergent_generate_image(prompt)
    raise RuntimeError("Chybí GEMINI_API_KEY pro generování návrhů nehtů.")
