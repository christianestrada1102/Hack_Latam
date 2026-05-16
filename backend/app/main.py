from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.config import settings
from app.database import init_db
from app.routers import analyze, feed, stats


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
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(analyze.router, prefix="/api/analyze", tags=["analyze"])
app.include_router(feed.router,    prefix="/api/feed",    tags=["feed"])
app.include_router(stats.router,   prefix="/api/stats",   tags=["stats"])


@app.get("/health")
async def health():
    return {"status": "ok"}
