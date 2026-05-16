"""
Zavu WhatsApp alert integration.
All functions are designed to be called via asyncio.create_task().
"""
import httpx

from app.config import settings

_ZAVU_BASE = "https://api.zavu.io/v1"


async def send_whatsapp_alert(phone: str, message: str) -> None:
    if not settings.zavu_api_key or not phone:
        return
    async with httpx.AsyncClient(timeout=15) as client:
        try:
            await client.post(
                f"{_ZAVU_BASE}/messages",
                headers={"Authorization": f"Bearer {settings.zavu_api_key}"},
                json={"to": phone, "message": message},
            )
        except Exception:
            pass  # fire-and-forget — never surface errors to callers


async def send_threat_alert(incident: dict) -> None:
    if not settings.alert_phone:
        return

    threat_type = incident.get("threat_type", "unknown").upper()
    region      = incident.get("region") or "—"
    risk_score  = incident.get("risk_score", 0)
    keywords    = incident.get("entities", {}).get("keywords", [])
    top_keyword = keywords[0] if keywords else ""

    lines = [
        "⚠️ ALERTA HACKLATAM",
        f"Tipo: {threat_type}",
        f"Región: {region}",
        f"Riesgo: {risk_score}/100",
    ]
    if top_keyword:
        lines.append(top_keyword)
    lines.append("hacklatam.vercel.app")

    await send_whatsapp_alert(settings.alert_phone, "\n".join(lines))
