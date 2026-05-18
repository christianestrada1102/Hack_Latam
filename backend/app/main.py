from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.models import Incident, AlertSubscriber  # noqa: F401 — registers models with Base.metadata
from app.routers import analyze, feed
from app.routers import alerts
from app.services import zavu as zavu_svc


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(
    title="HackLatam API",
    description="Civilian threat intelligence platform for Latin America",
    version="0.1.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_origin_regex=r"https://.*\.vercel\.app",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api",          tags=["analyze"])
app.include_router(feed.router,    prefix="/api/feed",    tags=["feed"])
app.include_router(alerts.router,  prefix="/api/alerts",  tags=["alerts"])


@app.get("/health")
async def health():
    return {"status": "ok", "version": "0.1.0"}


@app.get("/test/zavu")
async def test_zavu():
    mock_incident = {
        "incident_id":        "test-001",
        "threat_type":        "smishing",
        "region":             "Chihuahua, MX",
        "risk_score":         92,
        "emotional_pressure": "critical",
        "panic_interrupt":    True,
        "entities": {
            "phones":   ["+52 614-822-5511"],
            "domains":  [],
            "keywords": ["urgente", "empleo", "CURP"],
        },
    }
    await zavu_svc.send_threat_alert(mock_incident)
    return {"status": "sent", "alert_phone": zavu_svc.settings.alert_phone or "not set"}
