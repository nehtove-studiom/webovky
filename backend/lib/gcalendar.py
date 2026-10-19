"""Google Calendar integrace — OAuth připojení majitelky studia.

Kredity (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) se doplní do backend/.env.
Tokeny po OAuth souhlasu se ukládají do kolekce `calendar_tokens` (dokument
profile="owner"). Bez připojení běží systém v demo režimu — rezervace se
ukládají do databáze a kalendářový krok se zobrazí jako čekající.
"""

import logging
import os
import secrets
from urllib.parse import urlencode
from datetime import datetime, timedelta, timezone

import requests
from google.auth.transport.requests import Request as GoogleRequest
from google.oauth2.credentials import Credentials
from googleapiclient.discovery import build

from lib.db import db

logger = logging.getLogger(__name__)

SCOPES = ["https://www.googleapis.com/auth/calendar"]
TIMEZONE = "Europe/Prague"


def calendar_id() -> str:
    """ID sdíleného firemního kalendáře; lokálně lze ponechat primary."""
    return os.environ.get("GOOGLE_CALENDAR_ID") or "primary"


def is_configured() -> bool:
    return bool(os.environ.get("GOOGLE_CLIENT_ID")) and bool(
        os.environ.get("GOOGLE_CLIENT_SECRET")
    )


def env_refresh_token() -> str | None:
    """Refresh token z backend/.env — připojí kalendář bez klikání v prohlížeči."""
    return os.environ.get("GOOGLE_REFRESH_TOKEN") or None


def redirect_uri() -> str:
    custom = os.environ.get("GOOGLE_REDIRECT_URI")
    if custom:
        return custom
    base = os.environ.get("APP_URL", "").rstrip("/")
    return f"{base}/api/oauth/calendar/callback"


def _client_config() -> dict:
    return {
        "web": {
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "auth_uri": "https://accounts.google.com/o/oauth2/auth",
            "token_uri": "https://oauth2.googleapis.com/token",
        }
    }


def authorization_url() -> str:
    """Vytvoří serverový OAuth odkaz bez neuložené PKCE výzvy.

    Předchozí implementace nechala knihovnu automaticky přidat
    ``code_challenge``, ale callback pak neposílal odpovídající
    ``code_verifier``. Google proto po souhlasu vracel chybu 400.
    Webový OAuth klient používá tajný klíč na serveru, takže zde použijeme
    standardní authorization-code flow bez PKCE.
    """
    params = {
        "response_type": "code",
        "client_id": os.environ["GOOGLE_CLIENT_ID"],
        "redirect_uri": redirect_uri(),
        "scope": " ".join(SCOPES),
        "state": secrets.token_urlsafe(24),
        "access_type": "offline",
        "prompt": "consent",
    }
    return "https://accounts.google.com/o/oauth2/auth?" + urlencode(params)


async def get_owner_tokens() -> dict | None:
    """Tokeny majitelky — nejdřív z .env (refresh token), pak z databáze."""
    refresh = env_refresh_token()
    if refresh and is_configured():
        return {"profile": "owner", "refresh_token": refresh, "source": "env"}
    return await db.calendar_tokens.find_one({"profile": "owner"})


async def is_connected() -> bool:
    tokens = await get_owner_tokens()
    if not tokens:
        return False
    return bool(tokens.get("access_token") or tokens.get("refresh_token"))


async def exchange_and_store(code: str) -> str:
    """Vymění autorizační kód za tokeny a uloží je. Vrací e-mail kalendáře."""
    resp = requests.post(
        "https://oauth2.googleapis.com/token",
        data={
            "code": code,
            "client_id": os.environ["GOOGLE_CLIENT_ID"],
            "client_secret": os.environ["GOOGLE_CLIENT_SECRET"],
            "redirect_uri": redirect_uri(),
            "grant_type": "authorization_code",
        },
        timeout=30,
    )
    resp.raise_for_status()
    tokens = resp.json()

    userinfo = requests.get(
        "https://www.googleapis.com/oauth2/v2/userinfo",
        headers={"Authorization": f"Bearer {tokens['access_token']}"},
        timeout=30,
    ).json()

    await db.calendar_tokens.update_one(
        {"profile": "owner"},
        {
            "$set": {
                "profile": "owner",
                "email": userinfo.get("email"),
                **tokens,
                "updated_at": datetime.now(timezone.utc),
            }
        },
        upsert=True,
    )
    logger.info("Google kalendář připojen: %s", userinfo.get("email"))
    return userinfo.get("email", "")


def _credentials(tokens: dict) -> Credentials:
    creds = Credentials(
        token=tokens.get("access_token"),
        refresh_token=tokens.get("refresh_token"),
        token_uri="https://oauth2.googleapis.com/token",
        client_id=os.environ["GOOGLE_CLIENT_ID"],
        client_secret=os.environ["GOOGLE_CLIENT_SECRET"],
        scopes=SCOPES,
    )
    # Bez access tokenu (režim refresh tokenu z .env) si ho vyžádáme hned.
    if not creds.token and creds.refresh_token:
        creds.refresh(GoogleRequest())
    elif not creds.valid and creds.refresh_token:
        creds.refresh(GoogleRequest())
    return creds


def _service(tokens: dict):
    return build("calendar", "v3", credentials=_credentials(tokens), cache_discovery=False)


def create_event_sync(tokens: dict, doc: dict) -> str | None:
    """Vytvoří událost rezervace v kalendáři majitelky. Vrací event_id."""
    start = datetime.strptime(f"{doc['date']} {doc['time']}", "%Y-%m-%d %H:%M")
    end = start + timedelta(minutes=int(doc.get("service_duration_min", 60)))
    description = (
        f"Rezervace přes web Studio M\n"
        f"Klientka: {doc['name']} · {doc['phone']}"
        + (f" · {doc['email']}" if doc.get("email") else "")
        + f"\nSlužba: {doc['service_name']} ({doc['service_price']})"
    )
    if doc.get("design_description"):
        description += f"\nPopis designu: {doc['design_description']}"

    body = {
        "summary": f"Studio M — {doc['service_name']} · {doc['name']}",
        "description": description,
        "start": {
            "dateTime": start.strftime("%Y-%m-%dT%H:%M:%S"),
            "timeZone": TIMEZONE,
        },
        "end": {
            "dateTime": end.strftime("%Y-%m-%dT%H:%M:%S"),
            "timeZone": TIMEZONE,
        },
    }
    service = _service(tokens)
    target_cal = calendar_id()
    try:
        event = service.events().insert(calendarId=target_cal, body=body).execute()
    except Exception:
        if target_cal == "primary":
            raise
        logger.warning("Sdílený kalendář %s není dostupný, zapisuji do primary", target_cal)
        event = service.events().insert(calendarId="primary", body=body).execute()
    return event.get("id")


def append_image_link_sync(tokens: dict, event_id: str, image_url: str) -> None:
    """Doplň odkaz na AI návrh designu do popisu existující události."""
    service = _service(tokens)
    target_cal = calendar_id()
    try:
        event = service.events().get(calendarId=target_cal, eventId=event_id).execute()
    except Exception:
        target_cal = "primary"
        event = service.events().get(calendarId=target_cal, eventId=event_id).execute()
    note = (
        f"\n\n🎨 AI návrh designu nehtů: {image_url}"
        "\n(Návrh vygenerovaný agenty Studio M — Claude + Execution Agent)"
    )
    event["description"] = (event.get("description") or "") + note
    service.events().update(
        calendarId=target_cal, eventId=event_id, body=event
    ).execute()
    logger.info("Obrázek designu doplňen do události %s", event_id)

def get_free_busy(tokens: dict, start_dt: datetime, end_dt: datetime) -> list[dict]:
    service = _service(tokens)
    target_cal = calendar_id()
    body = {
        "timeMin": start_dt.isoformat(),
        "timeMax": end_dt.isoformat(),
        "timeZone": TIMEZONE,
        "items": [{"id": target_cal}]
    }
    try:
        eventsResult = service.freebusy().query(body=body).execute()
        calendars = eventsResult.get("calendars", {})
        cal_data = calendars.get(target_cal, {})
        return cal_data.get("busy", [])
    except Exception as e:
        logger.warning("Chyba při čtení freebusy z %s: %s", target_cal, e)
        return []


def get_location_events(tokens: dict, start_dt: datetime, end_dt: datetime) -> list[dict]:
    service = _service(tokens)
    target_cal = calendar_id()
    try:
        events_result = service.events().list(
            calendarId=target_cal,
            timeMin=start_dt.isoformat(),
            timeMax=end_dt.isoformat(),
            singleEvents=True,
            orderBy='startTime'
        ).execute()
        events = events_result.get('items', [])
        locations = []
        for event in events:
            summary = event.get('summary', '').lower()
            loc_id = None
            loc_name = None
            if 'neratovic' in summary:
                loc_id = 'neratovice'
                loc_name = 'Neratovicích'
            elif 'líp' in summary or 'lipa' in summary:
                loc_id = 'krasna-lipa'
                loc_name = 'Lípě'
            
            if loc_id:
                start_str = event['start'].get('dateTime', event['start'].get('date'))
                end_str = event['end'].get('dateTime', event['end'].get('date'))
                locations.append({
                    'id': loc_id,
                    'name': loc_name,
                    'start': start_str,
                    'end': end_str
                })
        return locations
    except Exception as e:
        logger.warning("Chyba při čtení událostí z %s: %s", target_cal, e)
        return []
