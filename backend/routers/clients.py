"""Registrace klientek: jméno, telefon, e-mail. Bez hesla."""

import re
from datetime import datetime, timezone

from fastapi import APIRouter
from pydantic import BaseModel, Field

from lib.db import db

router = APIRouter(tags=["clients"])


def normalize_phone(phone: str) -> str:
    digits = re.sub(r"\D", "", phone or "")
    if len(digits) == 12 and digits.startswith("420"):
        digits = digits[3:]
    return digits


class ClientRegister(BaseModel):
    name: str = Field(min_length=2, max_length=120)
    phone: str = Field(min_length=6, max_length=40)
    email: str | None = None


async def register_client(name: str, phone: str, email: str | None) -> None:
    key = normalize_phone(phone)
    if not key:
        return
    await db.clients.update_one(
        {"phone_norm": key},
        {
            "$set": {"name": name, "email": email, "phone": phone},
            "$setOnInsert": {"phone_norm": key, "registered_at": datetime.now(timezone.utc)},
        },
        upsert=True,
    )


async def find_registered(phone: str) -> bool:
    key = normalize_phone(phone)
    return bool(key) and await db.clients.find_one({"phone_norm": key}) is not None


@router.post("/clients/register")
async def register(input: ClientRegister) -> dict:
    await register_client(input.name, input.phone, input.email)
    return {"registered": True}


@router.get("/clients/check")
async def check(phone: str) -> dict:
    return {"registered": await find_registered(phone)}
