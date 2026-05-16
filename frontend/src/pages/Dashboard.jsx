import { useEffect, useState } from 'react'
import 'leaflet/dist/leaflet.css'
import { MapContainer, TileLayer, CircleMarker, Tooltip } from 'react-leaflet'
import { Shield, Activity, AlertTriangle, TrendingUp } from 'lucide-react'
import { getStats, getFeed } from '../lib/api'

const SEED_METRICS = [
  { label: 'Threats Detected (24H)', value: '142', icon: Shield,        delta: '+12', up: true  },
  { label: 'Active Campaigns',       value: '12',  icon: Activity,      delta: '+3',  up: true  },
  { label: 'Regional Alerts',        value: '8',   icon: AlertTriangle, delta: '-1',  up: false },
  { label: 'Avg Risk Score',         value: '67.3', icon: TrendingUp,   delta: '+2.1', up: true },
]

const SEED_INCIDENTS = [
  { id: 1, score: 92, title: 'WhatsApp Empleo Falso',   location: 'Chihuahua', ago: '2min ago',  type: 'smishing'  },
  { id: 2, score: 88, title: 'BBVA Clone Phishing',     location: 'CDMX',      ago: '5min ago',  type: 'phishing'  },
  { id: 3, score: 78, title: 'CFE Fraude SMS',          location: 'Chihuahua', ago: '12min ago', type: 'smishing'  },
  { id: 4, score: 71, title: 'Suplantación SAT',        location: 'Monterrey', ago: '18min ago', type: 'phishing'  },
  { id: 5, score: 65, title: 'Inversión Falsa Ponzi',   location: 'Juárez',    ago: '31min ago', type: 'scam'      },
  { id: 6, score: 45, title: 'Tienda Falsa Facebook',   location: 'Bogotá',    ago: '47min ago', type: 'scam'      },
]

const MAP_POINTS = [
  { city: 'Chihuahua',      lat: 28.6353,  lng: -106.0889, incidents: 24, r: 16 },
  { city: 'Ciudad Juárez',  lat: 31.6904,  lng: -106.4245, incidents: 18, r: 13 },
  { city: 'CDMX',           lat: 19.4326,  lng: -99.1332,  incidents: 31, r: 19 },
  { city: 'Monterrey',      lat: 25.6866,  lng: -100.3161, incidents: 15, r: 12 },
  { city: 'Bogotá',         lat:  4.7110,  lng: -74.0721,  incidents: 12, r: 11 },
  { city: 'São Paulo',      lat: -23.5505, lng: -46.6333,  incidents: 22, r: 15 },
  { city: 'Buenos Aires',   lat: -34.6037, lng: -58.3816,  incidents:  9, r:  9 },
  { city: 'Lima',           lat: -12.0464, lng: -77.0428,  incidents: 11, r: 10 },
  { city: 'Santiago',       lat: -33.4569, lng: -70.6483,  incidents:  7, r:  8 },
  { city: 'Guadalajara',    lat: 20.6597,  lng: -103.3496, incidents: 14, r: 12 },
]

const CAMPAIGNS = [
  { name: 'BBVA Fake Login',       delta: '+42%', pct: 84 },
  { name: 'Empleo Remoto Falso',   delta: '+38%', pct: 76 },
  { name: 'CFE Adeudo SMS',        delta: '+28%', pct: 56 },
  { name: 'Inversión Garantizada', delta: '+15%', pct: 30 },
]

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

function MetricCard({ label, value, icon: Icon, delta, up }) {
  return (
    <div className="card-base p-4">
      <div className="flex items-start justify-between mb-3">
        <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono leading-tight">
          {label}
        </span>
        <Icon size={13} className="text-neutral-700 shrink-0 mt-0.5" strokeWidth={1.5} />
      </div>
      <p className="text-[26px] font-semibold text-neutral-100 font-mono leading-none">{value}</p>
      <p className={`text-[11px] font-mono mt-2 ${up ? 'text-amber-400' : 'text-emerald-500'}`}>
        {delta} vs yesterday
      </p>
    </div>
  )
}

function IncidentRow({ score, title, location, ago, type }) {
  return (
    <div className="card-base px-3 py-2.5 flex items-center gap-2.5 cursor-default hover:border-[#323232] transition-colors">
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

function CampaignBar({ name, delta, pct }) {
  return (
    <div className="flex-1 min-w-0">
      <div className="flex items-center justify-between mb-1.5 gap-2">
        <span className="text-[11px] text-neutral-300 truncate">{name}</span>
        <span className="text-[11px] font-mono text-amber-400 shrink-0">{delta}</span>
      </div>
      <div className="h-[3px] bg-[#222] rounded-full overflow-hidden">
        <div className="h-full bg-amber-400 rounded-full" style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

export default function Dashboard() {
  const [metrics, setMetrics]     = useState(SEED_METRICS)
  const [incidents, setIncidents] = useState(SEED_INCIDENTS)
  const [loading, setLoading]     = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [stats, feed] = await Promise.all([
        getStats(),
        getFeed({ limit: 6 }),
      ])

      if (cancelled) return

      if (stats) {
        setMetrics([
          { label: 'Threats Detected (24H)', value: String(stats.total_24h),          icon: Shield,        delta: '+12', up: true  },
          { label: 'Active Campaigns',       value: String(stats.active_campaigns),    icon: Activity,      delta: '+3',  up: true  },
          { label: 'Regional Alerts',        value: String(stats.regional_alerts),     icon: AlertTriangle, delta: '-1',  up: false },
          { label: 'Avg Risk Score',         value: (stats.avg_risk_score ?? 0).toFixed(1), icon: TrendingUp, delta: '+2.1', up: true },
        ])
      }

      if (feed && feed.length > 0) {
        setIncidents(
          feed.map((inc) => ({
            id:       inc.id,
            score:    inc.risk_score,
            title:    `${inc.threat_type.toUpperCase()} · ${inc.region}`,
            location: inc.region?.split(',')[0] ?? '—',
            ago:      relativeTime(inc.created_at),
            type:     inc.threat_type,
          }))
        )
      }

      setLoading(false)
    }

    load()
    return () => { cancelled = true }
  }, [])

  return (
    <div className="p-5 flex flex-col gap-3">
      {/* Metrics */}
      <div className="grid grid-cols-4 gap-3">
        {metrics.map((m) => (
          <MetricCard
            key={m.label}
            {...m}
            value={loading ? '…' : m.value}
          />
        ))}
      </div>

      {/* Feed + Map */}
      <div className="flex gap-3" style={{ height: 390 }}>
        {/* Live Feed */}
        <div className="w-60 shrink-0 flex flex-col gap-0 overflow-y-auto">
          <div className="flex items-center justify-between px-0.5 mb-2 shrink-0">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
              Live Feed
            </span>
            <span className="text-[10px] font-mono text-amber-400 flex items-center gap-1">
              <span className="live-pulse inline-block w-1.5 h-1.5 rounded-full bg-amber-400" />
              live
            </span>
          </div>
          <div className="flex flex-col gap-1.5">
            {incidents.map((inc) => <IncidentRow key={inc.id} {...inc} />)}
          </div>
        </div>

        {/* Map */}
        <div className="flex-1 card-base flex flex-col overflow-hidden">
          <div className="px-3 py-2 border-b border-[#262626] shrink-0 flex items-center justify-between">
            <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
              Threat Map — LATAM
            </span>
            <span className="text-[10px] font-mono text-neutral-600">
              {MAP_POINTS.reduce((a, p) => a + p.incidents, 0)} incidents mapped
            </span>
          </div>
          <div className="flex-1 min-h-0">
            <MapContainer
              center={[19.4326, -99.1332]}
              zoom={4}
              scrollWheelZoom={false}
              zoomControl={false}
              attributionControl={false}
              style={{ height: '100%', width: '100%', background: '#0d0d0d' }}
            >
              <TileLayer url="https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png" />
              {MAP_POINTS.map((p) => (
                <CircleMarker
                  key={p.city}
                  center={[p.lat, p.lng]}
                  radius={p.r}
                  pathOptions={{
                    color: 'rgba(255,193,116,0.8)',
                    fillColor: 'rgba(255,193,116,0.15)',
                    fillOpacity: 1,
                    weight: 1.5,
                  }}
                >
                  <Tooltip direction="top" offset={[0, -p.r]}>
                    <div style={{ fontFamily: 'monospace', fontSize: 11, background: '#1c1b1b', color: '#e5e5e5', padding: '4px 8px', border: '1px solid #262626' }}>
                      <strong>{p.city}</strong><br />
                      {p.incidents} incidents
                    </div>
                  </Tooltip>
                </CircleMarker>
              ))}
            </MapContainer>
          </div>
        </div>
      </div>

      {/* Trending Campaigns */}
      <div className="card-base p-3.5">
        <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-3">
          Trending Campaigns
        </p>
        <div className="flex gap-5">
          {CAMPAIGNS.map((c) => <CampaignBar key={c.name} {...c} />)}
        </div>
      </div>
    </div>
  )
}
