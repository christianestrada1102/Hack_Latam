import { useState, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { AlertOctagon, AlertTriangle, ChevronDown, ChevronUp, Phone, Globe } from 'lucide-react'
import { getAlerts } from '../lib/api'
import { useLang } from '../lib/LanguageContext'
import LoadingSpinner from '../components/LoadingSpinner'

const LEVEL_STYLES = {
  critical: {
    borderColor: '#ef4444',
    icon:        AlertOctagon,
    color:       '#ef4444',
  },
  high: {
    borderColor: '#f59e0b',
    icon:        AlertTriangle,
    color:       '#f59e0b',
  },
}

const ACTIONS_BY_TYPE = {
  phishing: ['No hagas clic en ningún enlace del mensaje', 'Reporta en condusef.gob.mx', 'Bloquea el remitente', 'Verifica directamente con la institución'],
  smishing: ['No respondas el SMS ni llames al número', 'Reporta el número a tu operadora', 'Bloquea el número remitente', 'Verifica el adeudo en la web oficial'],
  vishing:  ['Cuelga inmediatamente', 'No des datos por teléfono', 'Reporta el número a las autoridades', 'Contacta directamente a la institución'],
  scam:     ['No realices depósitos anticipados', 'Investiga en profeco.gob.mx', 'Reporta a la Policía Cibernética', 'Comparte el aviso con conocidos'],
  malware:  ['No descargues archivos adjuntos', 'Escanea tu dispositivo con antivirus', 'Cambia tus contraseñas', 'Reporta a CERT-MX'],
}
const DEFAULT_ACTIONS = ['Reporta el incidente', 'No compartas datos personales', 'Contacta a las autoridades', 'Avisa a personas cercanas']

function severity(score) {
  return score >= 90 ? 'critical' : 'high'
}

function scoreColor(s) {
  return s >= 90 ? '#ef4444' : '#f59e0b'
}

function relativeTime(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (diff < 60)   return `hace ${diff}s`
  if (diff < 3600) return `hace ${Math.floor(diff / 60)}min`
  return `hace ${Math.floor(diff / 3600)}h`
}

function mapApiAlert(inc) {
  const level = severity(inc.risk_score)
  const phones  = inc.entities?.phones  ?? []
  const domains = inc.entities?.domains ?? []
  const topEntities = [...phones.slice(0, 1), ...domains.slice(0, 1)]
  return {
    id:          inc.id,
    level,
    title:       inc.entities?.keywords?.length
                   ? inc.entities.keywords.slice(0, 2).join(' + ')
                   : `${inc.threat_type} · ${inc.region ?? '—'}`,
    region:      inc.region ?? 'Región no detectada',
    score:       inc.risk_score,
    type:        inc.threat_type,
    timestamp:   relativeTime(inc.created_at),
    topEntities,
    entities:    inc.entities ?? { phones: [], domains: [], keywords: [] },
    urgency:     inc.urgency_score,
    coercion:    inc.coercion_score,
    authority:   inc.authority_score,
    similar:      inc.similar_count,
    campaign:     inc.campaign_id,
    report_count: inc.report_count ?? 0,
  }
}

function VectorBar({ label, value }) {
  const color = value >= 80 ? '#ef4444' : value >= 60 ? '#f59e0b' : '#6b7280'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px]" style={{ color: '#a08e7a' }}>{label}</span>
        <span className="text-[10px] font-mono" style={{ color }}>{value}%</span>
      </div>
      <div className="h-[2px] bg-[#222] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function AlertCard({ alert, expanded, onToggle }) {
  const { t } = useLang()
  const styles  = LEVEL_STYLES[alert.level]
  const Icon    = styles.icon
  const actions = ACTIONS_BY_TYPE[alert.type] ?? DEFAULT_ACTIONS

  return (
    <div
      className="alert-card bg-[#1c1b1b] border border-[#262626] rounded overflow-hidden"
      style={{ borderLeft: `3px solid ${styles.borderColor}` }}
    >
      <div className="px-4 py-3 flex items-start gap-4">
        <Icon size={16} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: styles.color }} />

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1 flex-wrap">
            <span
              className="text-[9px] uppercase tracking-widest font-mono font-semibold px-1.5 py-0.5 rounded border"
              style={{
                color:       styles.color,
                background:  `${styles.color}15`,
                borderColor: `${styles.color}35`,
              }}
            >
              {alert.level === 'critical' ? t('alerts.critical') : 'HIGH'}
            </span>
            <span
              className="text-[9px] uppercase tracking-wider font-mono border border-[#2a2a2a] px-1.5 py-0.5 rounded"
              style={{ color: '#555' }}
            >
              {alert.type}
            </span>
            <span className="text-[11px] font-mono ml-auto" style={{ color: '#555' }}>{alert.timestamp}</span>
          </div>

          <p className="text-[15px] font-medium" style={{ color: '#e5e2e1' }}>{alert.title}</p>
          <p className="text-[12px] font-mono mt-0.5" style={{ color: '#a08e7a' }}>{alert.region}</p>

          {alert.topEntities.length > 0 && (
            <div className="flex flex-wrap gap-2 mt-2">
              {alert.topEntities.map((e, i) => (
                <span key={i} className="text-[10px] font-mono text-red-400 bg-red-500/5 border border-red-500/20 px-1.5 py-0.5 rounded">
                  {e}
                </span>
              ))}
            </div>
          )}
        </div>

        <div className="flex flex-col items-end gap-2 shrink-0">
          <span
            className="text-[22px] font-mono font-bold tabular-nums leading-none"
            style={{ color: styles.color }}
          >
            {alert.score}
          </span>
          <button
            onClick={onToggle}
            className="flex items-center gap-1 transition-colors"
            style={{ fontSize: 12, color: '#a08e7a' }}
          >
            {t('alerts.view')} {expanded ? <ChevronUp size={11} /> : <ChevronDown size={11} />}
          </button>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-[#262626] px-5 py-4 flex flex-col gap-4">
          <div className="grid grid-cols-2 gap-6">
            {/* Entities */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono mb-2" style={{ color: '#555' }}>{t('alerts.entities')}</p>
              <div className="flex flex-col gap-1.5 font-mono text-[11px]">
                {alert.entities.phones?.map((p) => (
                  <div key={p} className="flex items-center gap-1.5">
                    <Phone size={9} style={{ color: '#555' }} />
                    <span className="text-amber-400">{p}</span>
                  </div>
                ))}
                {alert.entities.domains?.map((d) => (
                  <div key={d} className="flex items-center gap-1.5">
                    <Globe size={9} style={{ color: '#555' }} />
                    <span className="text-red-400 break-all">{d}</span>
                  </div>
                ))}
                {alert.entities.keywords?.length > 0 && (
                  <div className="flex flex-wrap gap-1 mt-1">
                    {alert.entities.keywords.map((k) => (
                      <span key={k} className="bg-[#222] border border-[#2a2a2a] px-1 py-0.5 rounded text-[10px]" style={{ color: '#666' }}>{k}</span>
                    ))}
                  </div>
                )}
                {!alert.entities.phones?.length && !alert.entities.domains?.length && <span style={{ color: '#555' }}>—</span>}
              </div>
            </div>

            {/* Vectors */}
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono mb-2" style={{ color: '#555' }}>{t('report.vectors')}</p>
              <div className="flex flex-col gap-2">
                <VectorBar label={t('report.urgency')}   value={alert.urgency} />
                <VectorBar label={t('report.coercion')}  value={alert.coercion} />
                <VectorBar label={t('report.authority')} value={alert.authority} />
              </div>
            </div>
          </div>

          {alert.campaign && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono mb-1" style={{ color: '#555' }}>{t('alerts.campaign')}</p>
              <span className="text-[11px] font-mono text-amber-400">{alert.campaign}</span>
            </div>
          )}

          <div>
            <p className="text-[10px] uppercase tracking-widest font-mono mb-2" style={{ color: '#555' }}>{t('report.actions')}</p>
            <ul className="flex flex-col gap-1.5">
              {actions.map((a, i) => (
                <li key={i} className="flex items-start gap-2 text-[11px]" style={{ color: '#e5e2e1' }}>
                  <span className="text-amber-400 font-mono shrink-0">{i + 1}.</span>
                  {a}
                </li>
              ))}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}

const FILTER_VALUES = ['all', 'critical', 'high']

export default function Alerts() {
  const { t } = useLang()
  const [alerts, setAlerts]         = useState([])
  const [loading, setLoading]       = useState(true)
  const [filter, setFilter]         = useState('all')
  const [expandedId, setExpandedId] = useState(null)

  const alertsRef = useRef(null)

  useEffect(() => {
    let cancelled = false
    const load = async () => {
      const data = await getAlerts()
      if (cancelled) return
      setAlerts(
        data
          ? data
              .map(mapApiAlert)
              .sort((a, b) => b.score - a.score || b.report_count - a.report_count)
          : []
      )
      setLoading(false)
    }
    load()
    const interval = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const filtered = filter === 'all' ? alerts : alerts.filter((a) => a.level === filter)

  useGSAP(() => {
    if (filtered.length > 0) {
      gsap.from('.alert-card', { opacity: 0, y: 30, duration: 0.4, stagger: 0.06 })
    }
  }, { scope: alertsRef, dependencies: [filter, filtered.length] })

  const filterLabels = {
    all:      t('alerts.filterAll'),
    critical: t('alerts.filterCritical'),
    high:     t('alerts.filterHigh'),
  }

  return (
    <div ref={alertsRef} className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold" style={{ color: '#e5e2e1' }}>{t('alerts.title')}</h1>
          <p className="text-[11px] mt-0.5" style={{ color: '#a08e7a' }}>{t('alerts.subtitle')}</p>
        </div>
        <div className="flex items-center gap-2">
          {FILTER_VALUES.map((v) => (
            <button
              key={v}
              onClick={() => setFilter(v)}
              className="text-[11px] font-mono uppercase tracking-widest px-2.5 py-1 rounded border transition-colors"
              style={filter === v
                ? { background: '#f59e0b', color: '#131313', borderColor: '#f59e0b' }
                : { background: 'transparent', color: '#666', borderColor: '#2a2a2a' }
              }
            >
              {filterLabels[v]}
            </button>
          ))}
          <span className="text-sm ml-1" style={{ color: '#a08e7a' }}>
            {filtered.length} {t('alerts.active')}
          </span>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center h-48">
          <LoadingSpinner message="Cargando alertas..." />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex items-center justify-center h-32 text-[12px]" style={{ color: '#555' }}>
          {t('alerts.empty')}
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map((alert) => (
            <AlertCard
              key={alert.id}
              alert={alert}
              expanded={expandedId === alert.id}
              onToggle={() => setExpandedId(expandedId === alert.id ? null : alert.id)}
            />
          ))}
        </div>
      )}
    </div>
  )
}
