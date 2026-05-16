import { useEffect, useRef, useState } from 'react'
import gsap from 'gsap'
import { useGSAP } from '@gsap/react'
import { Shield, Activity, AlertTriangle, TrendingUp } from 'lucide-react'
import { getStats, getFeed, getCampaigns } from '../lib/api'
import { useLang } from '../lib/LanguageContext'
import LoadingSpinner from '../components/LoadingSpinner'
import ThreatMap from '../components/ThreatMap'

const METRIC_DEFS = [
  { id: 'threats24h', i18nKey: 'dash.threats24h', statsField: 'total_24h',       icon: Shield        },
  { id: 'campaigns',  i18nKey: 'dash.campaigns',  statsField: 'active_campaigns', icon: Activity      },
  { id: 'regional',   i18nKey: 'dash.regional',   statsField: 'regional_alerts',  icon: AlertTriangle },
  { id: 'avgRisk',    i18nKey: 'dash.avgRisk',     statsField: 'avg_risk_score',   icon: TrendingUp    },
]

const CAMPAIGN_NAMES = {
  'camp-bbva-fake-001':       'BBVA Fake Login',
  'camp-empleo-remoto-001':   'Empleo Remoto',
  'camp-cfe-sms-001':         'CFE Adeudo SMS',
  'camp-inversion-ponzi-001': 'Inversión Ponzi',
}

function scoreColor(s) {
  if (s >= 80) return '#ef4444'
  if (s >= 60) return '#f59e0b'
  return '#6b7280'
}

function relativeTime(isoString) {
  const diff = Math.floor((Date.now() - new Date(isoString)) / 1000)
  if (diff < 60)   return `${diff}s ago`
  if (diff < 3600) return `${Math.floor(diff / 60)}min ago`
  return `${Math.floor(diff / 3600)}h ago`
}

function MetricCard({ label, value, icon: Icon }) {
  return (
    <div className="card-base metric-card p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono leading-tight">
          {label}
        </span>
        <Icon size={13} className="text-neutral-700 shrink-0 mt-0.5" strokeWidth={1.5} />
      </div>
      <p className="text-[26px] font-semibold text-neutral-100 font-mono leading-none">{value}</p>
    </div>
  )
}

function IncidentRow({ score, title, location, ago, type }) {
  return (
    <div className="card-base feed-item px-3 py-2.5 flex items-center gap-2.5 cursor-default hover:border-[#323232] transition-colors">
      <span
        className="font-mono text-sm font-bold shrink-0 w-7 text-right tabular-nums"
        style={{ color: scoreColor(score) }}
      >
        {score}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-[12px] text-neutral-200 truncate leading-snug">{title}</p>
        <p className="text-[10px] text-neutral-500 font-mono mt-0.5">{location} · {ago}</p>
      </div>
      <span className="text-[9px] uppercase tracking-wider text-neutral-600 border border-[#2a2a2a] px-1.5 py-0.5 rounded shrink-0">
        {type}
      </span>
    </div>
  )
}

function CampaignBar({ name, count, pct }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="text-[11px] text-neutral-300 truncate">{name}</span>
        <span className="text-[11px] font-mono text-amber-400 shrink-0">{count}</span>
      </div>
      <div className="h-[3px] bg-[#222] rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const { t } = useLang()
  const [apiStats, setApiStats]       = useState(null)
  const [feedItems, setFeedItems]     = useState([])
  const [allIncidents, setAllIncidents] = useState([])
  const [campaigns, setCampaigns]     = useState([])
  const [loading, setLoading]         = useState(true)

  const dashRef       = useRef(null)
  const feedAnimated  = useRef(false)

  useGSAP(() => {
    gsap.from('.metric-card', { opacity: 0, y: 20, duration: 0.5, stagger: 0.1 })
    gsap.from('.map-container', { opacity: 0, duration: 0.8, delay: 0.3 })
  }, { scope: dashRef })

  useEffect(() => {
    if (feedItems.length > 0 && !feedAnimated.current) {
      feedAnimated.current = true
      gsap.from('.feed-item', { opacity: 0, x: -20, duration: 0.4, stagger: 0.08 })
    }
  }, [feedItems.length])

  useEffect(() => {
    let cancelled = false

    const load = async () => {
      const [stats, feed, camps] = await Promise.all([
        getStats(),
        getFeed({ limit: 10 }),
        getCampaigns(),
      ])
      if (cancelled) return

      if (stats) setApiStats(stats)

      if (feed && feed.length > 0) {
        setFeedItems(
          feed.map((inc) => ({
            id:       inc.id,
            score:    inc.risk_score,
            title:    inc.entities?.keywords?.length
                        ? inc.entities.keywords.slice(0, 2).join(' · ')
                        : `${inc.threat_type.toUpperCase()} · ${inc.region ?? '—'}`,
            location: inc.region?.split(',')[0] ?? '—',
            ago:      relativeTime(inc.created_at),
            type:     inc.threat_type,
          }))
        )
        setAllIncidents(feed)
      }

      if (camps && camps.length > 0) setCampaigns(camps)
      setLoading(false)
    }

    load()
    const interval = setInterval(load, 30000)
    return () => { cancelled = true; clearInterval(interval) }
  }, [])

  const metrics = METRIC_DEFS.map((def) => ({
    id:    def.id,
    label: t(def.i18nKey),
    value: loading
      ? '…'
      : def.id === 'avgRisk'
        ? (apiStats?.[def.statsField] ?? 0).toFixed(1)
        : String(apiStats?.[def.statsField] ?? '—'),
    icon: def.icon,
  }))

  const maxCount = campaigns.reduce((m, c) => Math.max(m, c.count), 1)
  const topCampaigns = campaigns.slice(0, 4).map((c) => ({
    name:  CAMPAIGN_NAMES[c.campaign_id] ?? c.campaign_id,
    count: `${c.count} casos`,
    pct:   Math.round((c.count / maxCount) * 100),
  }))

  return (
    <div ref={dashRef} className="p-5 flex flex-col gap-3">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3">
        {metrics.map((m) => <MetricCard key={m.id} {...m} />)}
      </div>

      {/* Feed + Map */}
      <div className="flex gap-3" style={{ height: 390 }}>
        {/* Live Feed */}
        <div className="w-60 shrink-0 flex flex-col gap-0 overflow-y-auto">
          <div className="flex items-center justify-between px-0.5 mb-2 shrink-0">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
              {t('dash.liveFeed')}
            </span>
            <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
              <span className="live-pulse inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              {t('dash.live')}
            </span>
          </div>
          {feedItems.length === 0 ? (
            <div className="flex items-center justify-center h-32">
              {loading
                ? <LoadingSpinner message="Cargando inteligencia..." />
                : <span className="text-[12px] text-neutral-600">{t('dash.noData')}</span>
              }
            </div>
          ) : (
            <div className="flex flex-col gap-1.5">
              {feedItems.map((inc) => <IncidentRow key={inc.id} {...inc} />)}
            </div>
          )}
        </div>

        {/* Map */}
        <div className="map-container flex-1 card-base flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-[#262626] shrink-0 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
              {t('dash.threatMap')}
            </span>
            <span className="text-[10px] font-mono text-neutral-600">
              {allIncidents.length} {t('dash.incidentsMapped')}
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <ThreatMap incidents={allIncidents} />
          </div>
        </div>
      </div>

      {/* Trending Campaigns */}
      <div className="card-base p-3.5">
        <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-3">
          {t('dash.trending')}
        </p>
        {topCampaigns.length === 0 ? (
          <div className="flex items-center justify-center h-16">
            {loading
              ? <LoadingSpinner message="Cargando inteligencia..." />
              : <p className="text-[11px] text-neutral-600">{t('dash.noData')}</p>
            }
          </div>
        ) : (
          <div className="flex gap-5">
            {topCampaigns.map((c) => <CampaignBar key={c.name} {...c} />)}
          </div>
        )}
      </div>
    </div>
  )
}
