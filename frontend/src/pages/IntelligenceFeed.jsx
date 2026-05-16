import { useState, useMemo, useEffect } from 'react'
import { Filter, TrendingUp, GitBranch } from 'lucide-react'
import { getFeed } from '../lib/api'
import { useLang } from '../lib/LanguageContext'

const SEED_INCIDENTS = [
  { id: 'INC-0891', time: '14:32', type: 'smishing',  desc: 'WhatsApp Empleo Falso — oferta remota CFE',              location: 'Chihuahua, MX',   risk: 92, campaign: 'Empleo Remoto Falso'    },
  { id: 'INC-0890', time: '14:27', type: 'phishing',  desc: 'BBVA Clone — página login falsa con SSL válido',         location: 'CDMX, MX',        risk: 88, campaign: 'BBVA Fake Login'         },
  { id: 'INC-0889', time: '14:20', type: 'smishing',  desc: 'CFE Adeudo — SMS con link de pago falso',                location: 'Chihuahua, MX',   risk: 78, campaign: 'CFE Adeudo SMS'         },
  { id: 'INC-0888', time: '14:14', type: 'phishing',  desc: 'SAT Suplantación — notificación fiscal fraudulenta',     location: 'Monterrey, MX',   risk: 71, campaign: null                     },
  { id: 'INC-0887', time: '13:51', type: 'scam',      desc: 'Inversión Ponzi — rendimientos 300% garantizados',       location: 'Juárez, MX',      risk: 65, campaign: 'Inversión Garantizada'  },
  { id: 'INC-0886', time: '13:35', type: 'scam',      desc: 'Tienda Facebook Falsa — zapatos, sin entrega',           location: 'Bogotá, CO',      risk: 45, campaign: null                     },
  { id: 'INC-0885', time: '13:02', type: 'phishing',  desc: 'MercadoLibre Fake Delivery — QR code malicioso',         location: 'Lima, PE',        risk: 55, campaign: null                     },
  { id: 'INC-0884', time: '12:44', type: 'phishing',  desc: 'BBVA Login v2 — formulario captura OTP',                 location: 'Guadalajara, MX', risk: 83, campaign: 'BBVA Fake Login'         },
  { id: 'INC-0883', time: '12:18', type: 'scam',      desc: 'Fraude Bimbo Empleos — cuota inscripción $500',          location: 'CDMX, MX',        risk: 61, campaign: null                     },
  { id: 'INC-0882', time: '11:55', type: 'scam',      desc: 'Crypto Recovery Scam — recupera fondos perdidos',        location: 'Buenos Aires, AR',risk: 77, campaign: null                     },
]

const CLUSTERS = [
  { name: 'BBVA Fake Login',     members: 18, since: '3d ago', risk: 'critical' },
  { name: 'Empleo Remoto Falso', members: 14, since: '5d ago', risk: 'high'     },
  { name: 'CFE Adeudo SMS',      members:  9, since: '2d ago', risk: 'high'     },
]

const SPIKES = [
  { type: 'Smishing', delta: '+142%', window: '1h', region: 'Chihuahua' },
  { type: 'Phishing', delta: '+67%',  window: '6h', region: 'CDMX'      },
]

// Internal sentinel values — never translated
const REGION_VALUES = ['', 'MX', 'CO', 'PE', 'AR']
const TYPE_VALUES   = ['', 'phishing', 'smishing', 'vishing', 'scam', 'malware']
const RISK_VALUES   = ['all', 'critical', 'high', 'medium', 'low']

function riskBand(score) {
  if (score >= 80) return 'critical'
  if (score >= 60) return 'high'
  if (score >= 40) return 'medium'
  return 'low'
}

function scoreColor(s) {
  if (s >= 80) return '#ef4444'
  if (s >= 60) return '#f59e0b'
  if (s >= 40) return '#6b7280'
  return '#374151'
}

function typeBadge(t) {
  const map = {
    phishing: 'text-red-400 border-red-500/20 bg-red-500/5',
    smishing: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
    scam:     'text-purple-400 border-purple-500/20 bg-purple-500/5',
    vishing:  'text-blue-400 border-blue-500/20 bg-blue-500/5',
    malware:  'text-rose-400 border-rose-500/20 bg-rose-500/5',
  }
  return map[t] ?? 'text-neutral-400 border-[#262626]'
}

function clusterRiskDot(risk) {
  if (risk === 'critical') return 'bg-red-500'
  if (risk === 'high')     return 'bg-amber-400'
  return 'bg-neutral-500'
}

function formatTime(isoString) {
  const d = new Date(isoString)
  return d.toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function mapApiIncident(inc) {
  return {
    id:       `INC-${inc.id.slice(0, 4).toUpperCase()}`,
    time:     formatTime(inc.created_at),
    type:     inc.threat_type,
    desc:     inc.entities?.keywords?.length
                ? inc.entities.keywords.slice(0, 3).join(' · ')
                : `${inc.threat_type} · ${inc.region ?? '—'}`,
    location: inc.region ?? '—',
    risk:     inc.risk_score,
    campaign: inc.campaign_id ?? null,
  }
}

function FilterSelect({ options, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#1c1b1b] border border-[#262626] text-[11px] text-neutral-400 rounded px-2 py-1.5 font-mono outline-none focus:border-[#383838] cursor-pointer"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function IncidentRow({ id, time, type, desc, location, risk, campaign }) {
  return (
    <div className="grid grid-cols-[72px_70px_90px_1fr_120px_64px] px-5 py-3 border-b border-[#1e1e1e] hover:bg-[#191919] transition-colors items-center">
      <span className="text-[11px] font-mono text-neutral-600">{id}</span>
      <span className="text-[11px] font-mono text-neutral-500">{time}</span>
      <div>
        <span className={`text-[9px] uppercase tracking-wider font-medium border px-1.5 py-0.5 rounded ${typeBadge(type)}`}>
          {type}
        </span>
      </div>
      <div className="min-w-0 pr-3">
        <p className="text-[12px] text-neutral-200 truncate">{desc}</p>
        {campaign && (
          <p className="text-[10px] text-neutral-600 font-mono mt-0.5 truncate">↳ {campaign}</p>
        )}
      </div>
      <span className="text-[11px] text-neutral-500 truncate">{location}</span>
      <span className="text-[13px] font-mono font-semibold tabular-nums" style={{ color: scoreColor(risk) }}>
        {risk}
      </span>
    </div>
  )
}

export default function IntelligenceFeed() {
  const { t } = useLang()
  const [incidents, setIncidents] = useState(SEED_INCIDENTS)
  // Sentinel values are empty string / 'all' — not translated labels
  const [filters, setFilters] = useState({ region: '', type: '', risk: 'all' })

  const setFilter = (k, v) => setFilters((f) => ({ ...f, [k]: v }))

  // Build translated option lists — recalculates when language changes
  const regionOptions = [
    { value: '', label: t('intel.allRegions') },
    ...REGION_VALUES.filter(Boolean).map((v) => ({ value: v, label: v })),
  ]
  const typeOptions = [
    { value: '', label: t('intel.allTypes') },
    ...TYPE_VALUES.filter(Boolean).map((v) => ({ value: v, label: v })),
  ]
  const riskOptions = [
    { value: 'all',      label: t('intel.allRisk')  },
    { value: 'critical', label: t('intel.critical') },
    { value: 'high',     label: t('intel.high')     },
    { value: 'medium',   label: t('intel.medium')   },
    { value: 'low',      label: t('intel.low')      },
  ]

  const tableHeaders = [
    t('intel.col.id'),
    t('intel.col.time'),
    t('intel.col.type'),
    t('intel.col.desc'),
    t('intel.col.loc'),
    t('intel.col.risk'),
  ]

  const apiFilters = useMemo(() => {
    const f = {}
    if (filters.region) f.region = filters.region
    if (filters.type)   f.threat_type = filters.type
    if (filters.risk !== 'all') {
      const bands = { critical: 80, high: 60, medium: 40, low: 0 }
      f.min_risk = bands[filters.risk] ?? 0
    }
    return f
  }, [filters])

  useEffect(() => {
    let cancelled = false
    getFeed(apiFilters).then((data) => {
      if (cancelled || !data) return
      setIncidents(data.map(mapApiIncident))
    })
    return () => { cancelled = true }
  }, [apiFilters])

  const filtered = useMemo(() => {
    return incidents.filter((inc) => {
      if (filters.region && !inc.location.includes(filters.region)) return false
      if (filters.type   && inc.type !== filters.type)              return false
      if (filters.risk !== 'all' && riskBand(inc.risk) !== filters.risk) return false
      return true
    })
  }, [incidents, filters])

  return (
    <div className="flex h-full min-h-0">
      {/* Main table area */}
      <div className="flex-1 flex flex-col min-w-0 border-r border-[#262626]">
        {/* Filters bar */}
        <div className="px-5 py-3 border-b border-[#262626] flex items-center gap-3 flex-wrap shrink-0">
          <Filter size={12} className="text-neutral-600 shrink-0" strokeWidth={1.5} />
          <FilterSelect options={regionOptions} value={filters.region} onChange={(v) => setFilter('region', v)} />
          <FilterSelect options={typeOptions}   value={filters.type}   onChange={(v) => setFilter('type',   v)} />
          <FilterSelect options={riskOptions}   value={filters.risk}   onChange={(v) => setFilter('risk',   v)} />
          <span className="ml-auto text-[11px] font-mono text-neutral-600">
            {filtered.length} / {incidents.length} {t('intel.count')}
          </span>
        </div>

        {/* Table header */}
        <div className="grid grid-cols-[72px_70px_90px_1fr_120px_64px] px-5 py-2 border-b border-[#262626] shrink-0">
          {tableHeaders.map((h) => (
            <span key={h} className="text-[10px] uppercase tracking-widest text-neutral-600 font-mono">{h}</span>
          ))}
        </div>

        {/* Rows */}
        <div className="flex-1 overflow-y-auto">
          {filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[12px] text-neutral-600">
              {t('intel.noMatch')}
            </div>
          ) : (
            filtered.map((inc) => <IncidentRow key={inc.id} {...inc} />)
          )}
        </div>
      </div>

      {/* Right sidebar */}
      <div className="w-[240px] shrink-0 flex flex-col p-4 gap-5 overflow-y-auto">
        {/* Active Clusters */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <GitBranch size={11} className="text-neutral-600" strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
              {t('intel.clusters')}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {CLUSTERS.map((c) => (
              <div key={c.name} className="card-base px-3 py-2.5">
                <div className="flex items-start gap-2">
                  <span className={`w-1.5 h-1.5 rounded-full mt-1 shrink-0 ${clusterRiskDot(c.risk)}`} />
                  <div className="min-w-0 flex-1">
                    <p className="text-[11px] text-neutral-300 leading-snug truncate">{c.name}</p>
                    <p className="text-[10px] text-neutral-600 font-mono mt-0.5">
                      {c.members} {t('intel.count')} · {c.since}
                    </p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Spike Detection */}
        <div>
          <div className="flex items-center gap-1.5 mb-3">
            <TrendingUp size={11} className="text-neutral-600" strokeWidth={1.5} />
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
              {t('intel.spikes')}
            </span>
          </div>
          <div className="flex flex-col gap-2">
            {SPIKES.map((s) => (
              <div key={s.type + s.region} className="card-base px-3 py-2.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[11px] text-neutral-300">{s.type}</span>
                  <span className="text-[11px] font-mono text-red-400">{s.delta}</span>
                </div>
                <p className="text-[10px] text-neutral-600 font-mono">
                  {t('intel.last')} {s.window} · {s.region}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
