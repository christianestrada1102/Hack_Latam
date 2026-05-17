"""
AI model integrations via OpenRouter for threat analysis.

Models used:
  mistralai/pixtral-12b            — vision analysis for images
  mistralai/mistral-small-3.2-24b-instruct-2506  — text/URL threat classification
  anthropic/claude-haiku-4-5       — emotional pressure detection

Audio transcription uses OpenRouter's STT endpoint with openai/whisper-1.
"""
import base64
import json

import httpx

from app.config import settings

_OPENROUTER_BASE = "https://openrouter.ai/api/v1"
_MISTRAL_BASE    = "https://api.mistral.ai/v1"

_PIXTRAL         = "mistralai/pixtral-large-2411"
_PIXTRAL_FALLBACK = "mistralai/mistral-small-3.1-24b-instruct:free"
_MISTRAL_SMALL = "mistralai/mistral-small-3.2-24b-instruct-2506"
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
    "keywords": ["<FULL SENTENCE describing the manipulation tactic, e.g. 'Usa urgencia artificial para presionar una decision rapida sin dar tiempo a verificar'>"]
  },
  "recommended_actions": ["<FULL SENTENCE action with explanation why, e.g. 'No hagas clic en ningun enlace del mensaje — los dominios falsos imitan sitios oficiales para robar tus credenciales'>"],
  "manipulation_summary": "<ONE PARAGRAPH in Spanish explaining what psychological tactics are used and why they are dangerous>"
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
    """Parse JSON from model output, handling markdown fences and leading/trailing text."""
    raw = raw.strip()

    # Strip markdown code fences
    if raw.startswith("```"):
        parts = raw.split("```")
        content = parts[1] if len(parts) > 1 else raw
        if content.startswith("json"):
            content = content[4:]
        raw = content.strip()

    # Try direct parse first
    try:
        return json.loads(raw)
    except json.JSONDecodeError:
        pass

    # Fall back: find the first { ... } block in the response
    start = raw.find("{")
    end   = raw.rfind("}")
    if start != -1 and end != -1 and end > start:
        return json.loads(raw[start:end + 1])

    raise json.JSONDecodeError("No JSON object found", raw, 0)


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
        "manipulation_summary": None,
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


# ── Image analysis (Pixtral vision OCR) ──────────────────────────────────────

async def extract_image_text(image_bytes: bytes, mime_type: str = "image/png") -> str:
    """
    Use Pixtral-12b to extract all visible text from an image.
    Returns the raw extracted text for further threat analysis.
    """
    if not settings.openrouter_api_key:
        return "[Image analysis skipped] Set OPENROUTER_API_KEY to enable."

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
                    "Extract all text from this image. "
                    "Return every word, number, URL, phone number, and domain visible. "
                    "Output only the extracted text — no commentary, no formatting."
                ),
            },
        ],
    }]

    try:
        return await _or_chat(_PIXTRAL, messages, timeout=60)
    except Exception as primary_exc:
        print(f"[extract_image_text] {_PIXTRAL} failed ({primary_exc}), retrying with {_PIXTRAL_FALLBACK}")
        return await _or_chat(_PIXTRAL_FALLBACK, messages, timeout=60)


# ── Text / URL analysis (Mistral Small) ───────────────────────────────────────

async def analyze_text_threat(text: str) -> dict:
    """
    Classify a message or URL for threat indicators using Mistral Small.
    Returns a complete analysis dict matching the ThreatReport schema.
    """
    print(f"[analyze_text_threat] type={type(text)} repr={repr(text)[:200]}")
    if not settings.openrouter_api_key:
        return _empty_analysis()

    messages = [{
        "role": "user",
        "content": (
            "You are a cybersecurity analyst specializing in digital fraud in Latin America.\n"
            "Analyze the following content for phishing, smishing, vishing, or scam indicators.\n"
            "Write ALL text fields (keywords, recommended_actions, manipulation_summary) in Spanish.\n"
            "keywords must be FULL SENTENCES describing each manipulation tactic — not single words.\n"
            "recommended_actions must be COMPLETE SENTENCES with an explanation of WHY each step matters.\n"
            "manipulation_summary must be ONE PARAGRAPH explaining what psychological tactics are used and why they are dangerous.\n\n"
            "Return ONLY valid JSON — no markdown, no extra text:\n"
            + _ANALYSIS_SCHEMA
            + "\n\nContent to analyze:\n"
            + str(text)[:6000]
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
            + str(content)[:4000]
        ),
    }]

    raw = await _or_chat(_HAIKU, messages)
    return _parse_json(raw)


# ── Audio transcription (Whisper via OpenRouter STT endpoint) ────────────────

_EXT_MAP = {
    "audio/mpeg":  "mp3",
    "audio/mp4":   "mp4",
    "audio/wav":   "wav",
    "audio/webm":  "webm",
    "audio/ogg":   "ogg",
    "audio/m4a":   "m4a",
    "audio/x-m4a": "m4a",
}


async def transcribe_audio(audio_bytes: bytes, mime_type: str = "audio/ogg") -> str:
    """
    Transcribe audio using Whisper via OpenRouter's dedicated STT endpoint.
    Returns the raw transcription text.
    """
    if not settings.openrouter_api_key:
        return "[Transcription skipped] Set OPENROUTER_API_KEY to enable audio analysis."

    ext = _EXT_MAP.get(mime_type.lower(), "mp3")

    try:
        async with httpx.AsyncClient(timeout=60) as client:
            resp = await client.post(
                f"{_OPENROUTER_BASE}/audio/transcriptions",
                headers={
                    "Authorization": f"Bearer {settings.openrouter_api_key}",
                    "HTTP-Referer": "http://localhost:5173",
                    "X-Title":      "HackLatam",
                },
                files={"file": (f"audio.{ext}", audio_bytes, mime_type)},
                data={"model": "openai/whisper-1"},
            )

        if resp.status_code != 200:
            raise Exception(f"STT error {resp.status_code}: {resp.text}")

        return resp.json().get("text", "")
    except Exception as exc:
        return f"[Transcription failed: {exc}]"
