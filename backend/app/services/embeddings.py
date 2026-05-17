"""
OpenRouter embeddings + pgvector cosine similarity search.
Model: openai/text-embedding-3-small → 1536-dim, matches vector(1536).
"""
from typing import Optional

import httpx
from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings

_OPENROUTER_BASE = "https://openrouter.ai/api/v1"
_EMBED_MODEL = "openai/text-embedding-3-small"
_MAX_CHARS = 8000


async def generate_embedding(content: str) -> Optional[list[float]]:
    """
    Generate a 1536-dim embedding via OpenRouter.
    Returns None when OPENROUTER_API_KEY is not set — callers must guard.
    """
    if not settings.openrouter_api_key:
        return None

    async with httpx.AsyncClient(timeout=30) as client:
        resp = await client.post(
            f"{_OPENROUTER_BASE}/embeddings",
            headers={
                "Authorization": f"Bearer {settings.openrouter_api_key}",
                "HTTP-Referer": "https://hacklatam.app",
                "X-Title": "HackLatam",
            },
            json={
                "model": _EMBED_MODEL,
                "input": content[:_MAX_CHARS],
            },
        )
        resp.raise_for_status()
        return resp.json()["data"][0]["embedding"]


async def find_similar(
    db: AsyncSession,
    embedding: list[float],
    limit: int = 5,
) -> list[tuple[str, float]]:
    """
    Return up to `limit` (id, cosine_distance) pairs ordered by cosine distance.
    Uses pgvector's approximate nearest-neighbor index.
    """
    if not embedding:
        return []

    vec_str = "[" + ",".join(f"{v:.8f}" for v in embedding) + "]"

    result = await db.execute(
        text("""
            SELECT id::text, (embedding <=> CAST(:vec AS vector)) AS dist
            FROM   incidents
            WHERE  embedding IS NOT NULL
            ORDER  BY dist
            LIMIT  :limit
        """),
        {"vec": vec_str, "limit": limit},
    )
    return [(row[0], float(row[1])) for row in result.fetchall()]
