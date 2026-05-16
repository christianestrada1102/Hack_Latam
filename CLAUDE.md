# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

**Hack LATAM** — fullstack hackathon project.

Stack:
- **Frontend**: Vite + React + Tailwind CSS + DaisyUI
- **Backend**: FastAPI (Python)
- **Database**: PostgreSQL + pgvector

## Development Commands

Commands will be defined as the project is scaffolded. Expected patterns:

```bash
# Frontend (Vite + React)
npm run dev          # start dev server
npm run build        # production build
npm run lint         # ESLint
npm run preview      # preview production build locally

# Backend (FastAPI)
uvicorn main:app --reload           # start dev server
pytest                              # run all tests
pytest tests/test_foo.py::test_bar  # run single test
```

## Architecture

Monorepo with two top-level directories:
- `frontend/` — Vite + React SPA
- `backend/` — FastAPI app

API communication: frontend calls FastAPI REST endpoints directly. PostgreSQL is accessed server-side only via asyncpg or SQLAlchemy 2.0 async. pgvector is used for embedding-based similarity search.

## Skills

The `.agents/skills/` directory contains guidelines to apply when working in specific areas:

| Skill | When to apply |
|-------|--------------|
| `fastapi-python` | Writing FastAPI routes, Pydantic models, async DB calls |
| `tailwind-design-system` | Styling with Tailwind and DaisyUI components |
| `ui-ux-pro-max` + `interface-design` + `frontend-design` | UI components and visual design |
| `systematic-debugging` | Diagnosing non-obvious bugs |
| `error-handling-patterns` | Error handling strategy |
| `deploy-to-vercel` | Deploying the frontend to Vercel |

## Key Conventions

**Backend (FastAPI):**
- Use `async def` for all route handlers and DB calls
- Pydantic v2 models for all request/response schemas
- RORO pattern: functions receive objects and return objects
- Route files in `routers/`, shared utilities in `utils/`
- pgvector queries use cosine distance (`<=>`) for similarity search

**Frontend (Vite + React):**
- Functional components only, no class components
- Fetch in parallel with `Promise.all()` — never sequentially when independent
- DaisyUI components for base UI elements; extend with Tailwind utilities
- Direct imports only — no barrel files

**Database (PostgreSQL + pgvector):**
- Always index columns used in `WHERE`, `JOIN`, and `ORDER BY`
- Use `ivfflat` or `hnsw` index on vector columns before querying at scale
- Use partial indexes for filtered queries (e.g., `WHERE status = 'active'`)
