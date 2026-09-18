"""Pydantic v2 modely domény Studio M — zrcadlené ručně v frontend/src/types.ts."""

from datetime import datetime, timezone
from typing import Literal, Optional
from uuid import uuid4

from pydantic import BaseModel, Field

BookingStatus = Literal["nova", "potvrzena", "dokoncena", "zrusena"]
PipelineStatus = Literal["none", "prompt", "image", "calendar", "done", "failed"]


def utcnow() -> datetime:
    """Aware UTC čas — Pydantic serializuje s offsetem, JS `new Date(...)` to správně parsuje."""
    return datetime.now(timezone.utc)


class Service(BaseModel):
    id: str
    name: str
    # cena pro aktuálně vybranou provozovnu (kvůli zpětné kompatibilitě UI)
    price: str
    # ceny podle provozovny: {"krasna-lipa": "480 Kč", "neratovice": "580 Kč"}
    prices: dict[str, str] = {}
    duration_min: int
    tag: str
    description: str


class BookingCreate(BaseModel):
    service_id: str
    location_id: Optional[str] = None
    date: str  # YYYY-MM-DD
    time: str  # HH:MM
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=6, max_length=40)
    email: Optional[str] = None


class DesignSubmit(BaseModel):
    design_description: str = Field(min_length=10, max_length=2000)


class BookingStatusUpdate(BaseModel):
    status: BookingStatus


class Booking(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid4()))
    service_id: str
    service_name: str
    service_price: str
    service_duration_min: int
    location_id: Optional[str] = None
    location_name: Optional[str] = None
    date: str
    time: str
    name: str
    phone: str
    email: Optional[str] = None
    # Popis vysněného designu od zákaznice + prompt připravený agentem Claude
    design_description: Optional[str] = None
    design_prompt: Optional[str] = None
    has_design_image: bool = False
    # Ke každému potvrzenému termínu lze vytvořit maximálně tři AI návrhy.
    design_generation_count: int = Field(default=0, ge=0, le=3)
    status: BookingStatus = "nova"
    # none = čeká na popis, prompt/image/calendar = pipeline běží, done/failed = konec
    pipeline_status: PipelineStatus = "none"
    pipeline_error: Optional[str] = None
    # Google Kalendář — event_id vznikne po připojení kalendáře majitelky
    event_id: Optional[str] = None
    calendar_synced: bool = False
    created_at: datetime = Field(default_factory=utcnow)
    updated_at: datetime = Field(default_factory=utcnow)


class Slot(BaseModel):
    time: str
    available: bool


class Availability(BaseModel):
    date: str
    closed: bool = False
    message: Optional[str] = None
    slots: list[Slot] = []
    # provozovna, kde se v tomto týdnu pracuje
    location_id: Optional[str] = None
    location_name: Optional[str] = None


class CalendarStatus(BaseModel):
    configured: bool
    connected: bool
    email: Optional[str] = None
