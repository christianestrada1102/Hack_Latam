from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter()


class IncidentSummary(BaseModel):
    id: int
    created_at: datetime
    threat_type: str
    risk_score: float
    content_type: str
    country: str | None
    region: str | None
    tactics: list[str]


@router.get("/", response_model=list[IncidentSummary])
async def list_incidents(
    limit: int = Query(50, le=200),
    offset: int = Query(0, ge=0),
    country: str | None = Query(None),
    db: AsyncSession = Depends(get_db),
):
    # TODO: query incidents from DB with optional country filter
    return []
