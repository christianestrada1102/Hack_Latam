import asyncio
import json
import re
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, Request, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Incident
from app.services import embeddings
from app.services import make as make_svc
from app.services import mistral as mistral_svc
from app.services import virustotal as vt_svc
from app.services import zavu as zavu_svc

router = APIRouter()

_PRIVATE_EXACT    = {"127.0.0.1", "localhost", "::1", ""}
_PRIVATE_PREFIXES = ("127.", "192.168.", "10.", "172.16.", "172.17.", "172.18.",
                     "172.19.", "172.20.", "172.21.", "172.22.", "172.23.", "172.24.",
                     "172.25.", "172.26.", "172.27.", "172.28.", "172.29.", "172.30.",
                     "172.31.", "::ffff:127.")


async def get_approximate_location(request: Request) -> dict:
    """Resolve city/country from request IP using ip-api.com (no key required).
    Returns all-None dict for private/localhost IPs (silently skipped)."""
    ip = (
        request.headers.get("CF-Connecting-IP")
        or request.headers.get("X-Forwarded-For", "").split(",")[0].strip()
        or (request.client.host if request.client else "")
    )
    if ip in _PRIVATE_EXACT or any(ip.startswith(p) for p in _PRIVATE_PREFIXES):
        return {"country": None, "region": None, "city": None}
    try:
        async with httpx.AsyncClient(timeout=5) as client:
            resp = await client.get(
                f"http://ip-api.com/json/{ip}?fields=country,regionName,city,status"
            )
            data = resp.json()
            if data.get("status") == "success":
                return {
                    "country": data.get("country"),
                    "region":  data.get("regionName"),
                    "city":    data.get("city"),
                }
    except Exception as exc:
        print(f"[geolocation] ip={ip!r} failed: {exc}")
    return {"country": None, "region": None, "city": None}


class ThreatReport(BaseModel):
    incident_id: str
    risk_score: int
    threat_type: str
    emotional_pressure: str
    urgency_score: int
    coercion_score: int
    authority_score: int
    entities: dict
    similar_count: int
    recommended_actions: list[str]
    panic_interrupt: bool
    manipulation_summary: str | None = None
    virustotal: dict | None = None
    analyzed_content: str | None = None
    region: str | None = None


def _safe_int(value, default: int = 0) -> int:
    """Convert model output to int safely — handles None, strings, floats."""
    try:
        return int(value) if value is not None else default
    except (TypeError, ValueError):
        return default


def _merge_emotional(analysis: dict, emotional: dict) -> dict:
    """Override emotional scores in analysis with Claude Haiku's output."""
    return {
        **analysis,
        "emotional_pressure": emotional.get("emotional_pressure", analysis.get("emotional_pressure", "low")),
        "urgency_score":      _safe_int(emotional.get("urgency_score",  analysis.get("urgency_score",  0))),
        "coercion_score":     _safe_int(emotional.get("coercion_score", analysis.get("coercion_score", 0))),
        "authority_score":    _safe_int(emotional.get("authority_score",analysis.get("authority_score",0))),
    }


@router.post("/analyze", response_model=ThreatReport)
async def analyze(
    request: Request,
    file:  Optional[UploadFile] = File(default=None),   # image (or audio if sent as file)
    audio: Optional[UploadFile] = File(default=None),   # dedicated audio field
    text:  Optional[str]        = Form(default=None),
    url:   Optional[str]        = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze content for digital threat indicators.

    Accepts any combination of:
    - file:  image/* → Pixtral OCR
    - audio: audio/* → Voxtral transcription
    - text:  message or SMS body
    - url:   suspicious link (page content fetched automatically)

    All available text is combined before analysis.
    """
    text_parts:  list[str] = []
    embed_text:  str       = ""
    checked_url: str | None = None

    try:
        # ── Collect extraction coroutines (image + audio run in parallel) ──────
        extraction_coros  = []
        extraction_labels = []

        if file is not None:
            ct         = (file.content_type or "").lower()
            file_bytes = await file.read()
            print(f"[analyze] file: name={file.filename!r}, content_type={ct!r}, size={len(file_bytes)} bytes")
            if ct.startswith("image/"):
                extraction_coros.append(mistral_svc.extract_image_text(file_bytes, ct))
                extraction_labels.append("image")
            elif ct.startswith("audio/"):
                extraction_coros.append(mistral_svc.transcribe_audio(file_bytes, ct))
                extraction_labels.append("audio")
            else:
                raise HTTPException(status_code=415, detail=f"Unsupported file type '{ct}'.")

        if audio is not None:
            ct          = (audio.content_type or "").lower()
            audio_bytes = await audio.read()
            print(f"[analyze] audio: name={audio.filename!r}, content_type={ct!r}, size={len(audio_bytes)} bytes")
            extraction_coros.append(mistral_svc.transcribe_audio(audio_bytes, ct or "audio/ogg"))
            extraction_labels.append("audio")

        # Run OCR / transcription in parallel
        if extraction_coros:
            extracted = await asyncio.gather(*extraction_coros, return_exceptions=True)
            for label, result in zip(extraction_labels, extracted):
                if isinstance(result, Exception):
                    print(f"[analyze] extraction '{label}' FAILED: {result}")
                    continue
                print(f"[analyze] extraction '{label}' OK — first 200 chars: {repr(str(result)[:200])}")
                prefix = "[Contenido de imagen]" if label == "image" else "[Transcripción de audio]"
                text_parts.append(f"{prefix}\n{result}")

        # ── Direct text ──────────────────────────────────────────────────────
        if text and text.strip():
            text_parts.append(text.strip())

        # ── URL: fetch page content ───────────────────────────────────────────
        if url and url.strip():
            checked_url = url.strip()
            raw_url = checked_url
            try:
                async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                    page    = await client.get(raw_url)
                    html    = page.text
                    visible = re.sub(r"<[^>]+>", " ", html)
                    visible = re.sub(r"\s+",     " ", visible).strip()
                    text_parts.append(f"{raw_url}\n\n[Contenido de página]\n{visible[:2000]}")
            except Exception:
                text_parts.append(raw_url)

        if not text_parts:
            raise HTTPException(
                status_code=422,
                detail="Provide at least one of: image file, audio file, text, or url.",
            )

        embed_text = "\n\n---\n\n".join(text_parts)
        print(f"[analyze] embed_text parts={len(text_parts)}, total chars={len(embed_text)}, preview: {repr(embed_text[:300])}")

        # ── Threat analysis + emotional scoring + VirusTotal + geolocation in parallel ─
        geo_coro = get_approximate_location(request)
        if checked_url:
            analysis, emotional, vt_result, geo = await asyncio.gather(
                mistral_svc.analyze_text_threat(embed_text),
                mistral_svc.detect_emotional_scores(embed_text),
                vt_svc.check_url(checked_url),
                geo_coro,
            )
        else:
            analysis, emotional, geo = await asyncio.gather(
                mistral_svc.analyze_text_threat(embed_text),
                mistral_svc.detect_emotional_scores(embed_text),
                geo_coro,
            )
            vt_result = None

        analysis = _merge_emotional(analysis, emotional)

        # IP region takes priority; AI detection is the fallback (covers localhost/dev)
        ip_region: str | None = None
        if geo.get("city") and geo.get("country"):
            ip_region = f"{geo['city']}, {geo['country']}"
        elif geo.get("country"):
            ip_region = geo["country"]
        final_region = ip_region or analysis.get("region")

    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"AI API error: {exc.response.status_code}")
    except (json.JSONDecodeError, KeyError) as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected AI response: {exc}")
    except Exception as exc:
        raise HTTPException(status_code=502, detail=f"Analysis failed: {exc}")

    # ── VirusTotal risk boost ─────────────────────────────────────────────────
    base_risk = _safe_int(analysis.get("risk_score"))
    if vt_result and vt_result.get("malicious", 0) > 0:
        boost = min(10 + vt_result["malicious"], 15)
        base_risk = min(base_risk + boost, 100)
    analysis["risk_score"] = base_risk

    # ── Embed + similarity ────────────────────────────────────────────────────
    emb = await embeddings.generate_embedding(embed_text)
    if emb:
        print(f"[analyze] embedding OK — dims={len(emb)}, first3={[round(v,4) for v in emb[:3]]}")
    else:
        print("[analyze] embedding is None — skipping similarity search, similar_count=0")

    similar_rows = await embeddings.find_similar(db, emb) if emb else []
    print(f"[analyze] similar_rows found={len(similar_rows)}, scores={[round(d,4) for _,d in similar_rows]}")
    similar_ids = [rid for rid, _ in similar_rows]

    # ── Persist ───────────────────────────────────────────────────────────────
    incident = Incident(
        threat_type       =analysis.get("threat_type") or "unknown",
        region            =final_region,
        risk_score        =_safe_int(analysis.get("risk_score")),
        emotional_pressure=analysis.get("emotional_pressure") or "low",
        urgency_score     =_safe_int(analysis.get("urgency_score")),
        coercion_score    =_safe_int(analysis.get("coercion_score")),
        authority_score   =_safe_int(analysis.get("authority_score")),
        entities          =analysis.get("entities") or {"phones": [], "domains": [], "keywords": []},
        raw_content       =embed_text[:4000],
        embedding         =emb,
        similar_count     =len(similar_ids),
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)

    report = ThreatReport(
        incident_id         =str(incident.id),
        risk_score          =incident.risk_score,
        threat_type         =incident.threat_type,
        emotional_pressure  =incident.emotional_pressure,
        urgency_score       =incident.urgency_score,
        coercion_score      =incident.coercion_score,
        authority_score     =incident.authority_score,
        entities            =incident.entities,
        similar_count       =incident.similar_count,
        recommended_actions =analysis.get("recommended_actions", []),
        panic_interrupt     =incident.risk_score > 75,
        manipulation_summary=analysis.get("manipulation_summary"),
        virustotal          =vt_result,
        analyzed_content    =embed_text[:3000],
        region              =incident.region,
    )

    incident_payload = {
        "incident_id":        report.incident_id,
        "threat_type":        report.threat_type,
        "region":             incident.region or "",
        "risk_score":         report.risk_score,
        "emotional_pressure": report.emotional_pressure,
        "panic_interrupt":    report.panic_interrupt,
        "entities":           report.entities,
    }

    if report.risk_score >= 80:
        asyncio.create_task(make_svc.trigger_high_risk_alert(incident_payload))
        asyncio.create_task(zavu_svc.send_threat_alert(incident_payload))

    if report.similar_count >= 5:
        cluster_payload = {
            "cluster_id":     report.incident_id,
            "threat_type":    report.threat_type,
            "region":         incident.region or "",
            "incident_count": report.similar_count,
            "top_keywords":   report.entities.get("keywords", [])[:5],
            "risk_score":     report.risk_score,
        }
        asyncio.create_task(make_svc.trigger_new_cluster(cluster_payload))

    return report
