import asyncio
import json
from typing import Optional

import httpx
from fastapi import APIRouter, Depends, File, Form, HTTPException, UploadFile
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models import Incident
from app.services import embeddings, mistral
from app.services import make as make_svc
from app.services import zavu as zavu_svc

router = APIRouter()

OPENROUTER_BASE = "https://openrouter.ai/api/v1"

_ANALYSIS_PROMPT = """\
You are a cybersecurity analyst specializing in digital fraud in Latin America.
Analyze the following content for phishing, smishing, vishing, or scam indicators.

Return ONLY valid JSON — no markdown, no extra text — with this exact structure:
{{
  "risk_score": <integer 0-100>,
  "threat_type": "<phishing|smishing|vishing|scam|malware|unknown>",
  "emotional_pressure": "<low|medium|high|critical>",
  "urgency_score": <integer 0-100>,
  "coercion_score": <integer 0-100>,
  "authority_score": <integer 0-100>,
  "region": "<detected city/country, or null>",
  "entities": {{
    "phones": [],
    "domains": [],
    "keywords": []
  }},
  "recommended_actions": []
}}

Content to analyze:
{content}"""


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


async def _analyze_with_llm(raw: str) -> dict:
    """Call OpenRouter claude-3-5-haiku for structured threat analysis."""
    if not settings.openrouter_api_key:
        # Dev fallback when key is not configured
        return {
            "risk_score": 0,
            "threat_type": "unknown",
            "emotional_pressure": "low",
            "urgency_score": 0,
            "coercion_score": 0,
            "authority_score": 0,
            "region": None,
            "entities": {"phones": [], "domains": [], "keywords": []},
            "recommended_actions": ["Configure OPENROUTER_API_KEY para análisis real."],
        }

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{OPENROUTER_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "HTTP-Referer": "https://hacklatam.app",
                "X-Title": "HackLatam",
            },
            json={
                "model": "anthropic/claude-3-5-haiku",
                "messages": [
                    {
                        "role": "user",
                        "content": _ANALYSIS_PROMPT.format(content=raw[:6000]),
                    }
                ],
                "temperature": 0.1,
                "response_format": {"type": "json_object"},
            },
        )
        resp.raise_for_status()
        raw_json = resp.json()["choices"][0]["message"]["content"]
        return json.loads(raw_json)


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
    - multipart file (image/* → OCR, audio/* → transcription)
    - form field `text` (message or SMS body)
    - form field `url` (suspicious link)
    """
    # 1. Extract raw text from input
    raw: str = ""

    if file is not None:
        content_type = (file.content_type or "").lower()
        file_bytes = await file.read()

        if content_type.startswith("image/"):
            raw = await mistral.analyze_image(file_bytes, content_type)
        elif content_type.startswith("audio/"):
            raw = await mistral.transcribe_audio(file_bytes)
        else:
            raise HTTPException(
                status_code=415,
                detail=f"Unsupported file type '{content_type}'. Use image/* or audio/*.",
            )
    elif text:
        raw = text.strip()
    elif url:
        raw = url.strip()
    else:
        raise HTTPException(
            status_code=422,
            detail="Provide one of: file (image/audio), text, or url.",
        )

    if not raw:
        raise HTTPException(status_code=422, detail="Could not extract text from input.")

    # 2. Analyze with OpenRouter claude-3-5-haiku
    try:
        analysis = await _analyze_with_llm(raw)
    except httpx.HTTPStatusError as exc:
        raise HTTPException(status_code=502, detail=f"LLM API error: {exc.response.status_code}")
    except (json.JSONDecodeError, KeyError) as exc:
        raise HTTPException(status_code=502, detail=f"Unexpected LLM response: {exc}")

    # 3. Generate semantic embedding via OpenRouter
    emb = await embeddings.generate_embedding(raw)

    # 4. Find similar past incidents via pgvector cosine distance
    similar_ids = await embeddings.find_similar(db, emb) if emb else []

    # 5. Persist incident
    incident = Incident(
        threat_type=analysis.get("threat_type", "unknown"),
        region=analysis.get("region"),
        risk_score=int(analysis.get("risk_score", 0)),
        emotional_pressure=analysis.get("emotional_pressure", "low"),
        urgency_score=int(analysis.get("urgency_score", 0)),
        coercion_score=int(analysis.get("coercion_score", 0)),
        authority_score=int(analysis.get("authority_score", 0)),
        entities=analysis.get("entities", {"phones": [], "domains": [], "keywords": []}),
        raw_content=raw[:4000],
        embedding=emb,
        similar_count=len(similar_ids),
    )
    db.add(incident)
    await db.commit()
    await db.refresh(incident)

    report = ThreatReport(
        incident_id=str(incident.id),
        risk_score=incident.risk_score,
        threat_type=incident.threat_type,
        emotional_pressure=incident.emotional_pressure,
        urgency_score=incident.urgency_score,
        coercion_score=incident.coercion_score,
        authority_score=incident.authority_score,
        entities=incident.entities,
        similar_count=incident.similar_count,
        recommended_actions=analysis.get("recommended_actions", []),
        panic_interrupt=incident.risk_score > 75,
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
