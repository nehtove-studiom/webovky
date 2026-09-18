"""Chatovací asistentka Studia M.

Dvě cesty, jedna adresa pro frontend (`POST /api/chat`):

1. **Externí agent zákaznice** — pokud je v backend/.env nastavené
   `EXTERNAL_AGENT_URL`, konverzace se přeposílá jejímu už hotovému agentovi
   (ten sám nahlíží do kalendáře a zapisuje termíny).
2. **Vestavěná asistentka na Claude** — výchozí stav. Umí ceník, volné termíny
   i vytvoření rezervace přes nástroje, které sahají na stejná data jako web.
"""

import json
import logging
import os
from typing import Any
from uuid import uuid4

import httpx
from fastapi import APIRouter, HTTPException

from anthropic import AsyncAnthropic

from bson import Binary

from lib import gcalendar
from lib.agents import anthropic_keys, claude_prompt_agent, execution_agent_generate_image
from lib.dates import today_iso
from models.booking import BookingCreate, utcnow
from models.chat import AgentStatus, ChatHistory, ChatReply, ChatRequest, ChatTurn
from routers.bookings import create_booking, get_availability
from routers.locations import LOCATIONS, location_for_date
from routers.services import SERVICES, price_for

router = APIRouter(tags=["chat"])

logger = logging.getLogger(__name__)

CLAUDE_MODEL = "claude-sonnet-4-5-20250929"
MAX_TOOL_ROUNDS = 6
HISTORY_LIMIT = 24

SYSTEM_PROMPT = """Jsi Klára, milá a profesionální asistentka nehtového studia \
Studio M (technička Martina Holánková). Píšeš VÝHRADNĚ česky, vřele, stručně a \
lidsky, zákaznicím vykáš.

Studio má DVĚ provozovny a jednu techničku, která se v nich střídá po týdnech:
- Krásná Lípa, Varnsdorfská 89/52
- Neratovice, Dr. E. Beneše 1184
Ceny manikúry a pedikúry jsou v obou stejné, gel lak a modeláž jsou v \
Neratovicích dražší. Provozovnu pro konkrétní datum si VŽDY zjisti nástrojem \
volne_terminy (vrací i provozovnu daného týdne) — nikdy ji nehádej.

Co umíš:
- poradit se službami a cenami (nástroj seznam_sluzeb — vrací ceny pro obě provozovny),
- najít volné termíny a provozovnu daného týdne (nástroj volne_terminy),
- vytvořit rezervaci (nástroj vytvorit_rezervaci),
- vygenerovat fotorealistický návrh nehtů (nástroj navrh_designu).

Pravidla:
- Otevřeno pondělí–sobota 9:00–19:00, poslední termín začíná v 18:00. V NEDĚLI zavřeno.
- Nikdy si termíny nevymýšlej — vždy si je ověř nástrojem volne_terminy.
- Než vytvoříš rezervaci, musíš mít: službu, datum, čas, jméno a telefon. \
Chybějící údaje doptej se přirozeně, ne jako formulář.
- Rezervaci vytvoř jen JEDNOU. Pokud nástroj vrátí `jiz_existuje: true`, \
rezervace je v pořádku — jen ji potvrď, nikdy netvrď, že se termín obsadil.
- Před vytvořením rezervace krátce zrekapituluj službu, datum, čas, provozovnu i cenu.
- HNED po vytvoření rezervace se zákaznice zeptej, jaké nehty si vysní \
(barvy, tvar, délka, efekt). Jakmile popis máš, napiš jednu krátkou větu, že \
návrh připravuješ a může to chvilku trvat, a ve STEJNÉ odpovědi zavolej nástroj \
navrh_designu s tímto popisem. Obrázek se zákaznici zobrazí v chatu automaticky — \
ty ho jen krátce komentuj (nepiš žádné odkazy ani URL).
- Datum posílej nástrojům ve formátu YYYY-MM-DD, čas jako HH:MM.
- Odpovídej krátce — 2 až 4 věty, bez odrážek, pokud o ně nepožádá.
- Nezmiňuj nástroje, prompty ani technické detaily."""

TOOLS: list[dict[str, Any]] = [
    {
        "type": "function",
        "function": {
            "name": "seznam_sluzeb",
            "description": "Vrátí ceník studia — názvy služeb, ceny a délku trvání.",
            "parameters": {"type": "object", "properties": {}, "required": []},
        },
    },
    {
        "type": "function",
        "function": {
            "name": "volne_terminy",
            "description": (
                "Vrátí volné časy pro konkrétní datum. Vždy použij, než nabídneš termín."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "datum": {
                        "type": "string",
                        "description": "Datum ve formátu YYYY-MM-DD",
                    }
                },
                "required": ["datum"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "vytvorit_rezervaci",
            "description": (
                "Vytvoří rezervaci. Použij teprve až máš potvrzenou službu, datum, "
                "čas, jméno a telefon."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "sluzba_id": {
                        "type": "string",
                        "description": "ID služby ze seznam_sluzeb",
                    },
                    "datum": {"type": "string", "description": "YYYY-MM-DD"},
                    "cas": {"type": "string", "description": "HH:MM"},
                    "jmeno": {"type": "string"},
                    "telefon": {"type": "string"},
                    "email": {"type": "string"},
                },
                "required": ["sluzba_id", "datum", "cas", "jmeno", "telefon"],
            },
        },
    },
    {
        "type": "function",
        "function": {
            "name": "navrh_designu",
            "description": (
                "Vygeneruje fotorealistický náhled nehtů z popisu zákaznice a rovnou "
                "ho zobrazí v chatu. Použij po rezervaci, jakmile máš popis přání. "
                "Generování trvá cca 15–30 sekund."
            ),
            "parameters": {
                "type": "object",
                "properties": {
                    "popis": {
                        "type": "string",
                        "description": "Popis vysněných nehtů od zákaznice (česky)",
                    },
                    "sluzba": {
                        "type": "string",
                        "description": "Název služby, např. Nová modeláž",
                    },
                },
                "required": ["popis"],
            },
        },
    },
]

CLAUDE_TOOLS = [
    {
        "name": tool["function"]["name"],
        "description": tool["function"]["description"],
        "input_schema": tool["function"]["parameters"],
    }
    for tool in TOOLS
]


def external_agent_url() -> str | None:
    return os.environ.get("EXTERNAL_AGENT_URL") or None


@router.get("/chat/status", response_model=AgentStatus)
async def chat_status() -> AgentStatus:
    return AgentStatus(
        external_agent=bool(external_agent_url()),
        calendar_connected=await gcalendar.is_connected(),
    )


async def _load_history(session_id: str) -> list[ChatTurn]:
    from lib.db import db

    doc = await db.chat_sessions.find_one({"session_id": session_id})
    if not doc:
        return []
    return [ChatTurn(**t) for t in doc.get("turns", [])][-HISTORY_LIMIT:]


async def _save_turns(session_id: str, turns: list[ChatTurn]) -> None:
    from lib.db import db

    await db.chat_sessions.update_one(
        {"session_id": session_id},
        {
            "$push": {"turns": {"$each": [t.model_dump() for t in turns]}},
            "$set": {"session_id": session_id, "updated_at": utcnow()},
        },
        upsert=True,
    )


async def _call_external_agent(
    session_id: str, message: str, history: list[ChatTurn]
) -> str:
    """Přepošli konverzaci hotovému agentovi zákaznice."""
    url = external_agent_url()
    assert url is not None
    headers = {"Content-Type": "application/json"}
    token = os.environ.get("EXTERNAL_AGENT_TOKEN")
    if token:
        headers["Authorization"] = f"Bearer {token}"
    payload = {
        "session_id": session_id,
        "message": message,
        "history": [{"role": t.role, "content": t.content} for t in history],
    }
    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(url, json=payload, headers=headers)
        resp.raise_for_status()
        try:
            data = resp.json()
        except ValueError:
            return resp.text.strip()
    if isinstance(data, str):
        return data
    for key in ("reply", "response", "message", "text", "output", "answer"):
        value = data.get(key)
        if isinstance(value, str) and value.strip():
            return value.strip()
        if isinstance(value, dict):
            inner = value.get("text") or value.get("content")
            if isinstance(inner, str) and inner.strip():
                return inner.strip()
    return json.dumps(data, ensure_ascii=False)[:1500]


async def _generate_design_image(popis: str, sluzba: str) -> str:
    """Claude připraví prompt → Execution Agent vygeneruje obrázek → URL pro chat."""
    from lib.db import db

    prompt = await claude_prompt_agent(popis, sluzba)
    image_bytes = await execution_agent_generate_image(prompt)
    image_id = str(uuid4())
    await db.design_images.insert_one(
        {
            "image_id": image_id,
            "data": Binary(image_bytes),
            "mime_type": "image/png",
            "prompt": prompt,
            "description": popis,
            "created_at": utcnow(),
        }
    )
    return f"/api/design-images/{image_id}"


async def _run_tool(
    name: str, args: dict[str, Any]
) -> tuple[dict[str, Any], str | None, str | None]:
    """Vykoná nástroj asistentky. Vrací (výsledek pro model, id rezervace, url obrázku)."""
    if name == "seznam_sluzeb":
        return (
            {
                "provozovny": [
                    {"id": loc.id, "nazev": loc.name, "adresa": f"{loc.address}, {loc.city}"}
                    for loc in LOCATIONS
                ],
                "sluzby": [
                    {
                        "id": s.id,
                        "nazev": s.name,
                        "ceny": {
                            "krasna-lipa": price_for(s, "krasna-lipa"),
                            "neratovice": price_for(s, "neratovice"),
                        },
                        "delka_minut": s.duration_min,
                        "popis": s.description,
                    }
                    for s in SERVICES
                ],
            },
            None,
            None,
        )

    if name == "navrh_designu":
        popis = str(args.get("popis", "")).strip()
        if len(popis) < 5:
            return (
                {"uspech": False, "chyba": "Popis je moc krátký — doptej se na detaily."},
                None,
                None,
            )
        try:
            url = await _generate_design_image(popis, str(args.get("sluzba") or "modeláž nehtů"))
        except Exception as exc:
            logger.exception("Generování návrhu v chatu selhalo")
            return (
                {
                    "uspech": False,
                    "chyba": f"Návrh se teď nepodařilo vygenerovat ({str(exc)[:120]}).",
                },
                None,
                None,
            )
        return (
            {
                "uspech": True,
                "poznamka": "Obrázek se zákaznici v chatu zobrazí automaticky, jen ho krátce popiš.",
            },
            None,
            url,
        )

    if name == "volne_terminy":
        datum = str(args.get("datum", "")).strip()
        try:
            availability = await get_availability(datum)
        except HTTPException as exc:
            return {"chyba": exc.detail}, None, None
        return (
            {
                "datum": availability.date,
                "zavreno": availability.closed,
                "zprava": availability.message,
                "provozovna": availability.location_name,
                "provozovna_id": availability.location_id,
                "volne_casy": [s.time for s in availability.slots if s.available],
            },
            None,
            None,
        )

    if name == "vytvorit_rezervaci":
        sluzba_id = str(args.get("sluzba_id", "")).strip()
        datum = str(args.get("datum", "")).strip()
        cas = str(args.get("cas", "")).strip()
        jmeno = str(args.get("jmeno", "")).strip()
        telefon = str(args.get("telefon", "")).strip()

        # Idempotence: pokud tato zákaznice už tento termín má, neber to jako
        # kolizi — asistentka si jinak „zabere“ slot sama sobě a zmateně tvrdí,
        # že se čas mezitím obsadil.
        from lib.db import db

        existing = await db.bookings.find_one(
            {
                "date": datum,
                "time": cas,
                "phone": telefon,
                "status": {"$ne": "zrusena"},
            }
        )
        if existing:
            return (
                {
                    "uspech": True,
                    "jiz_existuje": True,
                    "rezervace_id": existing["id"],
                    "sluzba": existing["service_name"],
                    "cena": existing["service_price"],
                    "datum": existing["date"],
                    "cas": existing["time"],
                    "provozovna": existing.get("location_name"),
                    "poznamka": (
                        "Tato rezervace už je vytvořená — jen ji potvrď, nevytvářej znovu."
                    ),
                },
                existing["id"],
                None,
            )

        try:
            booking = await create_booking(
                BookingCreate(
                    service_id=sluzba_id,
                    date=datum,
                    time=cas,
                    name=jmeno,
                    phone=telefon,
                    email=(str(args.get("email")).strip() if args.get("email") else None),
                )
            )
        except HTTPException as exc:
            return {"uspech": False, "chyba": exc.detail}, None, None
        except Exception as exc:  # validační chyby Pydanticu
            return {"uspech": False, "chyba": f"Neplatné údaje: {exc}"[:300]}, None, None
        return (
            {
                "uspech": True,
                "rezervace_id": booking.id,
                "sluzba": booking.service_name,
                "cena": booking.service_price,
                "datum": booking.date,
                "cas": booking.time,
                "provozovna": booking.location_name,
                "zapsano_do_kalendare": booking.calendar_synced,
            },
            booking.id,
            None,
        )

    return {"chyba": f"Neznámý nástroj {name}"}, None, None


async def _run_claude_assistant(
    session_id: str, message: str, history: list[ChatTurn]
) -> tuple[str, str | None, list[str], str | None]:
    system = (
        f"{SYSTEM_PROMPT}\n\nDnešní datum je {today_iso()} "
        "(časová zóna Europe/Prague)."
    )
    keys = anthropic_keys()
    last_error: Exception | None = None

    for index, api_key in enumerate(keys):
        booking_id: str | None = None
        image_url: str | None = None
        actions: list[str] = []
        try:
            client = AsyncAnthropic(api_key=api_key)
            messages: list[dict[str, Any]] = [
                {"role": turn.role, "content": turn.content} for turn in history
            ]
            messages.append({"role": "user", "content": message})
            response = await client.messages.create(
                model=CLAUDE_MODEL,
                max_tokens=1600,
                system=system,
                tools=CLAUDE_TOOLS,
                messages=messages,
            )
            for _ in range(MAX_TOOL_ROUNDS):
                tool_uses = [block for block in response.content if block.type == "tool_use"]
                if not tool_uses:
                    break
                tool_results: list[dict[str, Any]] = []
                for call in tool_uses:
                    result, created_id, created_image = await _run_tool(
                        call.name, call.input or {}
                    )
                    if created_id:
                        booking_id = created_id
                    if created_image:
                        image_url = created_image
                    actions.append(call.name)
                    tool_results.append(
                        {
                            "type": "tool_result",
                            "tool_use_id": call.id,
                            "content": json.dumps(result, ensure_ascii=False),
                        }
                    )
                messages.append({"role": "assistant", "content": response.content})
                messages.append({"role": "user", "content": tool_results})
                response = await client.messages.create(
                    model=CLAUDE_MODEL,
                    max_tokens=1600,
                    system=system,
                    tools=CLAUDE_TOOLS,
                    messages=messages,
                )

            reply = "".join(
                block.text for block in response.content if block.type == "text"
            ).strip()
            if not reply:
                reply = (
                    "Omlouvám se, teď se mi nepodařilo odpovědět. Zkusíte to prosím "
                    "napsat ještě jednou?"
                )
            return reply, booking_id, actions, image_url
        except Exception as exc:
            last_error = exc
            logger.warning(
                "Asistentka: klíč #%d selhal (%s) — zkouším další",
                index + 1,
                str(exc)[:160],
            )
            # Rezervace mohla vzniknout ještě před chybou — nezahazuj ji.
            if booking_id:
                return (
                    "Rezervaci mám zapsanou ♥ Kdyby cokoliv, napište mi prosím ještě jednou.",
                    booking_id,
                    actions,
                    image_url,
                )

    raise RuntimeError(f"Asistentka selhala: {last_error}")


@router.post("/chat", response_model=ChatReply)
async def chat(input: ChatRequest) -> ChatReply:
    session_id = input.session_id or str(uuid4())
    history = await _load_history(session_id)
    message = input.message.strip()

    booking_id: str | None = None
    actions: list[str] = []
    image_url: str | None = None

    if external_agent_url():
        try:
            reply = await _call_external_agent(session_id, message, history)
            source: str = "agent"
        except Exception:
            logger.exception("Externí agent selhal — použiji vestavěnou asistentku")
            reply, booking_id, actions, image_url = await _run_claude_assistant(
                session_id, message, history
            )
            source = "claude"
    else:
        try:
            reply, booking_id, actions, image_url = await _run_claude_assistant(
                session_id, message, history
            )
        except Exception:
            logger.exception("Asistentka selhala")
            raise HTTPException(
                status_code=502,
                detail="Asistentka je chvilku nedostupná. Zkuste to prosím za okamžik.",
            )
        source = "claude"

    await _save_turns(
        session_id,
        [ChatTurn(role="user", content=message), ChatTurn(role="assistant", content=reply)],
    )
    return ChatReply(
        session_id=session_id,
        reply=reply,
        booking_id=booking_id,
        source=source,  # type: ignore[arg-type]
        actions=actions,
        image_url=image_url,
    )


@router.get("/chat/{session_id}", response_model=ChatHistory)
async def chat_history(session_id: str) -> ChatHistory:
    return ChatHistory(session_id=session_id, turns=await _load_history(session_id))
