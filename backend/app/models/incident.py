import enum
from datetime import datetime, timezone
from sqlalchemy import String, Float, DateTime, Text, Enum as SAEnum
from sqlalchemy.orm import Mapped, mapped_column
from pgvector.sqlalchemy import Vector

from app.database import Base


class ThreatType(str, enum.Enum):
    phishing = "phishing"
    smishing = "smishing"
    vishing = "vishing"
    malware = "malware"
    scam = "scam"
    unknown = "unknown"


class Incident(Base):
    __tablename__ = "incidents"

    id: Mapped[int] = mapped_column(primary_key=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=lambda: datetime.now(timezone.utc)
    )

    # Input
    raw_content: Mapped[str] = mapped_column(Text)
    content_type: Mapped[str] = mapped_column(String(32))  # url | text | image | audio

    # Classification
    threat_type: Mapped[ThreatType] = mapped_column(SAEnum(ThreatType), default=ThreatType.unknown)
    risk_score: Mapped[float] = mapped_column(Float, default=0.0)   # 0.0 – 1.0
    confidence: Mapped[float] = mapped_column(Float, default=0.0)

    # Manipulation tactics detected (comma-separated tags)
    tactics: Mapped[str | None] = mapped_column(Text, nullable=True)

    # Geo
    country: Mapped[str | None] = mapped_column(String(2), nullable=True)   # ISO-3166-1 alpha-2
    region: Mapped[str | None] = mapped_column(String(128), nullable=True)

    # Semantic embedding for similarity / campaign clustering
    embedding: Mapped[list[float] | None] = mapped_column(Vector(1024), nullable=True)
