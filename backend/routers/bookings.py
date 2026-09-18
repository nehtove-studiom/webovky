"""Rezervace: vytvoření, dostupnost termínů, popis designu a AI pipeline."""

import asyncio
import logging
import os
from datetime import datetime, timezone
from zoneinfo import ZoneInfo

from bson import Binary
from fastapi import APIRouter, HTTPException, Response
from pymongo import ReturnDocument

from lib import gcalendar
from lib.agents import claude_prompt_agent, execution_agent_generate_image
from lib.db import db
from models.booking import (
    Availability,
    Booking,
    BookingCreate,
    BookingStatusUpdate,
    DesignSubmit,
    Slot,
    utcnow,
)
from routers.locations import location_for_date
from routers.services import SERVICES_BY_ID, price_for

router = APIRouter(tags=["bookings"])

logger = logging.getLogger(__name__)

OPEN_HOUR = 9
CLOSE_HOUR = 19  # poslední začátek 18:00
TZ = ZoneInfo(os.environ.get("APP_TZ", "Europe/Prague"))
PROCESSING_STATES = {"prompt", "image", "calendar"}
HOURLY_SLOTS = [f"{h:02d}:00" for h in range(OPEN_HOUR, CLOSE_HOUR)]


def _booking_from_doc(doc: dict) -> Booking:
    """Normalizuje motorovy naive datetime na aware UTC a postaví Booking."""
    doc = dict(doc)
    for field in ("created_at", "updated_at"):
        value = doc.get(field)
        if isinstance(value, datetime) and value.tzinfo is None:
            doc[field] = value.replace(tzinfo=timezone.utc)
    return Booking(**doc)


def _parse_date(value: str):
    try:
        return datetime.strptime(value, "%Y-%m-%d").date()
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=400, detail="Neplatné datum, očekávaný formát YYYY-MM-DD."
        )


def _image_url(booking_id: str) -> str:
    base = os.environ.get("APP_URL", "").rstrip("/")
    return f"{base}/api/bookings/{booking_id}/design-image"


@router.get("/availability", response_model=Availability)
async def get_availability(date: str) -> Availability:
    day = _parse_date(date)
    location = await location_for_date(day)
    loc_id = location.id if location else None
    loc_name = location.name if location else None
    today = datetime.now(TZ).date()
    if day < today:
        return Availability(
            date=date,
            closed=True,
            message="Tento termín už je v minulosti. Vyberte prosím novější datum.",
            slots=[Slot(time=t, available=False) for t in HOURLY_SLOTS],
            location_id=loc_id,
            location_name=loc_name,
        )
    if day.weekday() == 6:  # neděle
        return Availability(
            date=date,
            closed=True,
            message="V neděli je studio zavřené. Těšíme se na vás od pondělí!",
            slots=[Slot(time=t, available=False) for t in HOURLY_SLOTS],
            location_id=loc_id,
            location_name=loc_name,
        )

    slots: list[Slot] = []
    now = datetime.now(TZ)
    for hour in range(OPEN_HOUR, CLOSE_HOUR):
        time = f"{hour:02d}:00"
        taken = (
            await db.bookings.find_one(
                {"date": date, "time": time, "status": {"$ne": "zrusena"}}
            )
            is not None
        )
        past = datetime(
            day.year, day.month, day.day, hour, 0, tzinfo=TZ
        ) <= now
        slots.append(Slot(time=time, available=not taken and not past))
    return Availability(
        date=date,
        closed=False,
        slots=slots,
        location_id=loc_id,
        location_name=loc_name,
    )


@router.post("/bookings", response_model=Booking)
async def create_booking(input: BookingCreate) -> Booking:
    service = SERVICES_BY_ID.get(input.service_id)
    if not service:
        raise HTTPException(status_code=400, detail="Neznámá služba.")

    day = _parse_date(input.date)
    if input.time not in HOURLY_SLOTS:
        raise HTTPException(
            status_code=400,
            detail=f"Čas {input.time} je mimo otevírací dobu (9:00–18:00).",
        )

    slot_dt = datetime.strptime(
        f"{input.date} {input.time}", "%Y-%m-%d %H:%M"
    ).replace(tzinfo=TZ)
    if slot_dt <= datetime.now(TZ):
        raise HTTPException(
            status_code=400,
            detail="Vybraný termín už je v minulosti. Vyberte prosím jiný čas.",
        )
    if day.weekday() == 6:
        raise HTTPException(
            status_code=400, detail="V neděli je studio zavřené."
        )

    clash = await db.bookings.find_one(
        {"date": input.date, "time": input.time, "status": {"$ne": "zrusena"}}
    )
    if clash:
        raise HTTPException(
            status_code=409,
            detail="Vybraný termín je bohužel už obsazený. Vyberte prosím jiný čas.",
        )

    # Provozovna podle plánu týdne (klient ji může poslat, jinak ji dohledáme)
    location = await location_for_date(day)
    location_id = input.location_id or (location.id if location else None)
    location_name = location.name if location else None
    if input.location_id and location and input.location_id != location.id:
        # plán týdne má přednost — technička je jen jedna
        location_id = location.id

    payload = input.model_dump()
    payload["location_id"] = location_id
    booking = Booking(
        **payload,
        location_name=location_name,
        service_name=service.name,
        service_price=price_for(service, location_id),
        service_duration_min=service.duration_min,
    )
    doc = booking.model_dump()

    # Krok 1 architektury: událost v Google Kalendáři (pokud je kalendář připojený)
    if await gcalendar.is_connected():
        try:
            tokens = await gcalendar.get_owner_tokens()
            event_id = await asyncio.to_thread(
                gcalendar.create_event_sync, tokens, doc
            )
            if event_id:
                doc["event_id"] = event_id
                doc["calendar_synced"] = True
        except Exception:
            logger.exception("Vytváření události v kalendáři selhalo — rezervace pokračuje")

    await db.bookings.insert_one(doc)
    logger.info("Nová rezervace %s — %s %s %s", booking.id, input.date, input.time, input.name)
    return _booking_from_doc(doc)


@router.get("/bookings", response_model=list[Booking])
async def list_bookings() -> list[Booking]:
    docs = await db.bookings.find().sort("created_at", -1).to_list(1000)
    return [_booking_from_doc(d) for d in docs]


@router.get("/bookings/{booking_id}", response_model=Booking)
async def get_booking(booking_id: str) -> Booking:
    doc = await db.bookings.find_one({"id": booking_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Rezervace nenalezena.")
    return _booking_from_doc(doc)


async def run_design_pipeline(booking_id: str) -> None:
    """Claude připraví prompt → Execution Agent vygeneruje obrázek → kalendář."""
    try:
        doc = await db.bookings.find_one({"id": booking_id})
        if not doc or not doc.get("design_description"):
            return

        # Agent 1 — Claude: popis zákaznice → přesný prompt pro obrázek
        prompt = await claude_prompt_agent(
            doc["design_description"], doc["service_name"]
        )
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"design_prompt": prompt, "pipeline_status": "image", "updated_at": utcnow()}},
        )

        # Agent 2 — Execution Agent: prompt → fotorealistický obrázek
        image_bytes = await execution_agent_generate_image(prompt)
        await db.design_images.update_one(
            {"booking_id": booking_id},
            {
                "$set": {
                    "booking_id": booking_id,
                    "data": Binary(image_bytes),
                    "mime_type": "image/png",
                    "created_at": utcnow(),
                }
            },
            upsert=True,
        )
        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"has_design_image": True, "pipeline_status": "calendar", "updated_at": utcnow()}},
        )

        # Obrázek i popis putují k termínu v Google Kalendáři
        if doc.get("event_id") and await gcalendar.is_connected():
            try:
                tokens = await gcalendar.get_owner_tokens()
                await asyncio.to_thread(
                    gcalendar.append_image_link_sync,
                    tokens,
                    doc["event_id"],
                    _image_url(booking_id),
                )
                await db.bookings.update_one(
                    {"id": booking_id},
                    {"$set": {"calendar_synced": True, "updated_at": utcnow()}},
                )
            except Exception:
                logger.exception("Doplnění obrázku do kalendáře selhalo")

        await db.bookings.update_one(
            {"id": booking_id},
            {"$set": {"pipeline_status": "done", "updated_at": utcnow()}},
        )
        logger.info("AI pipeline hotová pro rezervaci %s", booking_id)
    except Exception as exc:
        logger.exception("AI pipeline selhala pro rezervaci %s", booking_id)
        await db.bookings.update_one(
            {"id": booking_id},
            {
                # Selhaný výstup se zákaznici do limitu nepočítá.
                "$inc": {"design_generation_count": -1},
                "$set": {
                    "pipeline_status": "failed",
                    "pipeline_error": str(exc)[:600],
                    "updated_at": utcnow(),
                }
            },
        )


@router.post("/bookings/{booking_id}/design", response_model=Booking)
async def submit_design(booking_id: str, input: DesignSubmit) -> Booking:
    doc = await db.bookings.find_one({"id": booking_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Rezervace nenalezena.")
    if doc.get("pipeline_status") in PROCESSING_STATES:
        raise HTTPException(
            status_code=409, detail="Návrh designu už se právě zpracovává."
        )

    # Limit rezervujeme atomicky, aby jej nešlo obejít několika kliknutími
    # nebo otevřením formuláře ve více oknech.
    fresh = await db.bookings.find_one_and_update(
        {
            "id": booking_id,
            "status": {"$ne": "zrusena"},
            "pipeline_status": {"$nin": list(PROCESSING_STATES)},
            "$or": [
                {"design_generation_count": {"$lt": 3}},
                {"design_generation_count": {"$exists": False}},
            ],
        },
        {
            "$inc": {"design_generation_count": 1},
            "$set": {
                "design_description": input.design_description.strip(),
                "pipeline_status": "prompt",
                "pipeline_error": None,
                "updated_at": utcnow(),
            }
        },
        return_document=ReturnDocument.AFTER,
    )
    if not fresh:
        current = await db.bookings.find_one({"id": booking_id})
        if current and current.get("status") == "zrusena":
            raise HTTPException(status_code=409, detail="Ke zrušené rezervaci nelze vytvářet návrhy.")
        if current and int(current.get("design_generation_count", 0)) >= 3:
            raise HTTPException(status_code=429, detail="K této rezervaci už byly využity všechny 3 návrhy.")
        raise HTTPException(status_code=409, detail="Návrh designu už se právě zpracovává.")
    # Pipeline běží na pozadí — frontend polluje GET /bookings/{id}
    asyncio.create_task(run_design_pipeline(booking_id))
    return _booking_from_doc(fresh)


@router.get("/bookings/{booking_id}/design-image")
async def get_design_image(booking_id: str) -> Response:
    doc = await db.design_images.find_one({"booking_id": booking_id})
    if not doc or not doc.get("data"):
        raise HTTPException(
            status_code=404, detail="Obrázek designu zatím není k dispozici."
        )
    return Response(content=doc["data"], media_type=doc.get("mime_type", "image/png"))


@router.get("/design-images/{image_id}")
async def get_chat_design_image(image_id: str) -> Response:
    """Návrh vygenerovaný asistentkou v chatu (mimo konkrétní rezervaci)."""
    doc = await db.design_images.find_one({"image_id": image_id})
    if not doc or not doc.get("data"):
        raise HTTPException(status_code=404, detail="Obrázek návrhu nenalezen.")
    return Response(content=doc["data"], media_type=doc.get("mime_type", "image/png"))


@router.patch("/bookings/{booking_id}", response_model=Booking)
async def update_booking_status(booking_id: str, input: BookingStatusUpdate) -> Booking:
    doc = await db.bookings.find_one({"id": booking_id})
    if not doc:
        raise HTTPException(status_code=404, detail="Rezervace nenalezena.")
    await db.bookings.update_one(
        {"id": booking_id},
        {"$set": {"status": input.status, "updated_at": utcnow()}},
    )
    fresh = await db.bookings.find_one({"id": booking_id})
    return _booking_from_doc(fresh)
