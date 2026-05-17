import { useState, useMemo, useEffect, useRef } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Filter, Download, ChevronLeft, ChevronRight, Search, X, Phone, Globe, Tag, GitBranch } from 'lucide-react'
import { getFeed } from '../lib/api'
import { useLang } from '../lib/LanguageContext'
import LoadingSpinner from '../components/LoadingSpinner'

const PAGE_SIZE = 20

const REGION_VALUES = ['', 'MX', 'CO', 'PE', 'AR', 'BR']
const TYPE_VALUES   = ['', 'phishing', 'smishing', 'vishing', 'scam', 'malware']

const ACTIONS_BY_TYPE = {
  phishing: [
    'No hagas clic en ningún enlace del mensaje',
    'Reporta en condusef.gob.mx',
    'Bloquea el remitente',
    'Verifica directamente con la institución',
  ],
  smishing: [
    'No respondas el SMS ni llames al número',
    'Reporta el número a tu operadora',
    'Bloquea el número remitente',
    'Verifica el adeudo en la web oficial',
  ],
  vishing: [
    'Cuelga inmediatamente',
    'No proporciones datos personales por teléfono',
    'Reporta el número a las autoridades',
    'Contacta directamente a la institución',
  ],
  scam: [
    'No realices ningún depósito ni pago anticipado',
    'Investiga la empresa en profeco.gob.mx',
    'Reporta a la Policía Cibernética',
    'Comparte el aviso con conocidos',
  ],
  malware: [
    'No descargues archivos adjuntos',
    'Escanea tu dispositivo con antivirus',
    'Cambia tus contraseñas inmediatamente',
    'Reporta a CERT-MX',
  ],
}
const DEFAULT_ACTIONS = [
  'Reporta el incidente a las autoridades',
  'No compartas datos personales',
  'Contacta a las autoridades competentes',
  'Avisa a personas cercanas',
]

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

function typeBadge(type) {
  const map = {
    phishing: 'text-red-400 border-red-500/20 bg-red-500/5',
    smishing: 'text-amber-400 border-amber-500/20 bg-amber-500/5',
    scam:     'text-purple-400 border-purple-500/20 bg-purple-500/5',
    vishing:  'text-blue-400 border-blue-500/20 bg-blue-500/5',
    malware:  'text-rose-400 border-rose-500/20 bg-rose-500/5',
  }
  return map[type] ?? 'text-neutral-400 border-[#262626]'
}

function formatTime(isoString) {
  return new Date(isoString).toLocaleTimeString('es-MX', { hour: '2-digit', minute: '2-digit', hour12: false })
}

function formatDateTime(isoString) {
  return new Date(isoString).toLocaleString('es-MX', {
    year: 'numeric', month: 'short', day: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function mapApiIncident(inc) {
  return {
    id:                 inc.id,
    shortId:            `INC-${inc.id.slice(0, 4).toUpperCase()}`,
    time:               formatTime(inc.created_at),
    created_at:         inc.created_at,
    type:               inc.threat_type,
    desc:               inc.entities?.keywords?.length
                          ? inc.entities.keywords.slice(0, 3).join(' · ')
                          : `${inc.threat_type} · ${inc.region ?? '—'}`,
    location:           inc.region ?? 'Región no detectada',
    risk:               inc.risk_score,
    campaign:           inc.campaign_id ?? null,
    entities:           inc.entities ?? { phones: [], domains: [], keywords: [] },
    urgency_score:      inc.urgency_score,
    coercion_score:     inc.coercion_score,
    authority_score:    inc.authority_score,
    emotional_pressure: inc.emotional_pressure,
    similar_count:      inc.similar_count,
    report_count:       inc.report_count ?? 0,
  }
}

function exportCSV(incidents) {
  const headers = ['ID', 'Fecha', 'Tipo', 'Descripcion', 'Region', 'Riesgo', 'Campana']
  const rows = incidents.map((inc) => [
    inc.shortId,
    formatDateTime(inc.created_at),
    inc.type,
    `"${(inc.desc ?? '').replace(/"/g, '""')}"`,
    inc.location,
    inc.risk,
    inc.campaign ?? '',
  ])
  const csv = [headers, ...rows].map((r) => r.join(',')).join('\n')
  const blob = new Blob(['﻿' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `incidentes_${new Date().toISOString().slice(0, 10)}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

function FilterSelect({ options, value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="bg-[#1c1b1b] border border-[#262626] text-[11px] text-neutral-400 rounded px-2 py-1.5 font-mono outline-none focus:border-[#383838] cursor-pointer shrink-0"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>{o.label}</option>
      ))}
    </select>
  )
}

function VectorBar({ label, value }) {
  const color = value >= 80 ? '#ef4444' : value >= 60 ? '#f59e0b' : '#6b7280'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[10px] text-neutral-400">{label}</span>
        <span className="text-[10px] font-mono" style={{ color }}>{value}%</span>
      </div>
      <div className="h-[2px] bg-[#222] rounded-full overflow-hidden">
        <div className="h-full rounded-full" style={{ width: `${value}%`, background: color }} />
      </div>
    </div>
  )
}

function DetailPanel({ inc, onClose }) {
  const { t } = useLang()
  const actions = ACTIONS_BY_TYPE[inc.type] ?? DEFAULT_ACTIONS

  return (
    <div className="w-full md:w-[270px] shrink-0 flex flex-col border-t md:border-t-0 md:border-l border-[#262626]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#262626] shrink-0">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">{inc.shortId}</span>
        <button onClick={onClose} className="text-neutral-600 hover:text-neutral-400 transition-colors p-1">
          <X size={12} />
        </button>
      </div>

      <div className="flex flex-col gap-4 p-4 overflow-y-auto flex-1">
        {/* Score + type */}
        <div className="flex items-center gap-3">
          <span className="text-[28px] font-mono font-bold" style={{ color: scoreColor(inc.risk) }}>
            {inc.risk}
          </span>
          <div>
            <span className={`text-[9px] uppercase tracking-wider font-medium border px-1.5 py-0.5 rounded ${typeBadge(inc.type)}`}>
              {inc.type}
            </span>
            <p className="text-[10px] text-neutral-500 font-mono mt-1">{inc.location}</p>
            <p className="text-[10px] text-neutral-600 font-mono">{formatDateTime(inc.created_at)}</p>
          </div>
        </div>

        {/* Entities */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-2">
            {t('intel.detail.entities')}
          </p>
          <div className="flex flex-col gap-1.5 font-mono text-[11px]">
            {inc.entities.phones?.map((p) => (
              <div key={p} className="flex items-center gap-2">
                <Phone size={10} className="text-neutral-600 shrink-0" />
                <span className="text-amber-400">{p}</span>
              </div>
            ))}
            {inc.entities.domains?.map((d) => (
              <div key={d} className="flex items-center gap-2">
                <Globe size={10} className="text-neutral-600 shrink-0" />
                <span className="text-red-400 break-all">{d}</span>
              </div>
            ))}
            {inc.entities.keywords?.length > 0 && (
              <div className="flex items-start gap-2">
                <Tag size={10} className="text-neutral-600 shrink-0 mt-0.5" />
                <div className="flex flex-wrap gap-1">
                  {inc.entities.keywords.map((k) => (
                    <span key={k} className="bg-[#222] border border-[#2a2a2a] text-neutral-400 px-1.5 py-0.5 rounded text-[10px]">
                      {k}
                    </span>
                  ))}
                </div>
              </div>
            )}
            {!inc.entities.phones?.length && !inc.entities.domains?.length && !inc.entities.keywords?.length && (
              <p className="text-neutral-600">—</p>
            )}
          </div>
        </div>

        {/* Emotional vectors */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-2">
            {t('intel.detail.emotional')}
          </p>
          <div className="flex flex-col gap-2">
            <VectorBar label={t('report.urgency')}   value={inc.urgency_score} />
            <VectorBar label={t('report.coercion')}  value={inc.coercion_score} />
            <VectorBar label={t('report.authority')} value={inc.authority_score} />
          </div>
        </div>

        {/* Campaign */}
        {inc.campaign && (
          <div>
            <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-1.5">
              {t('intel.detail.campaign')}
            </p>
            <div className="flex items-center gap-2">
              <GitBranch size={10} className="text-neutral-600" />
              <span className="text-[11px] text-amber-400 font-mono">{inc.campaign}</span>
            </div>
          </div>
        )}

        {/* Recommended actions */}
        <div>
          <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-2">
            {t('intel.detail.actions')}
          </p>
          <ul className="flex flex-col gap-1.5">
            {actions.map((a, i) => (
              <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-300">
                <span className="text-amber-400 font-mono shrink-0 mt-0.5">{i + 1}.</span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        {inc.similar_count > 0 && (
          <p className="text-[11px] text-neutral-600 font-mono">
            {inc.similar_count} {t('report.similar')} encontrados
          </p>
        )}
      </div>
    </div>
  )
}

// Desktop table row
function IncidentRow({ inc, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`feed-row grid grid-cols-[60px_60px_88px_1fr_115px_52px] px-4 py-3 border-b border-[#1e1e1e] items-center cursor-pointer transition-colors ${
        isSelected ? 'bg-[#1f1e1d]' : 'hover:bg-[#191919]'
      }`}
    >
      <span className="text-[10px] font-mono text-neutral-600">{inc.shortId}</span>
      <span className="text-[10px] font-mono text-neutral-500">{inc.time}</span>
      <div className="flex flex-col gap-1">
        <span className={`text-[9px] uppercase tracking-wider font-medium border px-1.5 py-0.5 rounded ${typeBadge(inc.type)}`}>
          {inc.type}
        </span>
        {inc.report_count > 0 && (
          <span className="text-[9px] font-mono" style={{ color: '#f59e0b' }}>
            ✓ verificado
          </span>
        )}
      </div>
      <div className="min-w-0 pr-3">
        <p className="text-[12px] text-neutral-200 truncate">{inc.desc}</p>
        {inc.campaign && (
          <p className="text-[10px] text-neutral-600 font-mono mt-0.5 truncate">↳ {inc.campaign}</p>
        )}
      </div>
      <span className="text-[11px] text-neutral-500 truncate">{inc.location}</span>
      <span className="text-[13px] font-mono font-semibold tabular-nums" style={{ color: scoreColor(inc.risk) }}>
        {inc.risk}
      </span>
    </div>
  )
}

// Mobile card
function IncidentCard({ inc, isSelected, onClick }) {
  return (
    <div
      onClick={onClick}
      className={`px-4 py-3 border-b border-[#1e1e1e] cursor-pointer transition-colors ${
        isSelected ? 'bg-[#1f1e1d]' : 'hover:bg-[#191919]'
      }`}
      style={{ minHeight: 44 }}
    >
      <div className="flex items-center justify-between mb-1.5">
        <span className={`text-[9px] uppercase tracking-wider font-medium border px-1.5 py-0.5 rounded ${typeBadge(inc.type)}`}>
          {inc.type}
        </span>
        <span className="text-[13px] font-mono font-semibold tabular-nums" style={{ color: scoreColor(inc.risk) }}>
          {inc.risk}
        </span>
      </div>
      <p className="text-[12px] text-neutral-200 mb-1 line-clamp-2">{inc.desc}</p>
      <div className="flex items-center gap-2 text-[10px] font-mono text-neutral-500">
        <span className="truncate">{inc.location}</span>
        <span>·</span>
        <span className="shrink-0">{inc.time}</span>
      </div>
    </div>
  )
}

export default function IntelligenceFeed() {
  const { t } = useLang()
  const [incidents, setIncidents]   = useState([])
  const [loading, setLoading]       = useState(true)
  const [search, setSearch]         = useState('')
  const [filters, setFilters]       = useState({ region: '', type: '', risk: 'all' })
  const [selectedId, setSelectedId] = useState(null)
  const [page, setPage]             = useState(0)
  const [isMobile, setIsMobile]     = useState(() => window.innerWidth < 768)

  const tableBodyRef = useRef(null)

  useEffect(() => {
    const fn = () => setIsMobile(window.innerWidth < 768)
    window.addEventListener('resize', fn)
    return () => window.removeEventListener('resize', fn)
  }, [])

  const setFilter = (k, v) => { setFilters((f) => ({ ...f, [k]: v })); setPage(0) }

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
    t('intel.col.id'), t('intel.col.time'), t('intel.col.type'),
    t('intel.col.desc'), t('intel.col.loc'), t('intel.col.risk'),
  ]

  const apiFilters = useMemo(() => {
    const f = { limit: 200 }
    if (filters.region) f.region = filters.region
    if (filters.type)   f.threat_type = filters.type
    if (search.trim())  f.search = search.trim()
    return f
  }, [filters.region, filters.type, search])

  useEffect(() => {
    let cancelled = false
    setLoading(true)
    const load = () => {
      getFeed(apiFilters).then((data) => {
        if (cancelled) return
        setIncidents(data ? data.map(mapApiIncident) : [])
        setPage(0)
        setSelectedId(null)
        setLoading(false)
      })
    }
    load()
    const interval = setInterval(load, 60000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [apiFilters])

  const filtered = useMemo(() => {
    if (filters.risk === 'all') return incidents
    return incidents.filter((inc) => riskBand(inc.risk) === filters.risk)
  }, [incidents, filters.risk])

  const pageCount = Math.max(1, Math.ceil(filtered.length / PAGE_SIZE))
  const safePage = Math.min(page, pageCount - 1)
  const paginated = filtered.slice(safePage * PAGE_SIZE, (safePage + 1) * PAGE_SIZE)

  useGSAP(() => {
    if (paginated.length > 0) {
      gsap.from('.feed-row', { opacity: 0, duration: 0.3, stagger: 0.04 })
    }
  }, { scope: tableBodyRef, dependencies: [safePage, paginated.length] })

  const selectedInc = incidents.find((i) => i.id === selectedId) ?? null

  return (
    <div className="flex flex-col md:flex-row h-full min-h-0">
      {/* Main area */}
      <div className="flex-1 flex flex-col min-w-0 border-b md:border-b-0 md:border-r border-[#262626]">

        {/* Filters bar — scrollable on mobile */}
        <div className="px-4 py-2.5 border-b border-[#262626] flex items-center gap-2 overflow-x-auto shrink-0">
          <div className="relative flex items-center shrink-0">
            <Search size={11} className="absolute left-2 text-neutral-600 pointer-events-none" strokeWidth={1.5} />
            <input
              type="text"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(0) }}
              placeholder={t('intel.search')}
              className="pl-6 pr-2 py-1.5 bg-[#1c1b1b] border border-[#262626] text-[11px] text-neutral-400 placeholder-neutral-600 rounded font-mono outline-none focus:border-[#383838] w-36 md:w-44"
            />
          </div>
          <Filter size={11} className="text-neutral-600 shrink-0" strokeWidth={1.5} />
          <FilterSelect options={regionOptions} value={filters.region} onChange={(v) => setFilter('region', v)} />
          <FilterSelect options={typeOptions}   value={filters.type}   onChange={(v) => setFilter('type',   v)} />
          <FilterSelect options={riskOptions}   value={filters.risk}   onChange={(v) => setFilter('risk',   v)} />
          <span className="ml-auto text-[11px] font-mono text-neutral-600 shrink-0">
            {filtered.length} {t('intel.count')}
          </span>
          <button
            onClick={() => exportCSV(filtered)}
            className="flex items-center gap-1.5 text-[10px] font-mono text-neutral-500 hover:text-neutral-300 border border-[#2a2a2a] px-2 py-1.5 rounded transition-colors shrink-0"
          >
            <Download size={10} strokeWidth={1.5} />
            <span className="hidden sm:inline">{t('intel.export')}</span>
          </button>
        </div>

        {/* Table header — desktop/tablet only */}
        {!isMobile && (
          <div className="grid grid-cols-[60px_60px_88px_1fr_115px_52px] px-4 py-2 border-b border-[#262626] shrink-0">
            {tableHeaders.map((h) => (
              <span key={h} className="text-[10px] uppercase tracking-widest text-neutral-600 font-mono">{h}</span>
            ))}
          </div>
        )}

        {/* Rows / Cards */}
        <div ref={tableBodyRef} className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center h-48">
              <LoadingSpinner message="Cargando incidentes..." />
            </div>
          ) : filtered.length === 0 ? (
            <div className="flex items-center justify-center h-32 text-[12px] text-neutral-600">
              {t('intel.noMatch')}
            </div>
          ) : isMobile ? (
            paginated.map((inc) => (
              <IncidentCard
                key={inc.id}
                inc={inc}
                isSelected={inc.id === selectedId}
                onClick={() => setSelectedId(inc.id === selectedId ? null : inc.id)}
              />
            ))
          ) : (
            paginated.map((inc) => (
              <IncidentRow
                key={inc.id}
                inc={inc}
                isSelected={inc.id === selectedId}
                onClick={() => setSelectedId(inc.id === selectedId ? null : inc.id)}
              />
            ))
          )}
        </div>

        {/* Pagination */}
        {pageCount > 1 && (
          <div className="px-4 py-2 border-t border-[#262626] flex items-center gap-3 shrink-0">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={safePage === 0}
              className="text-neutral-600 hover:text-neutral-400 disabled:opacity-30 transition-colors p-1"
            >
              <ChevronLeft size={13} />
            </button>
            <span className="text-[11px] font-mono text-neutral-500">
              {t('intel.page')} {safePage + 1} {t('intel.of')} {pageCount}
            </span>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={safePage >= pageCount - 1}
              className="text-neutral-600 hover:text-neutral-400 disabled:opacity-30 transition-colors p-1"
            >
              <ChevronRight size={13} />
            </button>
          </div>
        )}
      </div>

      {/* Detail panel */}
      {selectedInc ? (
        <DetailPanel inc={selectedInc} onClose={() => setSelectedId(null)} />
      ) : (
        <div className="hidden md:flex w-[270px] shrink-0 items-center justify-center p-6 text-center border-l border-[#262626]">
          <p className="text-[12px] text-neutral-600">{t('intel.detail.noSelect')}</p>
        </div>
      )}
    </div>
  )
}
