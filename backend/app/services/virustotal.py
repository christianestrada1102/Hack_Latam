"""
VirusTotal URL reputation check.

Encodes the URL in base64url (no padding) and queries the VT v3 API.
Returns None on any error so callers can treat it as optional enrichment.
"""
import base64

import httpx

from app.config import settings

_VT_BASE = "https://www.virustotal.com/api/v3"


async def check_url(url: str) -> dict | None:
    if not settings.virustotal_api_key:
        return None

    url_id = base64.urlsafe_b64encode(url.encode()).decode().strip("=")

    try:
        async with httpx.AsyncClient(timeout=10) as client:
            resp = await client.get(
                f"{_VT_BASE}/urls/{url_id}",
                headers={"x-apikey": settings.virustotal_api_key},
            )
    except Exception:
        return None

    if resp.status_code != 200:
        return None

    try:
        data  = resp.json()
        attrs = data["data"]["attributes"]
        stats = attrs["last_analysis_stats"]
        return {
            "malicious":     stats.get("malicious",  0),
            "suspicious":    stats.get("suspicious", 0),
            "total_engines": sum(stats.values()),
            "reputation":    attrs.get("reputation", 0),
        }
    except (KeyError, ValueError):
        return None
