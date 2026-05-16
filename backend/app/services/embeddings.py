"""
pgvector-backed semantic similarity search.
Generates embeddings for incidents and finds nearest neighbors.
"""
import httpx
from sqlalchemy.ext.asyncio import AsyncSession
from app.config import settings


async def embed_text(text: str) -> list[float]:
    """Generate 1024-dim embedding via Mistral embeddings API."""
    # TODO: call mistral embed endpoint
    raise NotImplementedError


async def find_similar(
    db: AsyncSession, embedding: list[float], limit: int = 10, threshold: float = 0.85
) -> list[int]:
    """Return incident IDs within cosine distance threshold (<=>) of embedding."""
    # TODO: SELECT id FROM incidents ORDER BY embedding <=> :vec LIMIT :limit
    raise NotImplementedError
