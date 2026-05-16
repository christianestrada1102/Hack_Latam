"""
Seed the database with 35 realistic Chihuahua/LATAM fraud incidents.

Usage (from backend/):
    python seed.py
"""
import asyncio
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent))

from sqlalchemy import delete

from app.database import SessionLocal, init_db
from app.models import Incident

_NOW = datetime.now(timezone.utc)


def _ago(minutes: int) -> datetime:
    return _NOW - timedelta(minutes=minutes)


SEED_INCIDENTS: list[dict] = [
    # ── CHIHUAHUA, MX (10 incidents) ──────────────────────────────
    {
        "created_at": _ago(2),
        "threat_type": "smishing",
        "region": "Chihuahua, MX",
        "risk_score": 92,
        "emotional_pressure": "critical",
        "urgency_score": 88,
        "coercion_score": 75,
        "authority_score": 70,
        "raw_content": (
            "URGENTE: Oportunidad de empleo en CFE — trabajo remoto, depósito diario $800 MXN. "
            "Envía nombre completo y CURP al 614-822-5511. Cupos limitados, responde HOY."
        ),
        "entities": {
            "phones": ["+52 614-822-5511"],
            "domains": [],
            "keywords": ["urgente", "empleo", "CFE", "depósito", "CURP", "cupos limitados"],
        },
        "similar_count": 34,
        "campaign_id": "camp-empleo-remoto-001",
    },
    {
        "created_at": _ago(12),
        "threat_type": "smishing",
        "region": "Chihuahua, MX",
        "risk_score": 78,
        "emotional_pressure": "high",
        "urgency_score": 80,
        "coercion_score": 55,
        "authority_score": 82,
        "raw_content": (
            "CFE AVISO: Tiene un adeudo de $2,340 con corte programado para mañana. "
            "Pague ahora en: cfe-pagos-mx.com/pagar o llame al 800-333-0000."
        ),
        "entities": {
            "phones": ["800-333-0000"],
            "domains": ["cfe-pagos-mx.com"],
            "keywords": ["adeudo", "corte", "pague ahora"],
        },
        "similar_count": 9,
        "campaign_id": "camp-cfe-sms-001",
    },
    {
        "created_at": _ago(25),
        "threat_type": "vishing",
        "region": "Chihuahua, MX",
        "risk_score": 91,
        "emotional_pressure": "critical",
        "urgency_score": 92,
        "coercion_score": 85,
        "authority_score": 78,
        "raw_content": (
            "Llamada: 'Soy del IMSS, su hijo tuvo un accidente y está detenido. "
            "Necesitamos depósito de $8,000 para gastos médicos. No cuelgue.'"
        ),
        "entities": {
            "phones": ["+52 614-991-3300"],
            "domains": [],
            "keywords": ["IMSS", "accidente", "detenido", "depósito", "gastos médicos"],
        },
        "similar_count": 12,
        "campaign_id": None,
    },
    {
        "created_at": _ago(45),
        "threat_type": "phishing",
        "region": "Chihuahua, MX",
        "risk_score": 85,
        "emotional_pressure": "critical",
        "urgency_score": 83,
        "coercion_score": 62,
        "authority_score": 90,
        "raw_content": (
            "BBVA Bancomer: Detectamos acceso no autorizado desde Tijuana. "
            "Verifique su identidad en bbva-seguro-mx.com antes de las 18:00h o su cuenta será suspendida."
        ),
        "entities": {
            "phones": [],
            "domains": ["bbva-seguro-mx.com"],
            "keywords": ["acceso no autorizado", "suspendida", "verifique identidad"],
        },
        "similar_count": 22,
        "campaign_id": "camp-bbva-fake-001",
    },
    {
        "created_at": _ago(67),
        "threat_type": "smishing",
        "region": "Chihuahua, MX",
        "risk_score": 82,
        "emotional_pressure": "critical",
        "urgency_score": 79,
        "coercion_score": 68,
        "authority_score": 65,
        "raw_content": (
            "Empleo Amazon: Seleccionado para trabajo remoto $18,000/mes. "
            "Confirma en empleos-amazon-mx.com o pierde el cupo. Responde ACEPTO al 614-555-0011."
        ),
        "entities": {
            "phones": ["614-555-0011"],
            "domains": ["empleos-amazon-mx.com"],
            "keywords": ["Amazon", "trabajo remoto", "cupo", "seleccionado"],
        },
        "similar_count": 18,
        "campaign_id": "camp-empleo-remoto-001",
    },
    {
        "created_at": _ago(94),
        "threat_type": "smishing",
        "region": "Chihuahua, MX",
        "risk_score": 76,
        "emotional_pressure": "high",
        "urgency_score": 77,
        "coercion_score": 50,
        "authority_score": 80,
        "raw_content": (
            "CFE: Su servicio será cortado hoy por falta de pago. "
            "Evite el corte pagando en: cfe-chihuahua-pago.mx — Referencia: 1234567890."
        ),
        "entities": {
            "phones": [],
            "domains": ["cfe-chihuahua-pago.mx"],
            "keywords": ["cortado", "falta de pago", "referencia"],
        },
        "similar_count": 7,
        "campaign_id": "camp-cfe-sms-001",
    },
    {
        "created_at": _ago(128),
        "threat_type": "phishing",
        "region": "Chihuahua, MX",
        "risk_score": 79,
        "emotional_pressure": "high",
        "urgency_score": 75,
        "coercion_score": 58,
        "authority_score": 88,
        "raw_content": (
            "Banorte: Actividad sospechosa en su cuenta. "
            "Confirme sus datos en banorte-verificacion.com.mx para evitar bloqueo permanente."
        ),
        "entities": {
            "phones": [],
            "domains": ["banorte-verificacion.com.mx"],
            "keywords": ["actividad sospechosa", "bloqueo permanente", "confirme datos"],
        },
        "similar_count": 8,
        "campaign_id": "camp-bbva-fake-001",
    },
    {
        "created_at": _ago(195),
        "threat_type": "scam",
        "region": "Chihuahua, MX",
        "risk_score": 58,
        "emotional_pressure": "medium",
        "urgency_score": 50,
        "coercion_score": 42,
        "authority_score": 30,
        "raw_content": (
            "Venta de zapatos y ropa de marca a mitad de precio. "
            "Liquidación de temporada: Nike, Adidas, Gucci hasta -60%. DM para pedidos."
        ),
        "entities": {
            "phones": [],
            "domains": [],
            "keywords": ["liquidación", "marca", "Nike", "Adidas", "mitad de precio"],
        },
        "similar_count": 2,
        "campaign_id": None,
    },
    {
        "created_at": _ago(261),
        "threat_type": "phishing",
        "region": "Chihuahua, MX",
        "risk_score": 69,
        "emotional_pressure": "high",
        "urgency_score": 66,
        "coercion_score": 54,
        "authority_score": 72,
        "raw_content": (
            "SAT: Se detectó una inconsistencia en su RFC. "
            "Regularícese antes del viernes en sat-declaracion-anual.mx para evitar multas de hasta $50,000."
        ),
        "entities": {
            "phones": [],
            "domains": ["sat-declaracion-anual.mx"],
            "keywords": ["RFC", "inconsistencia", "multas", "regularícese"],
        },
        "similar_count": 4,
        "campaign_id": None,
    },
    {
        "created_at": _ago(340),
        "threat_type": "smishing",
        "region": "Chihuahua, MX",
        "risk_score": 74,
        "emotional_pressure": "high",
        "urgency_score": 72,
        "coercion_score": 60,
        "authority_score": 67,
        "raw_content": (
            "Walmart: Trabajo desde casa disponible. $900 diarios, horario flexible. "
            "Regístrate en walmart-empleos-remotos.mx — solo quedan 3 lugares."
        ),
        "entities": {
            "phones": [],
            "domains": ["walmart-empleos-remotos.mx"],
            "keywords": ["Walmart", "trabajo desde casa", "lugares limitados"],
        },
        "similar_count": 11,
        "campaign_id": "camp-empleo-remoto-001",
    },
    # ── CIUDAD JUÁREZ, MX (5 incidents) ────────────────────────────
    {
        "created_at": _ago(31),
        "threat_type": "scam",
        "region": "Ciudad Juárez, MX",
        "risk_score": 65,
        "emotional_pressure": "high",
        "urgency_score": 60,
        "coercion_score": 55,
        "authority_score": 45,
        "raw_content": (
            "Invierte con nosotros y obtén rendimientos del 300% en 30 días. "
            "Estrategia probada — más de 500 clientes satisfechos en Chihuahua. "
            "Inversión mínima $5,000. WhatsApp: 656-100-2234."
        ),
        "entities": {
            "phones": ["+52 656-100-2234"],
            "domains": [],
            "keywords": ["rendimientos", "300%", "inversión garantizada", "probada"],
        },
        "similar_count": 3,
        "campaign_id": "camp-inversion-ponzi-001",
    },
    {
        "created_at": _ago(88),
        "threat_type": "vishing",
        "region": "Ciudad Juárez, MX",
        "risk_score": 88,
        "emotional_pressure": "critical",
        "urgency_score": 91,
        "coercion_score": 82,
        "authority_score": 75,
        "raw_content": (
            "Llamada: 'IMSS Juárez: su esposa fue detenida en aduana con documentos falsos. "
            "Para evitar cargos penales deposite $12,000 en 2 horas a CLABE 656111222333444555.'"
        ),
        "entities": {
            "phones": [],
            "domains": [],
            "keywords": ["IMSS", "detenida", "aduana", "cargos penales", "depósito inmediato"],
        },
        "similar_count": 8,
        "campaign_id": None,
    },
    {
        "created_at": _ago(155),
        "threat_type": "phishing",
        "region": "Ciudad Juárez, MX",
        "risk_score": 87,
        "emotional_pressure": "critical",
        "urgency_score": 84,
        "coercion_score": 70,
        "authority_score": 92,
        "raw_content": (
            "BBVA Seguridad: Detectamos un intento de acceso no autorizado desde Tijuana. "
            "Confirme su identidad en bbva-login-seguro.mx e ingrese su token para proteger su cuenta."
        ),
        "entities": {
            "phones": [],
            "domains": ["bbva-login-seguro.mx"],
            "keywords": ["acceso no autorizado", "token", "proteger", "confirme identidad"],
        },
        "similar_count": 18,
        "campaign_id": "camp-bbva-fake-001",
    },
    {
        "created_at": _ago(220),
        "threat_type": "scam",
        "region": "Ciudad Juárez, MX",
        "risk_score": 71,
        "emotional_pressure": "high",
        "urgency_score": 68,
        "coercion_score": 60,
        "authority_score": 50,
        "raw_content": (
            "Trading Forex garantizado: 500% anual con IA. "
            "Especialistas mexicanos con 10 años de experiencia. "
            "Reunión informativa gratis: inversión desde $2,000. WhatsApp: 656-200-4455."
        ),
        "entities": {
            "phones": ["+52 656-200-4455"],
            "domains": [],
            "keywords": ["Forex", "500%", "IA", "garantizado", "inversión"],
        },
        "similar_count": 5,
        "campaign_id": "camp-inversion-ponzi-001",
    },
    {
        "created_at": _ago(285),
        "threat_type": "smishing",
        "region": "Ciudad Juárez, MX",
        "risk_score": 79,
        "emotional_pressure": "high",
        "urgency_score": 76,
        "coercion_score": 63,
        "authority_score": 70,
        "raw_content": (
            "Empleo remoto aprobado: $1,200 diarios empacando productos Amazon. "
            "Material enviado a su domicilio. Regístrese en empleo-juarez-amazon.mx — Cupo: 1 disponible."
        ),
        "entities": {
            "phones": [],
            "domains": ["empleo-juarez-amazon.mx"],
            "keywords": ["Amazon", "empacando", "cupo disponible", "domicilio"],
        },
        "similar_count": 9,
        "campaign_id": "camp-empleo-remoto-001",
    },
    # ── CDMX, MX (8 incidents) ─────────────────────────────────────
    {
        "created_at": _ago(5),
        "threat_type": "phishing",
        "region": "CDMX, MX",
        "risk_score": 88,
        "emotional_pressure": "critical",
        "urgency_score": 85,
        "coercion_score": 60,
        "authority_score": 91,
        "raw_content": (
            "Estimado cliente BBVA: Se detectó actividad inusual en su cuenta. "
            "Verifique sus datos en bbva-verificacion-cuenta.mx o su cuenta será bloqueada en 24h."
        ),
        "entities": {
            "phones": [],
            "domains": ["bbva-verificacion-cuenta.mx"],
            "keywords": ["actividad inusual", "bloqueada", "verifique", "24 horas"],
        },
        "similar_count": 18,
        "campaign_id": "camp-bbva-fake-001",
    },
    {
        "created_at": _ago(18),
        "threat_type": "phishing",
        "region": "CDMX, MX",
        "risk_score": 71,
        "emotional_pressure": "high",
        "urgency_score": 72,
        "coercion_score": 50,
        "authority_score": 88,
        "raw_content": (
            "NOTIFICACIÓN SAT: Se detectó una discrepancia en su declaración anual. "
            "Tiene 48 horas para regularizarse en sat-verificacion.mx o enfrentará multas."
        ),
        "entities": {
            "phones": [],
            "domains": ["sat-verificacion.mx"],
            "keywords": ["discrepancia", "declaración", "multas", "48 horas"],
        },
        "similar_count": 5,
        "campaign_id": None,
    },
    {
        "created_at": _ago(102),
        "threat_type": "scam",
        "region": "CDMX, MX",
        "risk_score": 61,
        "emotional_pressure": "high",
        "urgency_score": 58,
        "coercion_score": 50,
        "authority_score": 40,
        "raw_content": (
            "Grupo Bimbo está contratando repartidores. Sueldo $18,000/mes + prestaciones. "
            "Cuota de inscripción reembolsable: $500. Depósito a CLABE 021180040114145220."
        ),
        "entities": {
            "phones": [],
            "domains": [],
            "keywords": ["Bimbo", "inscripción", "reembolsable", "CLABE", "depósito"],
        },
        "similar_count": 1,
        "campaign_id": None,
    },
    {
        "created_at": _ago(147),
        "threat_type": "phishing",
        "region": "CDMX, MX",
        "risk_score": 86,
        "emotional_pressure": "critical",
        "urgency_score": 84,
        "coercion_score": 68,
        "authority_score": 90,
        "raw_content": (
            "BBVA: Su sesión fue iniciada desde un dispositivo desconocido. "
            "Confirme ahora en bbva-cdmx-seguridad.mx o su cuenta quedará suspendida."
        ),
        "entities": {
            "phones": [],
            "domains": ["bbva-cdmx-seguridad.mx"],
            "keywords": ["dispositivo desconocido", "suspendida", "confirme ahora"],
        },
        "similar_count": 22,
        "campaign_id": "camp-bbva-fake-001",
    },
    {
        "created_at": _ago(192),
        "threat_type": "vishing",
        "region": "CDMX, MX",
        "risk_score": 83,
        "emotional_pressure": "critical",
        "urgency_score": 88,
        "coercion_score": 76,
        "authority_score": 80,
        "raw_content": (
            "Llamada: 'IMSS: Sus datos están siendo usados en actividad ilícita. "
            "Para proteger su NSS deposite $15,000 en cuenta de resguardo. "
            "Permanezca en línea, no cuelgue o será detenido.'"
        ),
        "entities": {
            "phones": ["+52 55-4000-8822"],
            "domains": [],
            "keywords": ["IMSS", "NSS", "actividad ilícita", "detenido", "resguardo"],
        },
        "similar_count": 14,
        "campaign_id": None,
    },
    {
        "created_at": _ago(238),
        "threat_type": "smishing",
        "region": "CDMX, MX",
        "risk_score": 72,
        "emotional_pressure": "high",
        "urgency_score": 70,
        "coercion_score": 55,
        "authority_score": 78,
        "raw_content": (
            "IMSS: Su cita médica del 15/01 fue cancelada. "
            "Reagende en imss-citas-cdmx.com antes de 24h o perderá su turno de 3 meses."
        ),
        "entities": {
            "phones": [],
            "domains": ["imss-citas-cdmx.com"],
            "keywords": ["cita médica", "cancelada", "turno", "reagende"],
        },
        "similar_count": 6,
        "campaign_id": None,
    },
    {
        "created_at": _ago(312),
        "threat_type": "phishing",
        "region": "CDMX, MX",
        "risk_score": 58,
        "emotional_pressure": "medium",
        "urgency_score": 55,
        "coercion_score": 40,
        "authority_score": 62,
        "raw_content": (
            "Netflix: Su suscripción expira en 3 días. "
            "Actualice su método de pago en netflix-actualizar-mx.com para no perder el acceso."
        ),
        "entities": {
            "phones": [],
            "domains": ["netflix-actualizar-mx.com"],
            "keywords": ["Netflix", "suscripción", "método de pago", "expira"],
        },
        "similar_count": 3,
        "campaign_id": None,
    },
    {
        "created_at": _ago(398),
        "threat_type": "scam",
        "region": "CDMX, MX",
        "risk_score": 49,
        "emotional_pressure": "medium",
        "urgency_score": 45,
        "coercion_score": 35,
        "authority_score": 38,
        "raw_content": (
            "Amazon: Su paquete no pudo entregarse. "
            "Pague $89 de gastos de almacenaje en amazon-reenvio-mx.com para reactivar su envío."
        ),
        "entities": {
            "phones": [],
            "domains": ["amazon-reenvio-mx.com"],
            "keywords": ["Amazon", "paquete", "almacenaje", "reactivar"],
        },
        "similar_count": 2,
        "campaign_id": None,
    },
    # ── MONTERREY, MX (5 incidents) ────────────────────────────────
    {
        "created_at": _ago(23),
        "threat_type": "phishing",
        "region": "Monterrey, MX",
        "risk_score": 71,
        "emotional_pressure": "high",
        "urgency_score": 72,
        "coercion_score": 50,
        "authority_score": 88,
        "raw_content": (
            "SAT Monterrey: Discrepancia en su declaración anual. "
            "Regularícese en sat-mty-verificacion.mx en 48h para evitar multas."
        ),
        "entities": {
            "phones": [],
            "domains": ["sat-mty-verificacion.mx"],
            "keywords": ["discrepancia", "declaración", "multas", "48 horas"],
        },
        "similar_count": 5,
        "campaign_id": None,
    },
    {
        "created_at": _ago(73),
        "threat_type": "phishing",
        "region": "Monterrey, MX",
        "risk_score": 84,
        "emotional_pressure": "critical",
        "urgency_score": 82,
        "coercion_score": 64,
        "authority_score": 91,
        "raw_content": (
            "Banregio: Detectamos inicio de sesión inusual en su banca en línea. "
            "Verifique su identidad en banregio-seguro.mx — su cuenta será bloqueada en 2 horas."
        ),
        "entities": {
            "phones": [],
            "domains": ["banregio-seguro.mx"],
            "keywords": ["inicio de sesión inusual", "banca en línea", "bloqueada"],
        },
        "similar_count": 11,
        "campaign_id": "camp-bbva-fake-001",
    },
    {
        "created_at": _ago(148),
        "threat_type": "smishing",
        "region": "Monterrey, MX",
        "risk_score": 66,
        "emotional_pressure": "high",
        "urgency_score": 64,
        "coercion_score": 48,
        "authority_score": 74,
        "raw_content": (
            "TELMEX: Su servicio de internet será cortado mañana por adeudo de $1,840. "
            "Pague en telmex-pago-mty.com antes de las 23:59h para mantener su servicio."
        ),
        "entities": {
            "phones": [],
            "domains": ["telmex-pago-mty.com"],
            "keywords": ["TELMEX", "cortado", "adeudo", "internet"],
        },
        "similar_count": 4,
        "campaign_id": "camp-cfe-sms-001",
    },
    {
        "created_at": _ago(205),
        "threat_type": "phishing",
        "region": "Monterrey, MX",
        "risk_score": 89,
        "emotional_pressure": "critical",
        "urgency_score": 87,
        "coercion_score": 72,
        "authority_score": 93,
        "raw_content": (
            "BBVA Monterrey: Su tarjeta fue usada en compra de $23,450 en Amazon EU. "
            "Si no reconoce esta compra, cancélela en bbva-mty-seguro.mx."
        ),
        "entities": {
            "phones": [],
            "domains": ["bbva-mty-seguro.mx"],
            "keywords": ["tarjeta", "compra no reconocida", "cancele", "Amazon EU"],
        },
        "similar_count": 16,
        "campaign_id": "camp-bbva-fake-001",
    },
    {
        "created_at": _ago(280),
        "threat_type": "scam",
        "region": "Monterrey, MX",
        "risk_score": 63,
        "emotional_pressure": "high",
        "urgency_score": 60,
        "coercion_score": 52,
        "authority_score": 48,
        "raw_content": (
            "Club inversión Forex — Monterrey: 200% anual comprobado. "
            "Solo residentes NL. Reunión privada este sábado. Cupos: 5. WhatsApp: 81-2233-4455."
        ),
        "entities": {
            "phones": ["+52 81-2233-4455"],
            "domains": [],
            "keywords": ["Forex", "200%", "comprobado", "reunión privada", "cupos"],
        },
        "similar_count": 4,
        "campaign_id": "camp-inversion-ponzi-001",
    },
    # ── GUADALAJARA, MX (4 incidents) ──────────────────────────────
    {
        "created_at": _ago(76),
        "threat_type": "phishing",
        "region": "Guadalajara, MX",
        "risk_score": 83,
        "emotional_pressure": "critical",
        "urgency_score": 80,
        "coercion_score": 65,
        "authority_score": 90,
        "raw_content": (
            "BBVA Seguridad GDL: Detectamos acceso no autorizado desde Tijuana. "
            "Confirme su identidad en bbva-login-seguro.mx e ingrese su token."
        ),
        "entities": {
            "phones": [],
            "domains": ["bbva-login-seguro.mx"],
            "keywords": ["acceso no autorizado", "token", "proteger", "confirme identidad"],
        },
        "similar_count": 18,
        "campaign_id": "camp-bbva-fake-001",
    },
    {
        "created_at": _ago(140),
        "threat_type": "smishing",
        "region": "Guadalajara, MX",
        "risk_score": 74,
        "emotional_pressure": "high",
        "urgency_score": 72,
        "coercion_score": 55,
        "authority_score": 79,
        "raw_content": (
            "CFE Jalisco: Adeudo pendiente de $3,120. Su servicio será suspendido en 24h. "
            "Realice su pago en cfe-jalisco-pagos.mx — Referencia: GDL-778-2024."
        ),
        "entities": {
            "phones": [],
            "domains": ["cfe-jalisco-pagos.mx"],
            "keywords": ["CFE", "adeudo", "suspendido", "referencia"],
        },
        "similar_count": 6,
        "campaign_id": "camp-cfe-sms-001",
    },
    {
        "created_at": _ago(198),
        "threat_type": "scam",
        "region": "Guadalajara, MX",
        "risk_score": 68,
        "emotional_pressure": "high",
        "urgency_score": 65,
        "coercion_score": 58,
        "authority_score": 55,
        "raw_content": (
            "Amazon GDL: Trabajo desde casa empacando productos. $850/día + bono semanal. "
            "Sin experiencia. Inscríbete en empleo-gdl-amazon.mx — Hoy último día."
        ),
        "entities": {
            "phones": [],
            "domains": ["empleo-gdl-amazon.mx"],
            "keywords": ["Amazon", "empacando", "último día", "sin experiencia"],
        },
        "similar_count": 7,
        "campaign_id": "camp-empleo-remoto-001",
    },
    {
        "created_at": _ago(255),
        "threat_type": "phishing",
        "region": "Guadalajara, MX",
        "risk_score": 77,
        "emotional_pressure": "high",
        "urgency_score": 75,
        "coercion_score": 60,
        "authority_score": 82,
        "raw_content": (
            "Santander: Su cuenta fue bloqueada por seguridad. "
            "Ingrese NIP y token en santander-verificacion-gdl.com para reactivarla en 6 horas."
        ),
        "entities": {
            "phones": [],
            "domains": ["santander-verificacion-gdl.com"],
            "keywords": ["Santander", "bloqueada", "NIP", "token", "reactivar"],
        },
        "similar_count": 9,
        "campaign_id": None,
    },
    # ── LATAM (3 incidents) ────────────────────────────────────────
    {
        "created_at": _ago(47),
        "threat_type": "scam",
        "region": "Bogotá, CO",
        "risk_score": 45,
        "emotional_pressure": "medium",
        "urgency_score": 40,
        "coercion_score": 30,
        "authority_score": 20,
        "raw_content": (
            "Tienda de zapatos Nike outlet — liquidación final 70% descuento. "
            "Solo esta semana. Pedidos al inbox, envíos a todo Colombia."
        ),
        "entities": {
            "phones": [],
            "domains": [],
            "keywords": ["liquidación", "70% descuento", "outlet", "Nike"],
        },
        "similar_count": 0,
        "campaign_id": None,
    },
    {
        "created_at": _ago(62),
        "threat_type": "phishing",
        "region": "Lima, PE",
        "risk_score": 55,
        "emotional_pressure": "medium",
        "urgency_score": 55,
        "coercion_score": 40,
        "authority_score": 60,
        "raw_content": (
            "MercadoLibre: Su paquete está retenido en aduana. "
            "Escanee el código QR adjunto para liberar el envío y pagar $45 de arancel."
        ),
        "entities": {
            "phones": [],
            "domains": [],
            "keywords": ["retenido", "aduana", "código QR", "arancel"],
        },
        "similar_count": 2,
        "campaign_id": None,
    },
    {
        "created_at": _ago(125),
        "threat_type": "scam",
        "region": "Buenos Aires, AR",
        "risk_score": 77,
        "emotional_pressure": "high",
        "urgency_score": 65,
        "coercion_score": 60,
        "authority_score": 55,
        "raw_content": (
            "¿Perdiste fondos en criptomonedas? Somos especialistas en recuperación. "
            "El 94% de nuestros clientes recuperan sus activos. "
            "Honorarios solo en caso de éxito. WhatsApp: +54 11 4555-3322."
        ),
        "entities": {
            "phones": ["+54 11 4555-3322"],
            "domains": [],
            "keywords": ["criptomonedas", "recuperación", "fondos perdidos", "honorarios"],
        },
        "similar_count": 0,
        "campaign_id": None,
    },
]


async def seed() -> None:
    await init_db()

    async with SessionLocal() as db:
        await db.execute(delete(Incident))
        await db.commit()
        for data in SEED_INCIDENTS:
            db.add(Incident(**data))
        await db.commit()

    print(f"✓ Seeded {len(SEED_INCIDENTS)} incidents into the database.")


if __name__ == "__main__":
    asyncio.run(seed())
