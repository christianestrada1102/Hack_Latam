import uuid
from datetime import datetime, timezone

from pgvector.sqlalchemy import Vector
from sqlalchemy import DateTime, Integer, String, Text
from sqlalchemy.dialects.postgresql import JSONB, UUID
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), primary_key=True, default=uuid.uuid4
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Classification
    threat_type: Mapped[str] = mapped_column(String(32), default="unknown")
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)
    risk_score: Mapped[int] = mapped_column(Integer, default=0)

    # Emotional manipulation vectors (0-100)
    emotional_pressure: Mapped[str] = mapped_column(String(16), default="low")  # low|medium|high|critical
    urgency_score: Mapped[int] = mapped_column(Integer, default=0)
    coercion_score: Mapped[int] = mapped_column(Integer, default=0)
    authority_score: Mapped[int] = mapped_column(Integer, default=0)

    # Structured extraction
    entities: Mapped[dict] = mapped_column(JSONB, default=dict)

    # Raw input
    raw_content: Mapped[str] = mapped_column(Text, default="")

    # pgvector: 1536-dim matches OpenRouter text-embedding-3-small
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1536), nullable=True)

    # Campaign linkage
    similar_count: Mapped[int] = mapped_column(Integer, default=0)
    campaign_id: Mapped[str | None] = mapped_column(String(64), nullable=True)
