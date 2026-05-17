from sqlalchemy import text
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings

db_url = settings.database_url
if db_url.startswith("postgresql://"):
    db_url = db_url.replace("postgresql://", "postgresql+asyncpg://", 1)

engine = create_async_engine(
    db_url,
    echo=False,
    pool_pre_ping=True,
)
SessionLocal = async_sessionmaker(engine, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def init_db() -> None:
    async with engine.begin() as conn:
        # pgvector extension must exist before creating the vector column
        await conn.execute(text("CREATE EXTENSION IF NOT EXISTS vector"))
        await conn.run_sync(Base.metadata.create_all)
        # Add community-reporting columns to existing deployments
        await conn.execute(text(
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS reported BOOLEAN NOT NULL DEFAULT FALSE"
        ))
        await conn.execute(text(
            "ALTER TABLE incidents ADD COLUMN IF NOT EXISTS report_count INTEGER NOT NULL DEFAULT 0"
        ))


async def get_db() -> AsyncSession:
    async with SessionLocal() as session:
        yield session
