import asyncio
import json
import re
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
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

        # ── Threat analysis + emotional scoring + VirusTotal in parallel ─────
        if checked_url:
            analysis, emotional, vt_result = await asyncio.gather(
                mistral_svc.analyze_text_threat(embed_text),
                mistral_svc.detect_emotional_scores(embed_text),
                vt_svc.check_url(checked_url),
            )
        else:
            analysis, emotional = await asyncio.gather(
                mistral_svc.analyze_text_threat(embed_text),
                mistral_svc.detect_emotional_scores(embed_text),
            )
            vt_result = None

        analysis = _merge_emotional(analysis, emotional)

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
    emb         = await embeddings.generate_embedding(embed_text)
    similar_ids = await embeddings.find_similar(db, emb) if emb else []

    # ── Persist ───────────────────────────────────────────────────────────────
    incident = Incident(
        threat_type       =analysis.get("threat_type") or "unknown",
        region            =analysis.get("region"),
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
    )

    incident_payload = {
        "incident_id":        report.incident_id,
        "threat_type":        report.threat_type,
        "region":             analysis.get("region") or "",
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
            "region":         analysis.get("region") or "",
            "incident_count": report.similar_count,
            "top_keywords":   report.entities.get("keywords", [])[:5],
            "risk_score":     report.risk_score,
        }
        asyncio.create_task(make_svc.trigger_new_cluster(cluster_payload))

    return report
