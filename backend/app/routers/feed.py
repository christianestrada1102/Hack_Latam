from datetime import datetime, timedelta, timezone
from typing import Optional

from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel, ConfigDict
from sqlalchemy import cast, distinct, func, or_, select, Text
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db
from app.models import Incident

router = APIRouter()


class IncidentOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: str
    created_at: datetime
    threat_type: str
    region: Optional[str]
    risk_score: int
    emotional_pressure: str
    urgency_score: int
    coercion_score: int
    authority_score: int
    entities: dict
    similar_count: int
    campaign_id: Optional[str]


class StatsOut(BaseModel):
    total_24h: int
    active_campaigns: int
    regional_alerts: int
    avg_risk_score: float
    top_threat_types: dict[str, int]


class CampaignOut(BaseModel):
    campaign_id: str
    count: int
    max_risk: int


def _row_to_incident(inc) -> IncidentOut:
    return IncidentOut(
        id=str(inc.id),
        created_at=inc.created_at,
        threat_type=inc.threat_type,
        region=inc.region,
        risk_score=inc.risk_score,
        emotional_pressure=inc.emotional_pressure,
        urgency_score=inc.urgency_score,
        coercion_score=inc.coercion_score,
        authority_score=inc.authority_score,
        entities=inc.entities,
        similar_count=inc.similar_count,
        campaign_id=inc.campaign_id,
    )


@router.get("/alerts", response_model=list[IncidentOut])
async def list_alerts(db: AsyncSession = Depends(get_db)):
    """Incidents with risk_score >= 75, ordered by risk score descending."""
    q = (
        select(Incident)
        .where(Incident.risk_score >= 75)
        .order_by(Incident.risk_score.desc())
        .limit(50)
    )
    result = await db.execute(q)
    return [_row_to_incident(inc) for inc in result.scalars().all()]


@router.get("/campaigns", response_model=list[CampaignOut])
async def list_campaigns(db: AsyncSession = Depends(get_db)):
    """Top 10 campaigns by incident count."""
    result = await db.execute(
        select(
            Incident.campaign_id,
            func.count().label("count"),
            func.max(Incident.risk_score).label("max_risk"),
        )
        .where(Incident.campaign_id.isnot(None))
        .group_by(Incident.campaign_id)
        .order_by(func.count().desc())
        .limit(10)
    )
    return [
        CampaignOut(campaign_id=r.campaign_id, count=r.count, max_risk=r.max_risk)
        for r in result.all()
    ]


@router.get("/", response_model=list[IncidentOut])
async def list_incidents(
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0),
    region: Optional[str] = Query(None, description="Filter by region substring"),
    threat_type: Optional[str] = Query(None, description="phishing|smishing|vishing|scam|malware"),
    min_risk: Optional[int] = Query(None, ge=0, le=100, description="Minimum risk score"),
    search: Optional[str] = Query(None, description="Keyword search in threat_type, region, or entities"),
    db: AsyncSession = Depends(get_db),
):
    """Return latest incidents ordered by creation time, with optional filters."""
    q = select(Incident).order_by(Incident.created_at.desc())

    if region:
        q = q.where(Incident.region.ilike(f"%{region}%"))
    if threat_type:
        q = q.where(Incident.threat_type == threat_type)
    if min_risk is not None:
        q = q.where(Incident.risk_score >= min_risk)
    if search:
        q = q.where(
            or_(
                Incident.threat_type.ilike(f"%{search}%"),
                Incident.region.ilike(f"%{search}%"),
                cast(Incident.entities, Text).ilike(f"%{search}%"),
            )
        )

    q = q.offset(offset).limit(limit)
    result = await db.execute(q)
    return [_row_to_incident(inc) for inc in result.scalars().all()]


@router.get("/stats", response_model=StatsOut)
async def feed_stats(db: AsyncSession = Depends(get_db)):
    """Aggregate metrics for the dashboard — covers incidents from the last 24 hours."""
    cutoff = datetime.now(timezone.utc) - timedelta(hours=24)

    total_res = await db.execute(
        select(func.count()).select_from(Incident).where(Incident.created_at >= cutoff)
    )
    total_24h: int = total_res.scalar_one() or 0

    camp_res = await db.execute(
        select(func.count(distinct(Incident.campaign_id))).where(
            Incident.campaign_id.isnot(None)
        )
    )
    active_campaigns: int = camp_res.scalar_one() or 0

    alert_res = await db.execute(
        select(func.count())
        .select_from(Incident)
        .where(Incident.created_at >= cutoff, Incident.risk_score >= 80)
    )
    regional_alerts: int = alert_res.scalar_one() or 0

    avg_res = await db.execute(
        select(func.avg(Incident.risk_score)).where(Incident.created_at >= cutoff)
    )
    avg_raw = avg_res.scalar_one()
    avg_risk_score: float = round(float(avg_raw), 1) if avg_raw is not None else 0.0

    type_res = await db.execute(
        select(Incident.threat_type, func.count().label("cnt"))
        .where(Incident.created_at >= cutoff)
        .group_by(Incident.threat_type)
        .order_by(func.count().desc())
        .limit(5)
    )
    top_threat_types = {row.threat_type: row.cnt for row in type_res}

    return StatsOut(
        total_24h=total_24h,
        active_campaigns=active_campaigns,
        regional_alerts=regional_alerts,
        avg_risk_score=avg_risk_score,
        top_threat_types=top_threat_types,
    )
