"""
Mistral AI integration — OCR and audio transcription.
Docs: https://docs.mistral.ai
"""
import base64

import httpx

from app.config import settings

_BASE = "https://api.mistral.ai/v1"
_HEADERS = lambda: {
    "Authorization": f"Bearer {settings.mistral_api_key}",
    "Content-Type": "application/json",
}


async def analyze_image(image_bytes: bytes, mime_type: str = "image/png") -> str:
    """
    Extract text from a screenshot or document image using mistral-ocr-latest.
    Returns the markdown text extracted from all pages concatenated.
    """
    if not settings.mistral_api_key:
        return "[OCR skipped] Set MISTRAL_API_KEY to enable image analysis."

    b64 = base64.standard_b64encode(image_bytes).decode()
    data_url = f"data:{mime_type};base64,{b64}"

    async with httpx.AsyncClient(timeout=60) as client:
        resp = await client.post(
            f"{_BASE}/ocr",
            headers=_HEADERS(),
            json={
                "model": "mistral-ocr-latest",
                "document": {
                    "type": "image_url",
                    "image_url": data_url,
                },
                "include_image_base64": False,
            },
        )
        resp.raise_for_status()
        pages = resp.json().get("pages", [])
        return "\n\n".join(p.get("markdown", "") for p in pages).strip()


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
            f"{_BASE}/chat/completions",
            headers=_HEADERS(),
            json={
                "model": "mistral-large-latest",
                "messages": [
                    {
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
                    }
                ],
            },
        )
        resp.raise_for_status()
        return resp.json()["choices"][0]["message"]["content"].strip()
