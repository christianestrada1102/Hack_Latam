"""
Seed the database with 10 real Chihuahua/LATAM fraud incidents.

Usage (from backend/):
    python seed.py
"""
import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from app.database import SessionLocal, init_db
from app.models import Incident

_NOW = datetime.now(timezone.utc)


def _ago(minutes: int) -> datetime:
    return _NOW - timedelta(minutes=minutes)


SEED_INCIDENTS: list[dict] = [
    # ── 1 ─────────────────────────────────────────────────────────
    {
        "created_at":        _ago(2),
        "threat_type":       "smishing",
        "region":            "Chihuahua, MX",
        "risk_score":        92,
        "emotional_pressure": "critical",
        "urgency_score":     88,
        "coercion_score":    75,
        "authority_score":   70,
        "raw_content": (
            "URGENTE: Oportunidad de empleo en CFE — trabajo remoto, depósito diario $800 MXN. "
            "Envía nombre completo y CURP al 614-822-5511. Cupos limitados, responde HOY."
        ),
        "entities": {
            "phones":   ["+52 614-822-5511"],
            "domains":  [],
            "keywords": ["urgente", "empleo", "CFE", "depósito", "CURP", "cupos limitados"],
        },
        "similar_count": 34,
        "campaign_id":   "camp-empleo-remoto-001",
    },
    # ── 2 ─────────────────────────────────────────────────────────
    {
        "created_at":        _ago(5),
        "threat_type":       "phishing",
        "region":            "CDMX, MX",
        "risk_score":        88,
        "emotional_pressure": "critical",
        "urgency_score":     85,
        "coercion_score":    60,
        "authority_score":   91,
        "raw_content": (
            "Estimado cliente BBVA: Se detectó actividad inusual en su cuenta. "
            "Verifique sus datos en bbva-verificacion-cuenta.mx o su cuenta será bloqueada en 24h."
        ),
        "entities": {
            "phones":   [],
            "domains":  ["bbva-verificacion-cuenta.mx"],
            "keywords": ["actividad inusual", "bloqueada", "verifique", "24 horas"],
        },
        "similar_count": 18,
        "campaign_id":   "camp-bbva-fake-001",
    },
    # ── 3 ─────────────────────────────────────────────────────────
    {
        "created_at":        _ago(12),
        "threat_type":       "smishing",
        "region":            "Chihuahua, MX",
        "risk_score":        78,
        "emotional_pressure": "high",
        "urgency_score":     80,
        "coercion_score":    55,
        "authority_score":   82,
        "raw_content": (
            "CFE AVISO: Tiene un adeudo de $2,340 con corte programado para mañana. "
            "Pague ahora en: cfe-pagos-mx.com/pagar o llame al 800-333-0000."
        ),
        "entities": {
            "phones":   ["800-333-0000"],
            "domains":  ["cfe-pagos-mx.com"],
            "keywords": ["adeudo", "corte", "pague ahora"],
        },
        "similar_count": 9,
        "campaign_id":   "camp-cfe-sms-001",
    },
    # ── 4 ─────────────────────────────────────────────────────────
    {
        "created_at":        _ago(18),
        "threat_type":       "phishing",
        "region":            "Monterrey, MX",
        "risk_score":        71,
        "emotional_pressure": "high",
        "urgency_score":     72,
        "coercion_score":    50,
        "authority_score":   88,
        "raw_content": (
            "NOTIFICACIÓN SAT: Se detectó una discrepancia en su declaración anual. "
            "Tiene 48 horas para regularizarse en sat-verificacion.mx o enfrentará multas."
        ),
        "entities": {
            "phones":   [],
            "domains":  ["sat-verificacion.mx"],
            "keywords": ["discrepancia", "declaración", "multas", "48 horas"],
        },
        "similar_count": 5,
        "campaign_id":   None,
    },
    # ── 5 ─────────────────────────────────────────────────────────
    {
        "created_at":        _ago(31),
        "threat_type":       "scam",
        "region":            "Juárez, MX",
        "risk_score":        65,
        "emotional_pressure": "high",
        "urgency_score":     60,
        "coercion_score":    55,
        "authority_score":   45,
        "raw_content": (
            "Invierte con nosotros y obtén rendimientos del 300% en 30 días. "
            "Estrategia probada — más de 500 clientes satisfechos en Chihuahua. "
            "Inversión mínima $5,000. WhatsApp: 656-100-2234."
        ),
        "entities": {
            "phones":   ["+52 656-100-2234"],
            "domains":  [],
            "keywords": ["rendimientos", "300%", "inversión garantizada", "probada"],
        },
        "similar_count": 3,
        "campaign_id":   "camp-inversion-ponzi-001",
    },
    # ── 6 ─────────────────────────────────────────────────────────
    {
        "created_at":        _ago(47),
        "threat_type":       "scam",
        "region":            "Bogotá, CO",
        "risk_score":        45,
        "emotional_pressure": "medium",
        "urgency_score":     40,
        "coercion_score":    30,
        "authority_score":   20,
        "raw_content": (
            "Tienda de zapatos Nike outlet — liquidación final 70% descuento. "
            "Solo esta semana. Pedidos al inbox, envíos a todo Colombia."
        ),
        "entities": {
            "phones":   [],
            "domains":  [],
            "keywords": ["liquidación", "70% descuento", "outlet"],
        },
        "similar_count": 0,
        "campaign_id":   None,
    },
    # ── 7 ─────────────────────────────────────────────────────────
    {
        "created_at":        _ago(62),
        "threat_type":       "phishing",
        "region":            "Lima, PE",
        "risk_score":        55,
        "emotional_pressure": "medium",
        "urgency_score":     55,
        "coercion_score":    40,
        "authority_score":   60,
        "raw_content": (
            "MercadoLibre: Su paquete está retenido en aduana. "
            "Escanee el código QR adjunto para liberar el envío y pagar $45 de arancel."
        ),
        "entities": {
            "phones":   [],
            "domains":  [],
            "keywords": ["retenido", "aduana", "código QR", "arancel"],
        },
        "similar_count": 2,
        "campaign_id":   None,
    },
    # ── 8 ─────────────────────────────────────────────────────────
    {
        "created_at":        _ago(76),
        "threat_type":       "phishing",
        "region":            "Guadalajara, MX",
        "risk_score":        83,
        "emotional_pressure": "critical",
        "urgency_score":     80,
        "coercion_score":    65,
        "authority_score":   90,
        "raw_content": (
            "BBVA Seguridad: Detectamos un intento de acceso no autorizado desde Tijuana. "
            "Confirme su identidad en bbva-login-seguro.mx e ingrese su token para proteger su cuenta."
        ),
        "entities": {
            "phones":   [],
            "domains":  ["bbva-login-seguro.mx"],
            "keywords": ["acceso no autorizado", "token", "proteger", "confirme identidad"],
        },
        "similar_count": 18,
        "campaign_id":   "camp-bbva-fake-001",
    },
    # ── 9 ─────────────────────────────────────────────────────────
    {
        "created_at":        _ago(102),
        "threat_type":       "scam",
        "region":            "CDMX, MX",
        "risk_score":        61,
        "emotional_pressure": "high",
        "urgency_score":     58,
        "coercion_score":    50,
        "authority_score":   40,
        "raw_content": (
            "Grupo Bimbo está contratando repartidores. Sueldo $18,000/mes + prestaciones. "
            "Cuota de inscripción reembolsable: $500. Depósito a CLABE 021180040114145220."
        ),
        "entities": {
            "phones":   [],
            "domains":  [],
            "keywords": ["Bimbo", "inscripción", "reembolsable", "CLABE", "depósito"],
        },
        "similar_count": 1,
        "campaign_id":   None,
    },
    # ── 10 ────────────────────────────────────────────────────────
    {
        "created_at":        _ago(125),
        "threat_type":       "scam",
        "region":            "Buenos Aires, AR",
        "risk_score":        77,
        "emotional_pressure": "high",
        "urgency_score":     65,
        "coercion_score":    60,
        "authority_score":   55,
        "raw_content": (
            "¿Perdiste fondos en criptomonedas? Somos especialistas en recuperación. "
            "El 94% de nuestros clientes recuperan sus activos. "
            "Honorarios solo en caso de éxito. WhatsApp: +54 11 4555-3322."
        ),
        "entities": {
            "phones":   ["+54 11 4555-3322"],
            "domains":  [],
            "keywords": ["criptomonedas", "recuperación", "fondos perdidos", "honorarios"],
        },
        "similar_count": 0,
        "campaign_id":   None,
    },
]


async def seed() -> None:
    await init_db()

    async with SessionLocal() as db:
        for data in SEED_INCIDENTS:
            db.add(Incident(**data))
        await db.commit()

    print(f"✓ Seeded {len(SEED_INCIDENTS)} incidents into the database.")


if __name__ == "__main__":
    asyncio.run(seed())
