"""Google Kalendář: stav připojení + OAuth tok majitelky studia."""

import logging
import os

from fastapi import APIRouter, HTTPException
from fastapi.responses import RedirectResponse

from lib import gcalendar
from models.booking import CalendarStatus

router = APIRouter(tags=["calendar"])

logger = logging.getLogger(__name__)


def _frontend_redirect(status: str) -> str:
    """Return users to the public site after OAuth instead of the API service."""
    base = os.environ.get("FRONTEND_URL", "https://nailstudiom.com").rstrip("/")
    return f"{base}/?calendar={status}"


@router.get("/calendar/status", response_model=CalendarStatus)
async def calendar_status() -> CalendarStatus:
    import asyncio

    tokens = await gcalendar.get_owner_tokens()
    connected = bool(tokens and (tokens.get("access_token") or tokens.get("refresh_token")))
    email = (tokens or {}).get("email")
    target_calendar = gcalendar.calendar_id()
    target_accessible = None
    active_calendar = None

    if connected and tokens:
        info = await asyncio.to_thread(gcalendar.inspect_calendar_connection, tokens)
        email = info.get("email") or email
        target_calendar = info.get("target_calendar") or target_calendar
        target_accessible = info.get("target_accessible")
        active_calendar = info.get("active_calendar")
        return CalendarStatus(
            configured=gcalendar.is_configured(),
            connected=connected,
            email=email,
            target_calendar=target_calendar,
            target_accessible=target_accessible,
            active_calendar=active_calendar,
            martikiii_role_on_primary=info.get("martikiii_role_on_primary"),
            acl_users=info.get("acl_users"),
            calendars=info.get("calendars"),
        )

    return CalendarStatus(
        configured=gcalendar.is_configured(),
        connected=connected,
        email=email,
        target_calendar=target_calendar,
        target_accessible=target_accessible,
        active_calendar=active_calendar,
    )


@router.get("/oauth/calendar/login")
async def oauth_login():
    if not gcalendar.is_configured():
        raise HTTPException(
            status_code=400,
            detail=(
                "Google Calendar není nastavený — doplň GOOGLE_CLIENT_ID a "
                "GOOGLE_CLIENT_SECRET do backend/.env a restartuj služby."
            ),
        )
    return RedirectResponse(gcalendar.authorization_url(), status_code=302)


@router.get("/oauth/calendar/callback")
async def oauth_callback(code: str | None = None, error: str | None = None):
    if error:
        return RedirectResponse(_frontend_redirect("error"), status_code=302)
    if not code:
        return RedirectResponse(_frontend_redirect("missing-code"), status_code=302)
    try:
        await gcalendar.exchange_and_store(code)
    except Exception:
        logger.exception("Výměna OAuth tokenu selhala")
        return RedirectResponse(_frontend_redirect("error"), status_code=302)
    return RedirectResponse(_frontend_redirect("connected"), status_code=302)


@router.post("/calendar/disconnect", response_model=CalendarStatus)
async def calendar_disconnect() -> CalendarStatus:
    await db_clear_tokens()
    return CalendarStatus(configured=gcalendar.is_configured(), connected=False, email=None)


async def db_clear_tokens() -> None:
    from lib.db import db

    await db.calendar_tokens.delete_many({"profile": "owner"})
