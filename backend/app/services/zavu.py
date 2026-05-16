"""
Zavu WhatsApp alert integration.
All functions are designed to be called via asyncio.create_task().
"""
import httpx

from app.config import settings

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
                headers={"Authorization": f"Bearer {settings.zavu_api_key}"},
                json=body,
            )
            print(f"[Zavu] Response status: {resp.status_code}")
            print(f"[Zavu] Response body: {resp.text}")
        except Exception as exc:
            print(f"[Zavu] Request failed: {exc}")


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
