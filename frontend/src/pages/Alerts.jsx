import { AlertOctagon, AlertTriangle, ChevronRight } from 'lucide-react'
import { useLang } from '../lib/LanguageContext'

const ALERTS = [
  {
    id: 'ALT-001',
    level:     'critical',
    title:     'WhatsApp Empleo Falso',
    region:    'Chihuahua, MX',
    score:     92,
    type:      'smishing',
    note:      '34 similar reports this week',
    timestamp: '2min ago',
  },
  {
    id: 'ALT-002',
    level:     'high',
    title:     'BBVA Clone Phishing',
    region:    'CDMX, MX',
    score:     88,
    type:      'phishing',
    note:      '18 incidents in active campaign',
    timestamp: '5min ago',
  },
  {
    id: 'ALT-003',
    level:     'high',
    title:     'CFE Adeudo SMS',
    region:    'Chihuahua, MX',
    score:     78,
    type:      'smishing',
    note:      'Spike +142% in last hour',
    timestamp: '12min ago',
  },
]

const LEVEL_STYLES = {
  critical: {
    badge:  'text-red-400 bg-red-500/10 border-red-500/20',
    border: 'border-l-red-500',
    icon:   AlertOctagon,
    color:  '#ef4444',
  },
  high: {
    badge:  'text-amber-400 bg-amber-500/10 border-amber-500/20',
    border: 'border-l-amber-400',
    icon:   AlertTriangle,
    color:  '#f59e0b',
  },
}

function scoreColor(s) {
  if (s >= 80) return '#ef4444'
  if (s >= 60) return '#f59e0b'
  return '#6b7280'
}

function AlertCard({ id, level, title, region, score, type, note, timestamp }) {
  const { t } = useLang()
  const styles = LEVEL_STYLES[level]
  const Icon   = styles.icon

  return (
    <div className={`bg-[#1c1b1b] border border-[#262626] border-l-2 ${styles.border} rounded p-4 flex items-start gap-4`}>
      <Icon size={16} strokeWidth={1.5} className="shrink-0 mt-0.5" style={{ color: styles.color }} />

      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className={`text-[9px] uppercase tracking-widest font-medium border px-1.5 py-0.5 rounded ${styles.badge}`}>
            {level}
          </span>
          <span className="text-[9px] uppercase tracking-wider text-neutral-600 border border-[#2a2a2a] px-1.5 py-0.5 rounded">
            {type}
          </span>
          <span className="text-[10px] font-mono text-neutral-600 ml-auto">{timestamp}</span>
        </div>

        <p className="text-[13px] font-medium text-neutral-200">{title}</p>
        <p className="text-[11px] text-neutral-500 font-mono mt-0.5">{region}</p>

        {note && (
          <p className="text-[11px] text-neutral-600 mt-2 italic">{note}</p>
        )}
      </div>

      <div className="flex flex-col items-end gap-3 shrink-0">
        <span
          className="text-[22px] font-mono font-bold tabular-nums leading-none"
          style={{ color: scoreColor(score) }}
        >
          {score}
        </span>
        <button className="flex items-center gap-1 text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors">
          {t('alerts.view')} <ChevronRight size={11} />
        </button>
      </div>
    </div>
  )
}

export default function Alerts() {
  const { t } = useLang()

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h1 className="text-sm font-semibold text-neutral-200">{t('alerts.title')}</h1>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {t('alerts.subtitle')}
          </p>
        </div>
        <span className="text-[11px] font-mono text-neutral-600">
          {ALERTS.length} {t('alerts.active')}
        </span>
      </div>

      <div className="flex flex-col gap-2">
        {ALERTS.map((alert) => (
          <AlertCard key={alert.id} {...alert} />
        ))}
      </div>
    </div>
  )
}
