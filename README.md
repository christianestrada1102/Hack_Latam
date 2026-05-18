<div align="center">
  <h1>HAVEN</h1>
  <p><strong>Inteligencia Defensiva Colectiva para América Latina</strong></p>

  <p>
    <img src="https://img.shields.io/badge/FastAPI-009688?style=flat&logo=fastapi&logoColor=white" />
    <img src="https://img.shields.io/badge/React-61DAFB?style=flat&logo=react&logoColor=black" />
    <img src="https://img.shields.io/badge/PostgreSQL-4169E1?style=flat&logo=postgresql&logoColor=white" />
    <img src="https://img.shields.io/badge/Mistral_AI-FF7000?style=flat" />
    <img src="https://img.shields.io/badge/Railway-0B0D0E?style=flat&logo=railway&logoColor=white" />
    <img src="https://img.shields.io/badge/Vercel-000000?style=flat&logo=vercel&logoColor=white" />
    <img src="https://img.shields.io/badge/license-MIT-green?style=flat" />
  </p>

  <p>
    <a href="https://haven-lat.codebynas.dev">🌐 Demo en vivo</a> ·
    <a href="https://hacklatam-production.up.railway.app/health">⚡ API Status</a> ·
    <a href="https://github.com/christianestrada1102/Hack_Latam">📦 Repositorio</a>
  </p>
</div>

---

## ¿Qué es HAVEN?

HAVEN es una plataforma de inteligencia defensiva colectiva que permite a cualquier ciudadano de América Latina detectar fraudes digitales en segundos. Sin registro. Sin datos personales. 100% anónimo.

Cada análisis realizado alimenta la inteligencia colectiva. Si alguien en Chihuahua detecta una campaña de phishing, el próximo usuario que encuentre el mismo fraude ya sabe cuántos casos similares existen, en qué región, y qué tan peligroso es.

> Construido en 72 horas para **hack@latam 2025** · Track DEF/ACC  
> por **[Christian Estrada](https://github.com/christianestrada1102)** (@CodeByNas)

---

## El Problema

El fraude digital en LATAM es sistémico:

| Métrica | Dato |
|---------|------|
| Intentos de phishing en LATAM (2024) | 697,000,000 |
| Mexicanos víctimas de fraude digital | 13,500,000 |
| Víctimas que denuncian formalmente | 9% |
| Pérdida promedio por caso | $8,750 MXN |
| Ataques por minuto en la región | 1,326 |

*Fuente: CONDUSEF · ENVIPE 2025 · Kaspersky · The CIU*

---

## Demo en Vivo

🌐 **[haven-lat.codebynas.dev](https://haven-lat.codebynas.dev)**

| Sección | Descripción |
|---------|-------------|
| Landing | Globe 3D interactivo con amenazas en tiempo real |
| Scanner | Analiza texto, imagen, URL y audio |
| Dashboard | Mapa de amenazas LATAM + estadísticas |
| Feed | Todos los incidentes detectados, buscables |
| Alertas | Incidentes críticos con score ≥ 75 |

---

## Funcionalidades

### 🔍 Scanner Unificado

| Input | Tecnología | Capacidad |
|-------|-----------|-----------|
| Texto | Mistral Small 3.2 24B | Mensajes SMS, email, WhatsApp |
| Imagen | Mistral Pixtral Large 2411 | OCR de screenshots via visión multimodal |
| URL | VirusTotal API | Verificación contra 90+ motores antivirus |
| Audio | Whisper Large V3 Turbo / Groq | Transcripción de llamadas y notas de voz |

### 🧠 Análisis Psicológico

HAVEN detecta las tácticas de manipulación emocional más comunes en fraudes digitales:

- **Urgencia artificial** — presión de tiempo falsa para evitar verificación
- **Suplantación de autoridad** — impersonación de bancos, SAT, IMSS, CFE
- **Coerción** — amenazas de consecuencias graves o irreversibles
- **Ingeniería social** — manipulación emocional para bajar la guardia

Cada vector se puntúa de 0–100 usando Claude Haiku 4.5.

### 🌐 Inteligencia Colectiva

```
Usuario analiza mensaje sospechoso
↓
IA extrae texto, clasifica amenaza
↓
pgvector busca incidentes similares en DB
↓
"34 casos similares detectados en Chihuahua"
↓
Incidente guardado anónimamente
↓
Siguiente usuario ya tiene contexto
```

### ⚡ Pipeline Completo

```
Input (texto / imagen / URL / audio)
↓
Extracción de contenido
├── OCR con Mistral Pixtral (imágenes)
├── Transcripción con Whisper/Groq (audio)
├── Fetch + parse HTML (URLs)
└── Texto directo
↓
Análisis paralelo (asyncio.gather)
├── Mistral Small → clasificación + región + entidades
├── Claude Haiku → presión emocional + vectores psicológicos
└── VirusTotal → verificación de dominios extraídos
↓
pgvector similarity search (embeddings 1536 dims)
↓
Score de riesgo 0-100 con panic layer (score > 75)
↓
Almacenamiento anónimo en PostgreSQL
↓
Si score ≥ 90:
├── SMS alert via Zavu a todos los suscriptores
└── 3 workflows Make.com activados
```

---

## Stack Técnico

### Frontend

```
Vite + React 18          → Framework principal
Tailwind CSS + DaisyUI   → Estilos y componentes
GSAP + ScrollTrigger     → Animaciones de scroll
Globe.gl                 → Globo 3D interactivo (landing)
MapLibre GL              → Mapa de amenazas (dashboard)
Harmond OTF              → Tipografía display
Geist                    → Tipografía UI
JetBrains Mono           → Tipografía de datos
OffBit Trial Pixel       → Tipografía decorativa
```

### Backend

```
FastAPI                  → Framework principal async
PostgreSQL + pgvector    → Base de datos + similitud semántica
SQLAlchemy async         → ORM
asyncpg                  → Driver PostgreSQL async
httpx                    → Cliente HTTP async
python-multipart         → Manejo de archivos
```

### Modelos de IA

| Modelo | Proveedor | Uso |
|--------|-----------|-----|
| Mistral Pixtral Large 2411 | OpenRouter | OCR de imágenes |
| Mistral Small 3.2 24B | OpenRouter | Clasificación de amenazas |
| Claude Haiku 4.5 | OpenRouter | Detección emocional |
| Whisper Large V3 Turbo | Groq | Transcripción de audio |
| Text Embedding 3 Small | OpenRouter | Vectores semánticos |

### Integraciones

| Servicio | Función |
|----------|---------|
| VirusTotal API | Verificación de dominios y URLs maliciosas |
| Zavu SMS | Alertas por mensaje de texto a suscriptores |
| Make.com | 3 workflows de automatización inteligente |
| ip-api.com | Geolocalización anónima por IP |

### Make.com Workflows

| Workflow | Trigger | Acción |
|----------|---------|--------|
| High-risk alert | score ≥ 90 | Resumen con Claude + notificación inmediata |
| Regional spike | 5+ incidentes/hora misma región | Alerta comunitaria regional |
| New cluster | Nuevo campaign_id detectado | Reporte de nueva campaña activa |

### Deploy

| Servicio | Plataforma | URL |
|----------|-----------|-----|
| Frontend | Vercel | haven-lat.codebynas.dev |
| Backend + DB | Railway | hacklatam-production.up.railway.app |

---

## Estructura del Proyecto

```
hack_Latam/
├── frontend/
│   ├── public/
│   │   ├── fonts/              # Harmond OTF, OffBit Pixel
│   │   ├── HAVEN_ICO.svg       # Favicon
│   │   └── vercel.json         # SPA routing config
│   └── src/
│       ├── pages/
│       │   ├── Landing.jsx     # Landing con Globe.gl + GSAP
│       │   ├── Dashboard.jsx   # Dashboard con mapa real
│       │   ├── ThreatScanner.jsx  # Scanner unificado
│       │   ├── IntelligenceFeed.jsx  # Feed de incidentes
│       │   └── Alerts.jsx      # Alertas críticas
│       ├── components/
│       │   ├── Sidebar.jsx
│       │   ├── Header.jsx
│       │   ├── ThreatMap.jsx   # Mapa MapLibre GL
│       │   ├── LoadingSpinner.jsx
│       │   └── RotatePrompt.jsx   # Mobile landscape prompt
│       └── lib/
│           ├── api.js          # Cliente HTTP → Railway
│           └── i18n.js         # ES/EN translations
└── backend/
    ├── app/
    │   ├── routers/
    │   │   ├── analyze.py      # POST /api/analyze
    │   │   └── feed.py         # GET /api/feed/*
    │   ├── services/
    │   │   ├── mistral.py      # OCR + análisis IA
    │   │   ├── embeddings.py   # pgvector similarity
    │   │   ├── virustotal.py   # Verificación URLs
    │   │   ├── zavu.py         # SMS alerts
    │   │   └── make.py         # Make.com webhooks
    │   ├── models/
    │   │   ├── incident.py     # Modelo incidente
    │   │   └── subscriber.py   # Modelo suscriptor SMS
    │   ├── database.py         # SQLAlchemy config
    │   └── main.py             # FastAPI app + CORS
    ├── seed.py                 # 35 incidentes reales LATAM
    └── .env.example            # Variables requeridas
```

---

## Instalación Local

### Prerequisitos

- Python 3.11+
- Node.js 18+
- PostgreSQL con extensión pgvector

### Backend

```bash
cd backend
python -m venv .venv

# Windows
.venv\Scripts\activate
# macOS/Linux
source .venv/bin/activate

pip install -r requirements.txt
cp .env.example .env
# Edita .env con tus API keys

uvicorn app.main:app --reload
# API disponible en http://localhost:8000
# Docs en http://localhost:8000/docs
```

### Frontend

```bash
cd frontend
npm install

# Crea .env con:
# VITE_API_URL=http://localhost:8000

npm run dev
# App disponible en http://localhost:5173
```

### Seed de datos iniciales

```bash
cd backend
python seed.py
# Inserta 35 incidentes reales de LATAM/Chihuahua
```

---

## Variables de Entorno

### Backend (`.env`)

```env
# Base de datos
DATABASE_URL=postgresql+asyncpg://user:pass@host:port/db

# IA - OpenRouter
OPENROUTER_API_KEY=sk-or-...

# Audio - Groq
GROQ_API_KEY=gsk_...

# Alertas SMS - Zavu
ZAVU_API_KEY=zv_live_...

# Automatización - Make.com
MAKE_WEBHOOK_URL=https://hook.us2.make.com/...

# Verificación de URLs
VIRUSTOTAL_API_KEY=...

# Alertas al admin (fallback)
ALERT_PHONE=+52...

# Admin API
HAVEN_ADMIN_KEY=...
```

### Frontend (`.env`)

```env
VITE_API_URL=https://hacklatam-production.up.railway.app
```

---

## API Reference

| Endpoint | Método | Descripción |
|----------|--------|-------------|
| `/health` | GET | Status del servidor |
| `/api/analyze` | POST | Analiza contenido (multipart) |
| `/api/feed/` | GET | Lista de incidentes |
| `/api/feed/stats` | GET | Estadísticas globales |
| `/api/feed/alerts` | GET | Incidentes con score ≥ 75 |
| `/api/feed/campaigns` | GET | Top campañas activas |
| `/api/feed/{id}/report` | PATCH | Reportar incidente |
| `/api/alerts/subscribe` | POST | Suscribir número a alertas SMS |

Documentación interactiva: `https://hacklatam-production.up.railway.app/docs`

---

## Casos de Uso Reales

HAVEN fue diseñado con base en casos documentados en Chihuahua y LATAM:

- **BBVA Clone** — sitio falso activo dic. 2025, miles de víctimas en Monterrey y CDMX
- **CFE Phishing SMS** — adeudos falsos con links maliciosos, Chihuahua frontera norte
- **Empleos falsos WhatsApp** — trabajo remoto fraudulento solicitando CURP y RFC
- **Secuestro virtual** — extorsión telefónica CJNG, Chihuahua 2025 (audio real analizado)
- **ARAS Business Group** — ~$900M MXN, 7,000 víctimas
- **Yox Holding** — $2,000M MXN, capturado en Las Vegas

---

## Licencia

```
MIT License
Copyright (c) 2026 Christian Estrada

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT.
```

---

<div align="center">
  <p>
    Construido con IA para proteger a LATAM<br>
    <strong>hack@latam 2026 · Track DEF/ACC</strong>
  </p>


<p align="center">

  <a href="https://haven-lat.codebynas.dev">

    🌐 Demo

  </a>

  ·

  <a href="https://github.com/christianestrada1102/Hack_Latam">

    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/github/github-original.svg" width="14" style="vertical-align:middle;" />

    GitHub

  </a>

  ·

  <a href="https://www.linkedin.com/in/christian-estrada-a59130386?utm_source=share_via&utm_content=profile&utm_medium=member_ios">

    <img src="https://cdn.jsdelivr.net/gh/devicons/devicon/icons/linkedin/linkedin-original.svg" width="14" style="vertical-align:middle;" />

    LinkedIn

  </a>

</p>


  <p>
    <sub>© 2026 CodeByNas · MIT License</sub>
  </p>
</div>
