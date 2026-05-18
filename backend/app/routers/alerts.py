import re

from fastapi import APIRouter, Depends, Header, HTTPException
from pydantic import BaseModel
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.config import settings
from app.database import get_db
from app.models.subscriber import AlertSubscriber

router = APIRouter()

_PHONE_RE = re.compile(r"^\+\d{10,15}$")


class SubscribeBody(BaseModel):
    phone: str


@router.post("/subscribe", status_code=201)
async def subscribe_alerts(body: SubscribeBody, db: AsyncSession = Depends(get_db)):
    phone = body.phone.strip().replace(" ", "").replace("-", "")
    if not _PHONE_RE.match(phone):
        raise HTTPException(
            status_code=422,
            detail="Número inválido. Debe iniciar con + y tener entre 10 y 15 dígitos (sin espacios ni guiones).",
        )

    result = await db.execute(select(AlertSubscriber).where(AlertSubscriber.phone == phone))
    sub = result.scalar_one_or_none()
    if sub:
        sub.active = True
    else:
        sub = AlertSubscriber(phone=phone)
        db.add(sub)
    await db.commit()
    return {"status": "subscribed", "phone": phone}


@router.get("/subscribers")
async def list_subscribers(
    x_admin_key: str = Header(default=""),
    db: AsyncSession = Depends(get_db),
):
    if not settings.haven_admin_key or x_admin_key != settings.haven_admin_key:
        raise HTTPException(status_code=403, detail="Forbidden")
    result = await db.execute(
        select(AlertSubscriber)
        .where(AlertSubscriber.active.is_(True))
        .order_by(AlertSubscriber.created_at.desc())
    )
    subs = result.scalars().all()
    return [
        {"id": str(s.id), "phone": s.phone, "created_at": s.created_at, "active": s.active}
        for s in subs
    ]
