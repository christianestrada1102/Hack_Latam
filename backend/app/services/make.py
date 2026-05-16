"""
Make.com webhook integration — fire-and-forget event triggers.
All functions are designed to be called via asyncio.create_task().
"""
from datetime import datetime, timezone

import httpx

from app.config import settings


def _now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def _post(payload: dict) -> None:
    if not settings.make_webhook_url:
        return
    async with httpx.AsyncClient(timeout=10) as client:
        try:
            await client.post(settings.make_webhook_url, json=payload)
        except Exception:
            pass  # fire-and-forget — never surface webhook errors to callers


async def trigger_new_cluster(cluster_data: dict) -> None:
    await _post({
        "event":          "new_cluster",
        "cluster_id":     str(cluster_data.get("cluster_id", "")),
        "threat_type":    cluster_data.get("threat_type", ""),
        "region":         cluster_data.get("region", ""),
        "incident_count": int(cluster_data.get("incident_count", 0)),
        "top_keywords":   cluster_data.get("top_keywords", []),
        "risk_score":     int(cluster_data.get("risk_score", 0)),
        "timestamp":      _now_iso(),
    })


async def trigger_high_risk_alert(incident_data: dict) -> None:
    await _post({
        "event":              "high_risk_alert",
        "incident_id":        str(incident_data.get("incident_id", "")),
        "threat_type":        incident_data.get("threat_type", ""),
        "region":             incident_data.get("region", ""),
        "risk_score":         int(incident_data.get("risk_score", 0)),
        "emotional_pressure": incident_data.get("emotional_pressure", ""),
        "panic_interrupt":    bool(incident_data.get("panic_interrupt", False)),
        "entities":           incident_data.get("entities", {}),
        "timestamp":          _now_iso(),
    })


async def trigger_regional_spike(spike_data: dict) -> None:
    await _post({
        "event":            "regional_spike",
        "region":           spike_data.get("region", ""),
        "threat_type":      spike_data.get("threat_type", ""),
        "spike_percentage": int(spike_data.get("spike_percentage", 0)),
        "window":           spike_data.get("window", ""),
        "timestamp":        _now_iso(),
    })
