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


def _merge_emotional(analysis: dict, emotional: dict) -> dict:
    """Override emotional scores in analysis with Claude Haiku's output."""
    return {
        **analysis,
        "emotional_pressure": emotional.get("emotional_pressure", analysis.get("emotional_pressure", "low")),
        "urgency_score":      int(emotional.get("urgency_score",  analysis.get("urgency_score",  0))),
        "coercion_score":     int(emotional.get("coercion_score", analysis.get("coercion_score", 0))),
        "authority_score":    int(emotional.get("authority_score",analysis.get("authority_score",0))),
    }


@router.post("/analyze", response_model=ThreatReport)
async def analyze(
    file: Optional[UploadFile] = File(default=None),
    text: Optional[str] = Form(default=None),
    url: Optional[str] = Form(default=None),
    db: AsyncSession = Depends(get_db),
):
    """
    Analyze content for digital threat indicators.

    Accepts one of:
    - multipart file: image/* → Pixtral vision | audio/* → Mistral transcription
    - form field `text`: message or SMS body → Mistral Small
    - form field `url`: suspicious link → Mistral Small

    Emotional pressure scores are always refined by Claude Haiku.
    """
    analysis:   dict = {}
    embed_text: str  = ""

    try:
        if file is not None:
            content_type = (file.content_type or "").lower()
            file_bytes   = await file.read()

            if content_type.startswith("image/"):
                # Pixtral extracts text; Mistral Small + Haiku analyze in parallel
                embed_text          = await mistral_svc.extract_image_text(file_bytes, content_type)
                analysis, emotional = await asyncio.gather(
                    mistral_svc.analyze_text_threat(embed_text),
                    mistral_svc.detect_emotional_scores(embed_text),
                )
                analysis = _merge_emotional(analysis, emotional)

            elif content_type.startswith("audio/"):
                # Transcribe first, then treat transcript like text
                embed_text          = await mistral_svc.transcribe_audio(file_bytes, content_type)
                analysis, emotional = await asyncio.gather(
                    mistral_svc.analyze_text_threat(embed_text),
                    mistral_svc.detect_emotional_scores(embed_text),
                )
                analysis = _merge_emotional(analysis, emotional)

            else:
                raise HTTPException(
                    status_code=415,
                    detail=f"Unsupported file type '{content_type}'. Use image/* or audio/*.",
                )

        elif text or url:
            raw_input = (text or url).strip()
            if not raw_input:
                raise HTTPException(status_code=422, detail="Content cannot be empty.")

            # For URLs: fetch page content and prepend it to the analysis input
            if url or raw_input.startswith(("http://", "https://")):
                try:
                    async with httpx.AsyncClient(timeout=10, follow_redirects=True) as client:
                        page = await client.get(raw_input)
                        html = page.text
                        visible = re.sub(r'<[^>]+>', ' ', html)
                        visible = re.sub(r'\s+', ' ', visible).strip()
                        embed_text = raw_input + "\n\n[Page content]\n" + visible[:2000]
                except Exception:
                    embed_text = raw_input
            else:
                embed_text = raw_input

            print(f"[analyze] embed_text repr={repr(embed_text)[:300]}")

            # Mistral Small + Claude Haiku in parallel
            analysis, emotional = await asyncio.gather(
                mistral_svc.analyze_text_threat(embed_text),
                mistral_svc.detect_emotional_scores(embed_text),
            )
            analysis = _merge_emotional(analysis, emotional)

        else:
            raise HTTPException(
                status_code=422,
                detail="Provide one of: file (image/audio), text, or url.",
            )

    except HTTPException:
        raise
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"AI API error: {exc.response.status_code}")
    except (json.JSONDecodeError, KeyError) as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected AI response: {exc}")

    # Generate embedding and find similar past incidents
    emb         = await embeddings.generate_embedding(embed_text)
    similar_ids = await embeddings.find_similar(db, emb) if emb else []

    # Persist incident
    incident = Incident(
        threat_type       =analysis.get("threat_type", "unknown"),
        region            =analysis.get("region"),
        risk_score        =int(analysis.get("risk_score", 0)),
        emotional_pressure=analysis.get("emotional_pressure", "low"),
        urgency_score     =int(analysis.get("urgency_score", 0)),
        coercion_score    =int(analysis.get("coercion_score", 0)),
        authority_score   =int(analysis.get("authority_score", 0)),
        entities          =analysis.get("entities", {"phones": [], "domains": [], "keywords": []}),
        raw_content       =embed_text[:4000],
        embedding         =emb,
        similar_count     =len(similar_ids),
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)

    report = ThreatReport(
        incident_id        =str(incident.id),
        risk_score         =incident.risk_score,
        threat_type        =incident.threat_type,
        emotional_pressure =incident.emotional_pressure,
        urgency_score      =incident.urgency_score,
        coercion_score     =incident.coercion_score,
        authority_score    =incident.authority_score,
        entities           =incident.entities,
        similar_count      =incident.similar_count,
        recommended_actions=analysis.get("recommended_actions", []),
        panic_interrupt    =incident.risk_score > 75,
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
