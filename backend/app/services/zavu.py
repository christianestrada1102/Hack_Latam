"""
Zavu WhatsApp alert integration.
All functions are designed to be called via asyncio.create_task().
"""
import httpx
from sqlalchemy import select

from app.config import settings
from app.database import SessionLocal
from app.models.subscriber import AlertSubscriber

_ZAVU_BASE = "https://api.zavu.dev/v1"


async def send_whatsapp_alert(phone: str, message: str) -> None:
    if not settings.zavu_api_key or not phone:
        print("[Zavu] Skipped — ZAVU_API_KEY or ALERT_PHONE not set")
        return

    url = f"{_ZAVU_BASE}/messages"
    masked_key = settings.zavu_api_key[:10] + "…"
    body = {"to": phone, "text": message}

    print(f"[Zavu] POST {url}")
    print(f"[Zavu] Authorization: Bearer {masked_key}")
    print(f"[Zavu] Body: {body}")

    async with httpx.AsyncClient(timeout=15) as client:
        try:
            resp = await client.post(
                url,
                headers={
                    "Authorization": f"Bearer {settings.zavu_api_key}",
                    "Zavu-Channel":  "sms",
                    "Zavu-Sender":   "kd713js1f8jm254rmyyw87xgcd86v29w",
                },
                json=body,
            )
            print(f"[Zavu] Response status: {resp.status_code}")
            print(f"[Zavu] Response body: {resp.text}")
        except Exception as exc:
            print(f"[Zavu] Request failed: {exc}")


async def _gather_phones() -> list[str]:
    """Return ALERT_PHONE + all active DB subscribers, deduplicated."""
    phones: list[str] = []
    if settings.alert_phone:
        phones.append(settings.alert_phone)
    try:
        async with SessionLocal() as db:
            result = await db.execute(
                select(AlertSubscriber.phone).where(AlertSubscriber.active.is_(True))
            )
            for p in result.scalars().all():
                if p not in phones:
                    phones.append(p)
    except Exception as exc:
        print(f"[Zavu] DB subscriber query failed: {exc}")
    return phones


async def send_threat_alert(incident: dict) -> None:
    phones = await _gather_phones()
    if not phones:
        print("[Zavu] Skipped — no ALERT_PHONE and no active subscribers")
        return

    incident_id_short  = str(incident.get("incident_id", "")).replace("-", "")[:8]
    threat_type        = incident.get("threat_type", "unknown")
    region             = incident.get("region") or "—"
    risk_score         = incident.get("risk_score", 0)
    emotional_pressure = incident.get("emotional_pressure", "—")

    message = (
        f"HackLatam #{incident_id_short}: "
        f"{threat_type} detectado en {region}. "
        f"Riesgo: {risk_score}/100. "
        f"Presion emocional: {emotional_pressure}. "
        f"No compartas datos personales."
    )

    for phone in phones:
        await send_whatsapp_alert(phone, message[:160])
