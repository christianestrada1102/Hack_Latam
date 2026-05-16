from fastapi import APIRouter, Depends
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter()


class StatsResponse(BaseModel):
    total_incidents_24h: int
    active_campaigns: int
    avg_risk_score: float
    top_threat_types: dict[str, int]
    top_countries: dict[str, int]


@router.get("/", response_model=StatsResponse)
async def get_stats(db: AsyncSession = Depends(get_db)):
    # TODO: aggregate from incidents table
    return StatsResponse(
        total_incidents_24h=0,
        active_campaigns=0,
        avg_risk_score=0.0,
        top_threat_types={},
        top_countries={},
    )
