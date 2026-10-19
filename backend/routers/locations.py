"""Provozovny + plán týdnů.

Studio má jednu techničku, která se střídá mezi dvěma provozovnami po týdnech.
Plán je ručně editovatelný v administraci; při prvním použití se automaticky
předvyplní 16 týdnů střídavě (Krásná Lípa / Neratovice), aby web fungoval hned.
"""

import os
from datetime import date, datetime, timedelta
from zoneinfo import ZoneInfo

from fastapi import APIRouter, HTTPException

from lib.db import db
from models.location import CurrentLocation, Location, WeekPlanItem, WeekPlanUpdate

router = APIRouter(tags=["locations"])

TZ = ZoneInfo(os.environ.get("APP_TZ", "Europe/Prague"))
SEED_WEEKS = 16

LOCATIONS: list[Location] = [
    Location(
        id="krasna-lipa",
        name="Krásná Lípa",
        address="Varnsdorfská 89/52",
        city="Krásná Lípa",
        maps_query="Varnsdorfská 89/52, Krásná Lípa",
    ),
    Location(
        id="neratovice",
        name="Neratovice",
        address="Dr. E. Beneše 1184",
        city="Neratovice",
        maps_query="Dr. E. Beneše 1184, Neratovice",
    ),
]

LOCATIONS_BY_ID: dict[str, Location] = {loc.id: loc for loc in LOCATIONS}


def iso_week_of(day: date) -> str:
    year, week, _ = day.isocalendar()
    return f"{year}-W{week:02d}"


def monday_of(day: date) -> date:
    return day - timedelta(days=day.weekday())


def today() -> date:
    return datetime.now(TZ).date()


async def ensure_seeded() -> None:
    """Předvyplní plán, pokud je prázdný — střídavě od aktuálního týdne."""
    if await db.location_weeks.count_documents({}) > 0:
        return
    start = monday_of(today())
    docs = []
    for i in range(SEED_WEEKS):
        monday = start + timedelta(weeks=i)
        docs.append(
            {
                "iso_week": iso_week_of(monday),
                "monday": monday.isoformat(),
                "location_id": LOCATIONS[i % 2].id,
            }
        )
    await db.location_weeks.insert_many(docs)


async def location_for_date(day: date) -> Location | None:
    """Která provozovna má v týdnu daného dne otevřeno."""
    await ensure_seeded()
    doc = await db.location_weeks.find_one({"iso_week": iso_week_of(day)})
    if not doc:
        return None
    return LOCATIONS_BY_ID.get(doc.get("location_id") or "")


def _item(doc: dict, current_week: str) -> WeekPlanItem:
    monday = date.fromisoformat(doc["monday"])
    loc = LOCATIONS_BY_ID.get(doc.get("location_id") or "")
    return WeekPlanItem(
        iso_week=doc["iso_week"],
        monday=doc["monday"],
        sunday=(monday + timedelta(days=6)).isoformat(),
        location_id=loc.id if loc else None,
        location_name=loc.name if loc else None,
        is_current=doc["iso_week"] == current_week,
    )


@router.get("/locations", response_model=list[Location])
async def list_locations() -> list[Location]:
    return LOCATIONS


@router.get("/locations/current", response_model=CurrentLocation)
async def current_location() -> CurrentLocation:
    day = today()
    monday = monday_of(day)
    return CurrentLocation(
        iso_week=iso_week_of(day),
        monday=monday.isoformat(),
        sunday=(monday + timedelta(days=6)).isoformat(),
        location=await location_for_date(day),
    )


@router.get("/location-weeks", response_model=list[WeekPlanItem])
async def week_plan(weeks: int = 12) -> list[WeekPlanItem]:
    """Plán od aktuálního týdne dál — doplní chybějící týdny jako neurčené."""
    await ensure_seeded()
    start = monday_of(today())
    current_week = iso_week_of(start)
    plan: list[WeekPlanItem] = []
    for i in range(max(1, min(weeks, 52))):
        monday = start + timedelta(weeks=i)
        key = iso_week_of(monday)
        doc = await db.location_weeks.find_one({"iso_week": key})
        plan.append(
            _item(doc or {"iso_week": key, "monday": monday.isoformat()}, current_week)
        )
    return plan


@router.put("/location-weeks/{iso_week}", response_model=WeekPlanItem)
async def set_week(iso_week: str, input: WeekPlanUpdate) -> WeekPlanItem:
    if input.location_id not in LOCATIONS_BY_ID:
        raise HTTPException(status_code=400, detail="Neznámá provozovna.")
    try:
        year, week = iso_week.split("-W")
        monday = date.fromisocalendar(int(year), int(week), 1)
    except (ValueError, TypeError):
        raise HTTPException(
            status_code=400, detail="Neplatný týden, očekáváno YYYY-Wnn."
        )
    await db.location_weeks.update_one(
        {"iso_week": iso_week},
        {
            "$set": {
                "iso_week": iso_week,
                "monday": monday.isoformat(),
                "location_id": input.location_id,
            }
        },
        upsert=True,
    )
    doc = await db.location_weeks.find_one({"iso_week": iso_week})
    return _item(doc or {}, iso_week_of(monday_of(today())))

from pydantic import BaseModel
class CalendarLocationRange(BaseModel):
    message: str | None = None



@router.get("/locations/calendar-message", response_model=CalendarLocationRange)
async def calendar_location_message() -> CalendarLocationRange:
    from lib import gcalendar
    import asyncio
    
    if not await gcalendar.is_connected():
        return CalendarLocationRange(message=None)
    
    tokens = await gcalendar.get_owner_tokens()
    start_dt = datetime.now(TZ)
    end_dt = start_dt + timedelta(days=60)
    
    locations = await asyncio.to_thread(gcalendar.get_location_events, tokens, start_dt, end_dt)
    if not locations:
        return CalendarLocationRange(message=None)
    
    first = locations[0]
    
    s_dt = datetime.fromisoformat(first['start'].replace('Z', '+00:00'))
    s_date = s_dt.strftime('%d.%m.%Y')
    
    e_dt = datetime.fromisoformat(first['end'].replace('Z', '+00:00'))
    if 'T' not in first['end']:
        e_dt = e_dt - timedelta(days=1)
    
    e_date = e_dt.strftime('%d.%m.%Y')
    
    msg = f"Od {s_date} do {e_date} je v {first['name']}"
    return CalendarLocationRange(message=msg)
