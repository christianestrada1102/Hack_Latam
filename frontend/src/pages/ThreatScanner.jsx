import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Link, FileText, Mic, ChevronRight, AlertOctagon, ShieldAlert, CheckCircle, X, Copy, ExternalLink } from 'lucide-react'
import { analyzeContent } from '../lib/api'
import { useLang } from '../lib/LanguageContext'

const TABS = [
  { id: 'image', i18nKey: 'scanner.tab.image', icon: Upload   },
  { id: 'url',   i18nKey: 'scanner.tab.url',   icon: Link     },
  { id: 'text',  i18nKey: 'scanner.tab.text',  icon: FileText },
  { id: 'audio', i18nKey: 'scanner.tab.audio', icon: Mic      },
]

// Timing is language-independent; text is resolved via t() at runtime
const LOG_TIMING = [
  { ms: 0,    key: 'log.init',     color: 'neutral' },
  { ms: 400,  key: 'log.features', color: 'neutral' },
  { ms: 800,  key: 'log.ocr',      color: 'neutral' },
  { ms: 1300, key: 'log.classify', color: 'neutral' },
  { ms: 1900, key: 'log.embed',    color: 'neutral' },
  { ms: 2400, key: 'log.pgvector', color: 'neutral' },
  { ms: 2900, key: 'log.similar',  color: 'amber'   },
  { ms: 3300, key: 'log.score',    color: 'neutral' },
  { ms: 3700, key: 'log.done',     color: 'red'     },
]

const ANIMATION_DURATION = LOG_TIMING.at(-1).ms + 400

const DEMO_CONTENT = {
  image: '[screenshot: bbva-verificacion.mx login form]',
  url:   'https://bbva-verificacion-cuenta.mx/acceso?token=abc123',
  text:  'URGENTE: Su cuenta BBVA ha sido bloqueada por actividad sospechosa. Transfiera sus fondos ahora a cuenta segura: 012345678901 para proteger su dinero. Llame 614-822-5511.',
  audio: '[voice_note_001.ogg — "Soy del IMSS, necesito sus datos urgente"]',
}

const MOCK_RESULT = {
  score:    88,
  category: 'phishing',
  vectors: [
    { name: 'report.authority', value: 91 },
    { name: 'report.urgency',   value: 82 },
    { name: 'report.coercion',  value: 65 },
  ],
  entities: {
    phone:    '+52 614-822-5511',
    domain:   'bbva-verificacion-cuenta.mx',
    keywords: ['Usa urgencia artificial para presionar una decisión rápida sin dar tiempo a verificar', 'Suplanta autoridad bancaria para generar confianza falsa'],
  },
  actions: [
    'No hagas clic en ningún enlace del mensaje — los dominios falsos imitan sitios oficiales para robar tus credenciales',
    'Llama directamente a BBVA al 800 226 2663 para verificar el estado real de tu cuenta',
    'Reporta el mensaje en condusef.gob.mx / CERT-MX con capturas de pantalla',
    'Bloquea el número remitente para evitar futuros contactos fraudulentos',
  ],
  manipulationSummary: 'Este mensaje usa urgencia extrema combinada con amenaza de pérdida de fondos para evitar que verifiques la información con tu banco. La mención de "actividad sospechosa" y la instrucción de transferir dinero inmediatamente son tácticas clásicas de fraude bancario diseñadas para impedir que consultes a familiares o al banco directamente.',
  similar: 34,
  region:  'Chihuahua',
}

function mapApiResult(api) {
  if (!api) return null
  return {
    score:    api.risk_score ?? 0,
    category: api.threat_type ?? 'unknown',
    vectors: [
      { name: 'report.authority', value: api.authority_score ?? 0 },
      { name: 'report.urgency',   value: api.urgency_score   ?? 0 },
      { name: 'report.coercion',  value: api.coercion_score  ?? 0 },
    ],
    entities: {
      phone:    api.entities?.phones?.[0]   ?? '—',
      domain:   api.entities?.domains?.[0]  ?? '—',
      keywords: api.entities?.keywords      ?? [],
    },
    actions:             api.recommended_actions   ?? MOCK_RESULT.actions,
    manipulationSummary: api.manipulation_summary   ?? null,
    similar:             api.similar_count          ?? 0,
    region:              api.region                 ?? null,
  }
}

function scoreColor(s) {
  if (s >= 80) return '#ef4444'
  if (s >= 60) return '#f59e0b'
  return '#10b981'
}

const truncateRegion = (r, max = 20) =>
  r ? (r.length > max ? r.slice(0, max) + '…' : r) : null

function parseHighlights(text, entities) {
  if (!text) return [{ text: '', type: null }]
  const { phone, domain, keywords } = entities ?? {}
  const ranges = []

  const addRanges = (str, type) => {
    if (!str || str === '—') return
    const escaped = str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    const re = new RegExp(escaped, 'gi')
    let m
    while ((m = re.exec(text)) !== null)
      ranges.push({ start: m.index, end: m.index + m[0].length, type })
  }

  addRanges(domain, 'domain')
  addRanges(phone, 'phone')
  if (Array.isArray(keywords)) {
    keywords.forEach((kw) => {
      if (!kw) return
      const escaped = kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
      const re = new RegExp(`\\b${escaped}\\b`, 'gi')
      let m
      while ((m = re.exec(text)) !== null)
        ranges.push({ start: m.index, end: m.index + m[0].length, type: 'keyword' })
    })
  }

  ranges.sort((a, b) => a.start - b.start || b.end - a.end)
  const segs = []
  let pos = 0
  for (const r of ranges) {
    if (r.start < pos) continue
    if (r.start > pos) segs.push({ text: text.slice(pos, r.start), type: null })
    segs.push({ text: text.slice(r.start, r.end), type: r.type })
    pos = r.end
  }
  if (pos < text.length) segs.push({ text: text.slice(pos), type: null })
  return segs.length ? segs : [{ text, type: null }]
}

const HIGHLIGHT_STYLE = {
  domain:  { background: '#f59e0b20', borderBottom: '1px solid #f59e0b80', color: '#f59e0b' },
  phone:   { background: '#ef444420', borderBottom: '1px solid #ef444480' },
  keyword: { background: '#f9731620', textDecoration: 'underline dotted #f97316' },
}
const TOOLTIP_LABEL = {
  domain:  'Dominio sospechoso',
  phone:   'Número sospechoso',
  keyword: 'Táctica de manipulación',
}

function HighlightedContent({ text, entities }) {
  const segs = parseHighlights(text, entities)
  return (
    <p className="text-[12px] text-neutral-300 font-mono leading-relaxed break-words whitespace-pre-wrap">
      {segs.map((seg, i) =>
        seg.type ? (
          <span key={i} className="relative group inline" style={HIGHLIGHT_STYLE[seg.type]}>
            {seg.text}
            <span
              className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1.5 px-2 py-1 rounded whitespace-nowrap pointer-events-none z-50 opacity-0 group-hover:opacity-100 transition-opacity duration-150"
              style={{ background: '#1c1b1b', border: '1px solid #262626', fontSize: 11, color: '#f59e0b' }}
            >
              {TOOLTIP_LABEL[seg.type]}
            </span>
          </span>
        ) : (
          <span key={i}>{seg.text}</span>
        )
      )}
    </p>
  )
}

function CircularScore({ score }) {
  const { t } = useLang()
  const r = 38
  const circ = 2 * Math.PI * r
  const offset = circ - (score / 100) * circ
  const color = scoreColor(score)
  return (
    <div className="relative flex items-center justify-center w-[100px] h-[100px]">
      <svg className="absolute inset-0 -rotate-90" width="100" height="100">
        <circle cx="50" cy="50" r={r} fill="none" stroke="#262626" strokeWidth="5" />
        <circle
          cx="50" cy="50" r={r}
          fill="none" stroke={color} strokeWidth="5"
          strokeDasharray={circ}
          strokeDashoffset={offset}
          strokeLinecap="round"
          style={{ transition: 'stroke-dashoffset 1s ease' }}
        />
      </svg>
      <div className="relative flex flex-col items-center leading-none">
        <span className="font-mono text-[28px] font-bold" style={{ color }}>{score}</span>
        <span className="text-[10px] text-neutral-500 uppercase tracking-widest mt-0.5 font-mono">{t('report.risk')}</span>
      </div>
    </div>
  )
}

function VectorBar({ name, value }) {
  const { t } = useLang()
  const color = value >= 80 ? '#ef4444' : value >= 60 ? '#f59e0b' : '#6b7280'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-neutral-400">{t(name)}</span>
        <span className="text-[11px] font-mono" style={{ color }}>{value}%</span>
      </div>
      <div className="h-[3px] bg-[#222] rounded-full overflow-hidden">
        <div
          className="h-full rounded-full transition-all duration-700"
          style={{ width: `${value}%`, background: color }}
        />
      </div>
    </div>
  )
}

function TerminalLog({ lines }) {
  const endRef = useRef(null)
  useEffect(() => { endRef.current?.scrollIntoView({ behavior: 'smooth' }) }, [lines])

  const colorClass = (c) => {
    if (c === 'amber') return 'text-amber-400'
    if (c === 'red')   return 'text-red-400'
    return 'text-neutral-400'
  }

  return (
    <div className="rounded border border-[#262626] bg-[#0a0a0a] p-3 font-mono text-[11px] h-36 overflow-y-auto">
      {lines.map((l, i) => (
        <div key={i} className={`leading-relaxed ${colorClass(l.color)}`}>{l.text}</div>
      ))}
      {lines.length > 0 && lines.length < LOG_TIMING.length && (
        <span className="text-neutral-600 animate-pulse">▌</span>
      )}
      <div ref={endRef} />
    </div>
  )
}

function AnalyzingPanel() {
  const { t } = useLang()
  return (
    <div className="flex flex-col items-center justify-center gap-4 px-2 w-full" style={{ minHeight: 400, height: '100%' }}>
      <div style={{ color: '#ffc174', width: 80, height: 80 }}>
        <svg
          version="1.1"
          xmlns="http://www.w3.org/2000/svg"
          viewBox="-13 -13 45 45"
          width="80"
          height="80"
          xmlSpace="preserve"
        >
          <style>{`
            .box5631 { transform-origin: 50% 50%; fill: currentColor; }
            @keyframes moveBox5631-1 {
              9.0909090909%  { transform: translate(-12px, 0); }
              18.1818181818% { transform: translate(0px, 0); }
              27.2727272727% { transform: translate(0px, 0); }
              36.3636363636% { transform: translate(12px, 0); }
              45.4545454545% { transform: translate(12px, 12px); }
              54.5454545455% { transform: translate(12px, 12px); }
              63.6363636364% { transform: translate(12px, 12px); }
              72.7272727273% { transform: translate(12px, 0px); }
              81.8181818182% { transform: translate(0px, 0px); }
              90.9090909091% { transform: translate(-12px, 0px); }
              100%           { transform: translate(0px, 0px); }
            }
            .box5631:nth-child(1) { animation: moveBox5631-1 4s infinite; }
            @keyframes moveBox5631-2 {
              9.0909090909%  { transform: translate(0, 0); }
              18.1818181818% { transform: translate(12px, 0); }
              27.2727272727% { transform: translate(0px, 0); }
              36.3636363636% { transform: translate(12px, 0); }
              45.4545454545% { transform: translate(12px, 12px); }
              54.5454545455% { transform: translate(12px, 12px); }
              63.6363636364% { transform: translate(12px, 12px); }
              72.7272727273% { transform: translate(12px, 12px); }
              81.8181818182% { transform: translate(0px, 12px); }
              90.9090909091% { transform: translate(0px, 12px); }
              100%           { transform: translate(0px, 0px); }
            }
            .box5631:nth-child(2) { animation: moveBox5631-2 4s infinite; }
            @keyframes moveBox5631-3 {
              9.0909090909%  { transform: translate(-12px, 0); }
              18.1818181818% { transform: translate(-12px, 0); }
              27.2727272727% { transform: translate(0px, 0); }
              36.3636363636% { transform: translate(-12px, 0); }
              45.4545454545% { transform: translate(-12px, 0); }
              54.5454545455% { transform: translate(-12px, 0); }
              63.6363636364% { transform: translate(-12px, 0); }
              72.7272727273% { transform: translate(-12px, 0); }
              81.8181818182% { transform: translate(-12px, -12px); }
              90.9090909091% { transform: translate(0px, -12px); }
              100%           { transform: translate(0px, 0px); }
            }
            .box5631:nth-child(3) { animation: moveBox5631-3 4s infinite; }
            @keyframes moveBox5631-4 {
              9.0909090909%  { transform: translate(-12px, 0); }
              18.1818181818% { transform: translate(-12px, 0); }
              27.2727272727% { transform: translate(-12px, -12px); }
              36.3636363636% { transform: translate(0px, -12px); }
              45.4545454545% { transform: translate(0px, 0px); }
              54.5454545455% { transform: translate(0px, -12px); }
              63.6363636364% { transform: translate(0px, -12px); }
              72.7272727273% { transform: translate(0px, -12px); }
              81.8181818182% { transform: translate(-12px, -12px); }
              90.9090909091% { transform: translate(-12px, 0px); }
              100%           { transform: translate(0px, 0px); }
            }
            .box5631:nth-child(4) { animation: moveBox5631-4 4s infinite; }
            @keyframes moveBox5631-5 {
              9.0909090909%  { transform: translate(0, 0); }
              18.1818181818% { transform: translate(0, 0); }
              27.2727272727% { transform: translate(0, 0); }
              36.3636363636% { transform: translate(12px, 0); }
              45.4545454545% { transform: translate(12px, 0); }
              54.5454545455% { transform: translate(12px, 0); }
              63.6363636364% { transform: translate(12px, 0); }
              72.7272727273% { transform: translate(12px, 0); }
              81.8181818182% { transform: translate(12px, -12px); }
              90.9090909091% { transform: translate(0px, -12px); }
              100%           { transform: translate(0px, 0px); }
            }
            .box5631:nth-child(5) { animation: moveBox5631-5 4s infinite; }
            @keyframes moveBox5631-6 {
              9.0909090909%  { transform: translate(0, 0); }
              18.1818181818% { transform: translate(-12px, 0); }
              27.2727272727% { transform: translate(-12px, 0); }
              36.3636363636% { transform: translate(0px, 0); }
              45.4545454545% { transform: translate(0px, 0); }
              54.5454545455% { transform: translate(0px, 0); }
              63.6363636364% { transform: translate(0px, 0); }
              72.7272727273% { transform: translate(0px, 12px); }
              81.8181818182% { transform: translate(-12px, 12px); }
              90.9090909091% { transform: translate(-12px, 0px); }
              100%           { transform: translate(0px, 0px); }
            }
            .box5631:nth-child(6) { animation: moveBox5631-6 4s infinite; }
            @keyframes moveBox5631-7 {
              9.0909090909%  { transform: translate(12px, 0); }
              18.1818181818% { transform: translate(12px, 0); }
              27.2727272727% { transform: translate(12px, 0); }
              36.3636363636% { transform: translate(0px, 0); }
              45.4545454545% { transform: translate(0px, -12px); }
              54.5454545455% { transform: translate(12px, -12px); }
              63.6363636364% { transform: translate(0px, -12px); }
              72.7272727273% { transform: translate(0px, -12px); }
              81.8181818182% { transform: translate(0px, 0px); }
              90.9090909091% { transform: translate(12px, 0px); }
              100%           { transform: translate(0px, 0px); }
            }
            .box5631:nth-child(7) { animation: moveBox5631-7 4s infinite; }
            @keyframes moveBox5631-8 {
              9.0909090909%  { transform: translate(0, 0); }
              18.1818181818% { transform: translate(-12px, 0); }
              27.2727272727% { transform: translate(-12px, -12px); }
              36.3636363636% { transform: translate(0px, -12px); }
              45.4545454545% { transform: translate(0px, -12px); }
              54.5454545455% { transform: translate(0px, -12px); }
              63.6363636364% { transform: translate(0px, -12px); }
              72.7272727273% { transform: translate(0px, -12px); }
              81.8181818182% { transform: translate(12px, -12px); }
              90.9090909091% { transform: translate(12px, 0px); }
              100%           { transform: translate(0px, 0px); }
            }
            .box5631:nth-child(8) { animation: moveBox5631-8 4s infinite; }
            @keyframes moveBox5631-9 {
              9.0909090909%  { transform: translate(-12px, 0); }
              18.1818181818% { transform: translate(-12px, 0); }
              27.2727272727% { transform: translate(0px, 0); }
              36.3636363636% { transform: translate(-12px, 0); }
              45.4545454545% { transform: translate(0px, 0); }
              54.5454545455% { transform: translate(0px, 0); }
              63.6363636364% { transform: translate(-12px, 0); }
              72.7272727273% { transform: translate(-12px, 0); }
              81.8181818182% { transform: translate(-24px, 0); }
              90.9090909091% { transform: translate(-12px, 0); }
              100%           { transform: translate(0px, 0); }
            }
            .box5631:nth-child(9) { animation: moveBox5631-9 4s infinite; }
          `}</style>
          <g>
            <circle className="box5631" cx="13" cy="1"  r="5"/>
            <circle className="box5631" cx="13" cy="1"  r="5"/>
            <circle className="box5631" cx="25" cy="25" r="5"/>
            <circle className="box5631" cx="13" cy="13" r="5"/>
            <circle className="box5631" cx="13" cy="13" r="5"/>
            <circle className="box5631" cx="25" cy="13" r="5"/>
            <circle className="box5631" cx="1"  cy="25" r="5"/>
            <circle className="box5631" cx="13" cy="25" r="5"/>
            <circle className="box5631" cx="25" cy="25" r="5"/>
          </g>
        </svg>
      </div>
      <p style={{ fontSize: 13, color: '#a08e7a', fontFamily: 'monospace' }}>
        {t('scanner.analyzing')}
      </p>
    </div>
  )
}

function buildReportText(display) {
  const phones   = display.entities.phones  ?.join(', ')  || '—'
  const domains  = display.entities.domains ?.join(', ')  || '—'
  const keywords = display.entities.keywords?.slice(0, 3).join('; ') || '—'
  return [
    `Reporte de Fraude Digital`,
    `─────────────────────────────`,
    `Tipo:    ${display.category.toUpperCase()}`,
    `Riesgo:  ${display.score}/100`,
    ``,
    `Entidades detectadas:`,
    `  Teléfonos: ${phones}`,
    `  Dominios:  ${domains}`,
    `  Tácticas:  ${keywords}`,
    ``,
    `Descripción:`,
    display.manipulationSummary || 'No disponible.',
    ``,
    `Reportar en: https://www.condusef.gob.mx`,
    `Policía Cibernética: https://www.gob.mx/policiafederal`,
  ].join('\n')
}

function CondusefModal({ display, onClose }) {
  const [copied, setCopied] = useState(false)
  const reportText = buildReportText(display)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(reportText)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // fallback: select a textarea
    }
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-md rounded border flex flex-col"
        style={{ background: '#1c1b1b', borderColor: '#262626' }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b" style={{ borderColor: '#262626' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: '#e5e2e1' }}>Reportar este fraude</p>
            <p className="text-[11px] mt-0.5" style={{ color: '#a08e7a' }}>Comparte esta información con las autoridades</p>
          </div>
          <button onClick={onClose} className="transition-colors" style={{ color: '#555' }}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Report preview */}
        <div className="px-5 py-4 flex flex-col gap-3">
          <div className="flex gap-4">
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono mb-0.5" style={{ color: '#555' }}>Tipo</p>
              <p className="text-[12px] font-mono uppercase" style={{ color: '#f59e0b' }}>{display.category}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono mb-0.5" style={{ color: '#555' }}>Riesgo</p>
              <p className="text-[12px] font-mono font-bold" style={{ color: display.score >= 80 ? '#ef4444' : '#f59e0b' }}>{display.score}/100</p>
            </div>
          </div>

          {(display.entities.phones?.length > 0 || display.entities.domains?.length > 0) && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono mb-1" style={{ color: '#555' }}>Entidades</p>
              <div className="flex flex-wrap gap-1.5">
                {display.entities.phones?.map((p) => (
                  <span key={p} className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color: '#f59e0b', background: '#f59e0b10', borderColor: '#f59e0b30' }}>{p}</span>
                ))}
                {display.entities.domains?.map((d) => (
                  <span key={d} className="text-[10px] font-mono px-1.5 py-0.5 rounded border" style={{ color: '#ef4444', background: '#ef444410', borderColor: '#ef444430' }}>{d}</span>
                ))}
              </div>
            </div>
          )}

          {display.manipulationSummary && (
            <div>
              <p className="text-[10px] uppercase tracking-widest font-mono mb-1" style={{ color: '#555' }}>Descripción</p>
              <p className="text-[11px] leading-relaxed" style={{ color: '#a08e7a' }}>{display.manipulationSummary}</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="px-5 pb-4 flex flex-col gap-3">
          <div className="flex gap-2">
            <button
              onClick={handleCopy}
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded border text-[12px] font-mono transition-colors"
              style={{ borderColor: '#f59e0b', color: copied ? '#10b981' : '#f59e0b', background: 'transparent' }}
            >
              <Copy size={12} strokeWidth={1.5} />
              {copied ? 'Copiado' : 'Copiar reporte'}
            </button>
            <a
              href="https://www.condusef.gob.mx"
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-1.5 py-2 rounded text-[12px] font-mono transition-colors"
              style={{ background: '#f59e0b', color: '#131313' }}
            >
              <ExternalLink size={12} strokeWidth={2} />
              Ir a CONDUSEF
            </a>
          </div>
          <p className="text-[10px] leading-relaxed" style={{ color: '#555' }}>
            También puedes reportar a Policía Cibernética:{' '}
            <a
              href="https://www.gob.mx/policiafederal"
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
              style={{ color: '#a08e7a' }}
            >
              gob.mx/policiafederal
            </a>
          </p>
        </div>
      </div>
    </div>
  )
}

export default function ThreatScanner() {
  const { t } = useLang()
  const [activeTab, setActiveTab] = useState('url')
  const [content, setContent]     = useState('')
  const [fileName, setFileName]   = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [state, setState]         = useState('idle')   // idle | analyzing | done
  const [logLines, setLogLines]   = useState([])
  const [result, setResult]       = useState(null)
  const [savedToDB, setSavedToDB]             = useState(false)
  const [originalContent, setOriginalContent] = useState('')
  const [showCondusef, setShowCondusef]       = useState(false)

  const fileRef    = useRef(null)
  const fileObjRef = useRef(null)

  // contentOverride lets handleDemo pass the value directly,
  // avoiding stale-closure issues with queued state updates.
  const runAnalysis = useCallback((contentOverride) => {
    const raw = typeof contentOverride === 'string' ? contentOverride : (content ?? '')
    const text = String(raw).trim()
    setOriginalContent(text)

    setState('analyzing')
    setLogLines([])
    setResult(null)

    // Start terminal animation with translated log lines
    LOG_TIMING.forEach(({ ms, key, color }) => {
      setTimeout(() => setLogLines((prev) => [...prev, { text: t(key), color }]), ms)
    })

    // Build FormData for API
    const formData = new FormData()
    if (fileObjRef.current) {
      formData.append('file', fileObjRef.current)
    } else if (activeTab === 'url') {
      formData.append('url', text)
    } else {
      formData.append('text', text)
    }

    // Race: animation vs API — show done when both finish
    const animationDone = new Promise((resolve) =>
      setTimeout(resolve, ANIMATION_DURATION)
    )
    const apiFetch = analyzeContent(formData)

    Promise.allSettled([animationDone, apiFetch]).then(([, apiResult]) => {
      const apiData = apiResult.status === 'fulfilled' ? apiResult.value : null
      console.log('[Scanner] analyzeContent returned:', apiData)

      const mapped = apiData ? mapApiResult(apiData) : null
      console.log('[Scanner] mapApiResult produced:', mapped)

      if (apiData) setSavedToDB(true)
      setResult(mapped ?? MOCK_RESULT)
      setState('done')
    })
  }, [activeTab, content, t])

  const handleDemo = () => {
    const demoContent = DEMO_CONTENT[activeTab]
    setContent(demoContent)
    fileObjRef.current = null
    runAnalysis(demoContent)
  }

  const handleFile = (file) => {
    fileObjRef.current = file
    setFileName(file.name)
    setContent(file.name)
  }

  const resetScan = () => {
    setContent('')
    setFileName(null)
    fileObjRef.current = null
    setState('idle')
    setLogLines([])
    setResult(null)
    setSavedToDB(false)
    setOriginalContent('')
    setShowCondusef(false)
  }

  const hasContent = content.trim().length > 0 || fileName
  const display = result ?? MOCK_RESULT

  return (
    <div className="flex h-full min-h-0">
      {/* Left panel */}
      <div className="flex-1 flex flex-col p-5 gap-3 min-w-0 border-r border-[#262626]">
        <div>
          <h1 className="text-sm font-semibold text-neutral-200">{t('scanner.title')}</h1>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {t('scanner.subtitle')}
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#262626] pb-0">
          {TABS.map(({ id, i18nKey, icon: Icon }) => (
            <button
              key={id}
              onClick={() => {
                setActiveTab(id)
                setContent('')
                setFileName(null)
                fileObjRef.current = null
                setState('idle')
                setLogLines([])
                setResult(null)
              }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Icon size={12} strokeWidth={2} />
              {t(i18nKey)}
            </button>
          ))}
        </div>

        {/* Input zone */}
        {state === 'idle' && (
          <div>
            {(activeTab === 'image' || activeTab === 'audio') ? (
              <div
                className={`rounded border-2 border-dashed p-8 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors ${
                  isDragging ? 'border-amber-400/50 bg-amber-400/5' : 'border-[#2a2a2a] hover:border-[#383838]'
                }`}
                onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
                onDragLeave={() => setIsDragging(false)}
                onDrop={(e) => { e.preventDefault(); setIsDragging(false); const f = e.dataTransfer.files[0]; if (f) handleFile(f) }}
                onClick={() => fileRef.current?.click()}
              >
                <input ref={fileRef} type="file" className="hidden"
                  accept={activeTab === 'image' ? 'image/*' : 'audio/*'}
                  onChange={(e) => { if (e.target.files[0]) handleFile(e.target.files[0]) }}
                />
                {fileName ? (
                  <p className="text-[12px] text-amber-400 font-mono">{fileName}</p>
                ) : (
                  <>
                    <Upload size={20} className="text-neutral-600" strokeWidth={1.5} />
                    <p className="text-[12px] text-neutral-500 text-center">
                      {activeTab === 'image' ? t('scanner.drop.image') : t('scanner.drop.audio')}<br />
                      <span className="text-neutral-600">{t('scanner.drop.browse')}</span>
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div>
                {activeTab === 'url' ? (
                  <input
                    type="text"
                    value={content ?? ''}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('scanner.placeholder.url')}
                    className="w-full bg-[#1c1b1b] border border-[#262626] rounded px-3 py-2.5 text-[12px] font-mono text-neutral-200 placeholder-neutral-600 outline-none focus:border-[#383838]"
                  />
                ) : (
                  <textarea
                    value={content ?? ''}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder={t('scanner.placeholder.text')}
                    rows={5}
                    className="w-full bg-[#1c1b1b] border border-[#262626] rounded px-3 py-2.5 text-[12px] font-mono text-neutral-200 placeholder-neutral-600 outline-none focus:border-[#383838] resize-none"
                  />
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <button
                disabled={!hasContent}
                onClick={() => runAnalysis()}
                className="flex items-center gap-1.5 bg-amber-400 text-[#131313] text-[12px] font-semibold px-4 py-2 rounded disabled:opacity-30 hover:bg-amber-300 transition-colors"
              >
                {t('scanner.analyze')} <ChevronRight size={13} />
              </button>
              <button
                onClick={handleDemo}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-2"
              >
                {t('scanner.demo')}
              </button>
            </div>
          </div>
        )}

        {/* Terminal log */}
        {(state === 'analyzing' || state === 'done') && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
                {t('scanner.log')}
              </span>
              {state === 'done' && (
                <button
                  onClick={resetScan}
                  className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  {t('scanner.newScan')}
                </button>
              )}
            </div>
            <TerminalLog lines={logLines} />
            {state === 'done' && savedToDB && (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-500">
                  <CheckCircle size={12} strokeWidth={1.5} />
                  {t('scanner.savedToDB')}
                </div>
                <button
                  onClick={() => setShowCondusef(true)}
                  className="text-[11px] font-mono px-2.5 py-1 rounded border transition-colors"
                  style={{ color: '#f59e0b', borderColor: '#f59e0b40', background: '#f59e0b08' }}
                >
                  Reportar a CONDUSEF
                </button>
              </div>
            )}
            {state === 'done' && originalContent && (
              <div className="card-base p-3">
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-2">
                  Contenido Analizado
                </p>
                <HighlightedContent text={originalContent} entities={display.entities} />
              </div>
            )}
          </div>
        )}
      </div>

      {/* Right panel — Threat Report */}
      <div className="w-[320px] shrink-0 flex flex-col p-5 gap-4 overflow-y-auto">
        {state === 'idle' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <ShieldAlert size={28} className="text-neutral-700" strokeWidth={1} />
            <p className="text-[12px] text-neutral-600">
              {t('scanner.empty1')}<br />{t('scanner.empty2')}
            </p>
          </div>
        ) : state === 'analyzing' ? (
          <AnalyzingPanel />
        ) : (
          <>
            {/* Score + category */}
            <div className="card-base p-4 flex items-center gap-4">
              <CircularScore score={display.score} />
              <div className="min-w-0 flex-1">
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-1 text-left">
                  {t('report.classification')}
                </p>
                <span className="inline-block text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded uppercase tracking-widest max-w-full truncate">
                  {display.category}
                </span>
                <p className="text-[11px] text-neutral-500 font-mono mt-2 truncate">
                  {display.similar} {t('report.similar')} · {truncateRegion(display.region) ?? 'región desconocida'}
                </p>
              </div>
            </div>

            {/* Panic block — score > 75 */}
            {display.score > 75 && (
              <div className="rounded border border-red-500/25 bg-red-500/5 p-3 flex flex-col items-center gap-2 text-center">
                <AlertOctagon size={15} className="text-red-400 shrink-0" strokeWidth={1.5} />
                <div>
                  <p className="text-[12px] font-semibold text-red-400">{t('panic.title')}</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    {t('panic.body')}<br />{t('panic.call')}
                  </p>
                </div>
              </div>
            )}

            {/* Psychological Vectors */}
            <div className="card-base p-4">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-3 text-left">
                {t('report.vectors')}
              </p>
              <div className="flex flex-col gap-3">
                {display.vectors.map((v) => <VectorBar key={v.name} {...v} />)}
              </div>
            </div>

            {/* Entities */}
            <div className="card-base p-4">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-3 text-left">
                {t('report.entities')}
              </p>
              <div className="flex flex-col gap-2 font-mono text-[11px]">
                {display.entities.phone !== '—' && (
                  <div className="flex gap-2">
                    <span className="text-neutral-600 shrink-0">{t('report.phone')}</span>
                    <span className="text-amber-400">{display.entities.phone}</span>
                  </div>
                )}
                {display.entities.domain !== '—' && (
                  <div className="flex gap-2">
                    <span className="text-neutral-600 shrink-0">{t('report.domain')}</span>
                    <span className="text-red-400 break-all">{display.entities.domain}</span>
                  </div>
                )}
                {display.entities.keywords.length > 0 && (
                  <div className="flex gap-2 flex-wrap">
                    <span className="text-neutral-600 shrink-0">{t('report.tags')}</span>
                    <div className="flex flex-wrap gap-1">
                      {display.entities.keywords.map((k) => (
                        <span key={k} className="bg-[#222] border border-[#2a2a2a] text-neutral-400 px-1.5 py-0.5 rounded text-[10px]">
                          {k}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="card-base p-4">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-3 text-left">
                {t('report.actions')}
              </p>
              <ul className="flex flex-col gap-2">
                {display.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-300">
                    <span className="text-amber-400 font-mono mt-0.5 shrink-0">{i + 1}.</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-center text-[11px] text-neutral-600 font-mono">
              {display.similar} {t('report.casesIn')} {truncateRegion(display.region) ?? 'región desconocida'}
            </p>
          </>
        )}
      </div>
    </div>

    {showCondusef && (
      <CondusefModal display={display} onClose={() => setShowCondusef(false)} />
    )}
  )
}
