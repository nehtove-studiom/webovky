"""Ceník studia — jediný zdroj pravdy pro služby.

Ceny se liší podle provozovny (Krásná Lípa / Neratovice), manikúra a pedikúra
jsou na obou stejné.
"""

from fastapi import APIRouter, HTTPException

from models.booking import Service
from routers.locations import LOCATIONS_BY_ID

router = APIRouter(tags=["services"])

DEFAULT_LOCATION = "krasna-lipa"

SERVICES: list[Service] = [
    Service(
        id="manikura",
        name="Manikúra",
        prices={"krasna-lipa": "400 Kč", "neratovice": "400 Kč"},
        price="400 Kč",
        duration_min=60,
        tag="Základní péče",
        description="Kompletní ošetření nehtové kůžičky, zapilování do tvaru, vyživující lázeň a závěrečný regenerační olejíček.",
    ),
    Service(
        id="gel-lak",
        name="Gel lak",
        prices={"krasna-lipa": "580 Kč", "neratovice": "580 Kč"},
        price="580 Kč",
        duration_min=60,
        tag="Nejpopulárnější",
        description="Profesionální aplikace vysoce odolného šetrného gel laku s výdrží 3–4 týdny a zrcadlovým leskem.",
    ),
    Service(
        id="modelaz-nova",
        name="Nová modeláž",
        prices={"krasna-lipa": "650 Kč", "neratovice": "900 Kč"},
        price="650 Kč",
        duration_min=120,
        tag="Prodloužení & zpevnění",
        description="Prodloužení na šablonky prémiovým materiálem s precizním modelováním C-oblouku a maximální pevností.",
    ),
    Service(
        id="modelaz-doplneni",
        name="Doplnění modeláže",
        prices={"krasna-lipa": "530 Kč", "neratovice": "780 Kč"},
        price="530 Kč",
        duration_min=120,
        tag="Údržba modeláže",
        description="Doplnění dorostlé modeláže včetně úpravy tvaru, nového finiše a ošetření nehtového lůžka.",
    ),
    Service(
        id="pedikura",
        name="Základní pedikúra",
        prices={"krasna-lipa": "380 Kč"},
        price="380 Kč",
        duration_min=60,
        tag="Relaxace",
        description="Mokrá pedikúra s peelingem, úpravou nehtů a zábalem — uvolnění pro nohy po celém dni.",
    ),
]

SERVICES_BY_ID: dict[str, Service] = {s.id: s for s in SERVICES}


def price_for(service: Service, location_id: str | None) -> str:
    """Cena služby pro danou provozovnu (fallback = Krásná Lípa)."""
    if location_id and location_id in service.prices:
        return service.prices[location_id]
    return service.prices.get(DEFAULT_LOCATION, service.price)


def service_for_location(service: Service, location_id: str | None) -> Service:
    return service.model_copy(update={"price": price_for(service, location_id)})


@router.get("/services", response_model=list[Service])
async def list_services(location: str | None = None) -> list[Service]:
    if location and location not in LOCATIONS_BY_ID:
        raise HTTPException(status_code=400, detail="Neznámá provozovna.")
    selected_location = location or DEFAULT_LOCATION
    return [
        service_for_location(service, selected_location)
        for service in SERVICES
        if selected_location in service.prices
    ]
