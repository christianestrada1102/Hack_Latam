from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from pydantic import BaseModel
from sqlalchemy.ext.asyncio import AsyncSession

from app.database import get_db

router = APIRouter()


class AnalyzeTextRequest(BaseModel):
    content: str
    content_type: str = "text"  # text | url


class AnalyzeResponse(BaseModel):
    incident_id: int | None
    threat_type: str
    risk_score: float
    confidence: float
    tactics: list[str]
    summary: str


@router.post("/text", response_model=AnalyzeResponse)
async def analyze_text(body: AnalyzeTextRequest, db: AsyncSession = Depends(get_db)):
    # TODO: call services/mistral.py for classification
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/image", response_model=AnalyzeResponse)
async def analyze_image(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    # TODO: call services/mistral.py vision endpoint
    raise HTTPException(status_code=501, detail="Not implemented")


@router.post("/audio", response_model=AnalyzeResponse)
async def analyze_audio(
    file: UploadFile = File(...), db: AsyncSession = Depends(get_db)
):
    # TODO: call services/mistral.py audio transcription + classification
    raise HTTPException(status_code=501, detail="Not implemented")
