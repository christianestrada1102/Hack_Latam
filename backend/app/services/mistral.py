"""
AI model integrations via OpenRouter for threat analysis.

Models used:
  mistralai/pixtral-12b            — vision analysis for images
  mistralai/mistral-small-3.2-24b  — text/URL threat classification
  anthropic/claude-haiku-4-5       — emotional pressure detection

Audio transcription uses the Mistral API directly (only provider
that accepts base64 audio_url in the current integration).
"""
import base64
import json

import httpx

from app.config import settings

_OPENROUTER_BASE = "https://openrouter.ai/api/v1"
_MISTRAL_BASE    = "https://api.mistral.ai/v1"

_PIXTRAL       = "mistralai/pixtral-12b"
_MISTRAL_SMALL = "mistralai/mistral-small-3.2-24b"
_HAIKU         = "anthropic/claude-haiku-4-5"

_ANALYSIS_SCHEMA = """\
{
  "risk_score": <integer 0-100>,
  "threat_type": "<phishing|smishing|vishing|scam|malware|unknown>",
  "emotional_pressure": "<low|medium|high|critical>",
  "urgency_score": <integer 0-100>,
  "coercion_score": <integer 0-100>,
  "authority_score": <integer 0-100>,
  "region": "<detected city/country or null>",
  "entities": {
    "phones": ["<phone numbers found>"],
    "domains": ["<domains/URLs found>"],
    "keywords": ["<manipulation keywords>"]
  },
  "recommended_actions": ["<action>"]
}"""

_EMOTIONAL_SCHEMA = """\
{
  "emotional_pressure": "<low|medium|high|critical>",
  "urgency_score": <integer 0-100>,
  "coercion_score": <integer 0-100>,
  "authority_score": <integer 0-100>
}"""


def _or_headers() -> dict:
    return {
        "Authorization": f"Bearer {settings.openrouter_api_key}",
        "Content-Type":  "application/json",
        "HTTP-Referer":  "http://localhost:5173",
        "X-Title":       "HackLatam",
    }


def _parse_json(raw: str) -> dict:
    """Parse JSON from model output, stripping markdown code fences if present."""
    raw = raw.strip()
    if raw.startswith("```"):
        parts = raw.split("```")
        content = parts[1]
        if content.startswith("json"):
            content = content[4:]
        raw = content.strip()
    return json.loads(raw)


def _empty_analysis() -> dict:
    return {
        "risk_score":          0,
        "threat_type":         "unknown",
        "emotional_pressure":  "low",
        "urgency_score":       0,
        "coercion_score":      0,
        "authority_score":     0,
        "region":              None,
        "entities":            {"phones": [], "domains": [], "keywords": []},
        "recommended_actions": ["Configure OPENROUTER_API_KEY para análisis real."],
    }


async def _or_chat(model: str, messages: list, timeout: int = 30) -> str:
    payload = {"model": model, "messages": messages, "temperature": 0.1}
    print(f"[OpenRouter] POST {_OPENROUTER_BASE}/chat/completions")
    print(f"[OpenRouter] model={model}")
    print(f"[OpenRouter] payload={json.dumps(payload, ensure_ascii=False)[:2000]}")

    async with httpx.AsyncClient(timeout=timeout) as client:
        resp = await client.post(
            f"{_OPENROUTER_BASE}/chat/completions",
            headers=_or_headers(),
            json=payload,
        )

    print(f"[OpenRouter] status={resp.status_code}")
    if resp.status_code != 200:
        print(f"[OpenRouter] error body={resp.text}")
        resp.raise_for_status()

    return resp.json()["choices"][0]["message"]["content"]


# ── Image analysis (Pixtral vision) ───────────────────────────────────────────

async def analyze_image_vision(image_bytes: bytes, mime_type: str = "image/png") -> dict:
    """
    Send image directly to Pixtral-12b for full threat analysis.
    Returns a complete analysis dict matching the ThreatReport schema.
    """
    if not settings.openrouter_api_key:
        return _empty_analysis()

    b64 = base64.standard_b64encode(image_bytes).decode()

    messages = [{
        "role": "user",
        "content": [
            {
                "type": "image_url",
                "image_url": {"url": f"data:{mime_type};base64,{b64}"},
            },
            {
                "type": "text",
                "text": (
                    "You are a cybersecurity analyst specializing in digital fraud in Latin America.\n"
                    "Analyze this image for phishing, smishing, vishing, or scam indicators.\n"
                    "Extract all visible phone numbers, domains, URLs, and psychological manipulation tactics.\n\n"
                    "Return ONLY valid JSON — no markdown, no extra text:\n"
                    + _ANALYSIS_SCHEMA
                ),
            },
        ],
    }]

    raw = await _or_chat(_PIXTRAL, messages, timeout=60)
    return _parse_json(raw)


# ── Text / URL analysis (Mistral Small) ───────────────────────────────────────

async def analyze_text_threat(text: str) -> dict:
    """
    Classify a message or URL for threat indicators using Mistral Small.
    Returns a complete analysis dict matching the ThreatReport schema.
    """
    if not settings.openrouter_api_key:
        return _empty_analysis()

    messages = [{
        "role": "user",
        "content": (
            "You are a cybersecurity analyst specializing in digital fraud in Latin America.\n"
            "Analyze the following content for phishing, smishing, vishing, or scam indicators.\n\n"
            "Return ONLY valid JSON — no markdown, no extra text:\n"
            + _ANALYSIS_SCHEMA
            + "\n\nContent to analyze:\n"
            + text[:6000]
        ),
    }]

    raw = await _or_chat(_MISTRAL_SMALL, messages)
    return _parse_json(raw)


# ── Emotional pressure detection (Claude Haiku) ────────────────────────────────

async def detect_emotional_scores(content: str) -> dict:
    """
    Detect psychological manipulation tactics using Claude Haiku.
    Returns emotional_pressure, urgency_score, coercion_score, authority_score.
    """
    if not settings.openrouter_api_key:
        return {
            "emotional_pressure": "low",
            "urgency_score":      0,
            "coercion_score":     0,
            "authority_score":    0,
        }

    messages = [{
        "role": "user",
        "content": (
            "You are an expert in social engineering and psychological manipulation.\n"
            "Analyze the manipulation tactics in the following content.\n"
            "Score each dimension from 0 (none) to 100 (extreme).\n\n"
            "Return ONLY valid JSON — no markdown, no extra text:\n"
            + _EMOTIONAL_SCHEMA
            + "\n\nContent:\n"
            + content[:4000]
        ),
    }]

    raw = await _or_chat(_HAIKU, messages)
    return _parse_json(raw)


# ── Audio transcription (Mistral API) ─────────────────────────────────────────

async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/ogg") -> str:
    """
    Transcribe a voice note using Mistral's multimodal chat endpoint.
    Returns the raw transcription text.
    """
    if not settings.mistral_api_key:
        return "[Transcription skipped] Set MISTRAL_API_KEY to enable audio analysis."

    b64 = base64.standard_b64encode(audio_bytes).decode()

    async with httpx.AsyncClient(timeout=120) as client:
        resp = await client.post(
            f"{_MISTRAL_BASE}/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.mistral_api_key}",
                "Content-Type":  "application/json",
            },
            json={
                "model": "mistral-large-latest",
                "messages": [{
                    "role": "user",
                    "content": [
                        {
                            "type": "text",
                            "text": (
                                "Transcribe exactly what is said in this audio. "
                                "Output only the transcription — no commentary, no timestamps."
                            ),
                        },
                        {
                            "type": "audio_url",
                            "audio_url": {"url": f"data:{mime_type};base64,{b64}"},
                        },
                    ],
                }],
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
