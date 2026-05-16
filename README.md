# HackLatam — Civilian Threat Intelligence for LATAM

> Real-time phishing and digital fraud detection system powered by AI, built for Latin America.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Demo](https://img.shields.io/badge/demo-live-brightgreen)](https://hacklatam.vercel.app)

---

## The Problem

Latin America faces a **digital security crisis at scale**:

- **697 million phishing attempts per year** targeting the region
- **Chihuahua, Mexico** leads fraud cases along the northern border — a high-value corridor for cross-border financial crime
- Threat intelligence is fragmented, expensive, and inaccessible to citizens, SMEs, and local law enforcement
- Existing tools are built for enterprise, not the communities most at risk

---

## The Solution

**HackLatam** is a civilian-grade threat intelligence platform that:

1. **Scans and classifies** suspicious URLs, emails, screenshots, and audio messages using multimodal AI
2. **Detects emotional manipulation** patterns used in social engineering attacks (urgency, fear, authority)
3. **Clusters threat campaigns** by similarity — connecting isolated incidents into coordinated attacks
4. **Feeds a live map** of active threats across LATAM with heat zones and trend data
5. **Automates incident workflows** via Make.com for escalation, alerting, and reporting

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Frontend | Vite + React 18 + Tailwind CSS v3 + DaisyUI |
| Backend | FastAPI (Python) + asyncpg |
| Database | PostgreSQL + pgvector (semantic similarity) |
| AI / Vision | Mistral AI (OCR, vision, audio multimodal) |
| Automation | Make.com (3 workflows) |
| Maps | Leaflet + React Leaflet |
| Deploy | Vercel (frontend) + Railway / Fly.io (backend) |

---

## Setup

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL 15+ with pgvector extension

### Frontend

```bash
cd frontend
npm install
npm run dev
# → http://localhost:5173
```

### Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate  # Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env       # fill in your keys
uvicorn app.main:app --reload
# → http://localhost:8000
```

### Database

```sql
CREATE DATABASE hacklatam;
CREATE EXTENSION vector;
```

---

## Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

```
DATABASE_URL=postgresql+asyncpg://user:pass@localhost/hacklatam
MISTRAL_API_KEY=
OPENROUTER_API_KEY=
ZAVU_API_KEY=
MAKE_WEBHOOK_URL=
```

---

## Demo

**Live demo:** *(coming soon)*

---

## Special Prize Tracks

### Mistral AI
Multimodal analysis pipeline using Mistral's OCR, vision, and audio capabilities to parse phishing screenshots, voice notes, and scam documents in Spanish and Portuguese.

### Make.com
Three automation workflows:
1. **Incident intake** — webhook triggers classification pipeline on new report
2. **Alert escalation** — notifies authorities / CERT when confidence threshold exceeded  
3. **Weekly digest** — aggregates threat trends and sends regional summary reports

### DEF/ACC Track
Emotional manipulation detection engine that identifies psychological pressure tactics (urgency, fear, authority, scarcity) in phishing content — critical for protecting vulnerable populations in LATAM.

---

## License

MIT — see [LICENSE](LICENSE)
