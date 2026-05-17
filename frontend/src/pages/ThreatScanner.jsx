import { useState, useRef, useEffect, useCallback } from 'react'
import { ChevronRight, AlertOctagon, ShieldAlert, CheckCircle, X } from 'lucide-react'
import { analyzeContent, reportIncident } from '../lib/api'
import { useLang } from '../lib/LanguageContext'

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
    virustotal:          api.virustotal             ?? null,
  }
}

function scoreColor(s) {
  if (s >= 80) return '#ef4444'
  if (s >= 60) return '#f59e0b'
  return '#10b981'
}

const truncateRegion = (r, max = 20) =>
  r ? (r.length > max ? r.slice(0, max) + '…' : r) : null

function similarLabel(count, region) {
  if (!count) return null
  const loc = region ? `en ${truncateRegion(region)}` : 'detectados en LATAM'
  return `${count} casos similares ${loc}`
}

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

function EntityPopoverCard({ type, text, vtData, rect, onClose }) {
  const ref = useRef(null)

  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose() }
    const onDown = (e) => { if (ref.current && !ref.current.contains(e.target)) onClose() }
    document.addEventListener('keydown', onKey)
    document.addEventListener('mousedown', onDown)
    return () => {
      document.removeEventListener('keydown', onKey)
      document.removeEventListener('mousedown', onDown)
    }
  }, [onClose])

  const leftPos = Math.min(Math.max(rect.left, 8), window.innerWidth - 292)
  const posStyle = (window.innerHeight - rect.bottom) > 140
    ? { top: rect.bottom + 6 }
    : { bottom: window.innerHeight - rect.top + 6 }

  const showVT = type === 'domain' && vtData

  return (
    <div
      ref={ref}
      onClick={(e) => e.stopPropagation()}
      style={{
        position: 'fixed',
        left: leftPos,
        ...posStyle,
        zIndex: 9999,
        maxWidth: 280,
        background: '#111111',
        border: '1px solid #262626',
        borderRadius: 6,
        padding: '10px 12px',
        fontSize: 12,
        pointerEvents: 'auto',
      }}
    >
      <p style={{ color: '#f59e0b', fontWeight: 600, fontSize: 11, marginBottom: 5 }}>
        {TOOLTIP_LABEL[type]}
      </p>
      <p style={{ color: '#e5e2e1', wordBreak: 'break-all' }}>{text}</p>
      {showVT && (
        <div style={{ borderTop: '1px solid #1e1e1e', marginTop: 8, paddingTop: 8 }}>
          <p style={{ color: '#555', fontSize: 10, fontFamily: 'monospace', marginBottom: 4 }}>VirusTotal</p>
          {vtData.malicious > 0 ? (
            <p style={{ color: '#ef4444', fontFamily: 'monospace', fontSize: 11 }}>
              {vtData.malicious}/{vtData.total_engines} motores detectaron amenaza
            </p>
          ) : (
            <p style={{ color: '#10b981', fontFamily: 'monospace', fontSize: 11 }}>Sin detecciones</p>
          )}
          {vtData.suspicious > 0 && (
            <p style={{ color: '#f59e0b', fontFamily: 'monospace', fontSize: 10, marginTop: 2 }}>
              {vtData.suspicious} sospechoso{vtData.suspicious !== 1 ? 's' : ''}
            </p>
          )}
        </div>
      )}
    </div>
  )
}

function HighlightedContent({ text, entities, vtData }) {
  const [openSeg, setOpenSeg] = useState(null)
  const segs = parseHighlights(text, entities)

  return (
    <p className="text-[12px] text-neutral-300 font-mono leading-relaxed break-words whitespace-pre-wrap">
      {segs.map((seg, i) =>
        seg.type ? (
          <span
            key={i}
            className="inline cursor-pointer"
            style={HIGHLIGHT_STYLE[seg.type]}
            onClick={(e) => {
              e.stopPropagation()
              const r = e.currentTarget.getBoundingClientRect()
              setOpenSeg(openSeg?.index === i ? null : { index: i, rect: r, type: seg.type, text: seg.text })
            }}
          >
            {seg.text}
            {openSeg?.index === i && (
              <EntityPopoverCard
                type={openSeg.type}
                text={openSeg.text}
                vtData={vtData}
                rect={openSeg.rect}
                onClose={() => setOpenSeg(null)}
              />
            )}
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

function ReportModal({ display, incidentId, onClose }) {
  const shortId = incidentId ? `INC-${incidentId.slice(0, 4).toUpperCase()}` : '—'

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
          <div className="flex items-center gap-2">
            <CheckCircle size={16} strokeWidth={1.5} style={{ color: '#10b981' }} />
            <p className="text-sm font-semibold" style={{ color: '#e5e2e1' }}>Amenaza reportada</p>
          </div>
          <button onClick={onClose} className="transition-colors" style={{ color: '#555' }}>
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {/* Body */}
        <div className="px-5 py-4 flex flex-col gap-4">
          <p className="text-[12px] leading-relaxed" style={{ color: '#a08e7a' }}>
            Este caso quedó registrado en nuestra base de datos de inteligencia colectiva. Tu reporte
            ayuda a proteger a otros usuarios en LATAM.
          </p>

          {/* Incident details */}
          <div className="rounded border p-3 flex flex-col gap-2.5" style={{ background: '#0e0e0e', borderColor: '#262626' }}>
            <div className="flex items-start gap-5">
              <div>
                <p className="text-[10px] uppercase tracking-widest font-mono mb-0.5" style={{ color: '#555' }}>ID</p>
                <p className="text-[12px] font-mono" style={{ color: '#e5e2e1' }}>{shortId}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-mono mb-0.5" style={{ color: '#555' }}>Tipo</p>
                <p className="text-[12px] font-mono uppercase" style={{ color: '#f59e0b' }}>{display.category}</p>
              </div>
              <div>
                <p className="text-[10px] uppercase tracking-widest font-mono mb-0.5" style={{ color: '#555' }}>Riesgo</p>
                <p className="text-[12px] font-mono font-bold" style={{ color: display.score >= 80 ? '#ef4444' : '#f59e0b' }}>
                  {display.score}/100
                </p>
              </div>
            </div>
            {display.region && (
              <div>
                <p className="text-[10px] uppercase tracking-widest font-mono mb-0.5" style={{ color: '#555' }}>Región</p>
                <p className="text-[12px] font-mono" style={{ color: '#a08e7a' }}>{display.region}</p>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 pb-5 flex flex-col gap-3">
          <button
            onClick={onClose}
            className="w-full flex items-center justify-center py-2 rounded text-[12px] font-semibold transition-colors"
            style={{ background: '#f59e0b', color: '#131313' }}
          >
            Cerrar
          </button>
          <p className="text-[10px] leading-relaxed" style={{ color: '#555' }}>
            Si perdiste dinero, también puedes llamar a Policía Cibernética: 55 5242-5100 ext. 5086
          </p>
        </div>
      </div>
    </div>
  )
}

const _emptyPersist = () => ({
  imageFile:       null,
  audioFile:       null,
  text:            '',
  url:             '',
  state:           'idle',
  logLines:        [],
  result:          null,
  savedToDB:       false,
  incidentId:      null,
  reported:        false,
  originalContent: '',
  analysisError:   null,
})
let _persist = _emptyPersist()

export default function ThreatScanner() {
  const { t } = useLang()
  const [imageFile, setImageFile]             = useState(() => _persist.imageFile)
  const [audioFile, setAudioFile]             = useState(() => _persist.audioFile)
  const [text, setText]                       = useState(() => _persist.text)
  const [url, setUrl]                         = useState(() => _persist.url)
  const [isDragging, setIsDragging]           = useState(false)
  const [state, setState]                     = useState(() => _persist.state)
  const [logLines, setLogLines]               = useState(() => _persist.logLines)
  const [result, setResult]                   = useState(() => _persist.result)
  const [savedToDB, setSavedToDB]             = useState(() => _persist.savedToDB)
  const [incidentId, setIncidentId]           = useState(() => _persist.incidentId)
  const [reported, setReported]               = useState(() => _persist.reported)
  const [showReport, setShowReport]           = useState(false)
  const [originalContent, setOriginalContent] = useState(() => _persist.originalContent)
  const [analysisError, setAnalysisError]     = useState(() => _persist.analysisError)
  const [imagePreviewUrl, setImagePreviewUrl] = useState(null)
  const [audioPreviewUrl, setAudioPreviewUrl] = useState(null)
  const [imageExpanded, setImageExpanded]     = useState(false)
  const [lightboxOpen, setLightboxOpen]       = useState(false)
  const [zoomed, setZoomed]                   = useState(false)

  const fileInputRef   = useRef(null)
  const previewUrlsRef = useRef([])

  useEffect(() => {
    _persist.imageFile       = imageFile
    _persist.audioFile       = audioFile
    _persist.text            = text
    _persist.url             = url
    _persist.state           = state
    _persist.logLines        = logLines
    _persist.result          = result
    _persist.savedToDB       = savedToDB
    _persist.incidentId      = incidentId
    _persist.reported        = reported
    _persist.originalContent = originalContent
    _persist.analysisError   = analysisError
  })

  useEffect(() => {
    if (!imageFile) { setImagePreviewUrl(null); return }
    const objUrl = URL.createObjectURL(imageFile)
    previewUrlsRef.current.push(objUrl)
    setImagePreviewUrl(objUrl)
    return () => {
      URL.revokeObjectURL(objUrl)
      previewUrlsRef.current = previewUrlsRef.current.filter((u) => u !== objUrl)
    }
  }, [imageFile])

  useEffect(() => {
    if (!audioFile) { setAudioPreviewUrl(null); return }
    const objUrl = URL.createObjectURL(audioFile)
    previewUrlsRef.current.push(objUrl)
    setAudioPreviewUrl(objUrl)
    return () => {
      URL.revokeObjectURL(objUrl)
      previewUrlsRef.current = previewUrlsRef.current.filter((u) => u !== objUrl)
    }
  }, [audioFile])

  const handleFileChange = (file) => {
    if (!file) return
    const ct = file.type || ''
    if (ct.startsWith('image/'))      setImageFile(file)
    else if (ct.startsWith('audio/')) setAudioFile(file)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    Array.from(e.dataTransfer.files).forEach(handleFileChange)
  }

  const runAnalysis = useCallback(() => {
    // originalContent will be overridden with real OCR text once the API returns
    setOriginalContent(text.trim() || url.trim() || '')

    setState('analyzing')
    setLogLines([])
    setResult(null)

    LOG_TIMING.forEach(({ ms, key, color }) => {
      setTimeout(() => setLogLines((prev) => [...prev, { text: t(key), color }]), ms)
    })

    const formData = new FormData()
    if (imageFile)    formData.append('file',  imageFile)
    if (audioFile)    formData.append('audio', audioFile)
    if (text.trim())  formData.append('text',  text.trim())
    if (url.trim())   formData.append('url',   url.trim())

    // Debug: verify FormData contents before sending
    for (const [key, value] of formData.entries()) {
      console.log('[Scanner] FormData entry:', key, value)
    }
    console.log('[Scanner] imageFile state:', imageFile)

    const animationDone = new Promise((resolve) => setTimeout(resolve, ANIMATION_DURATION))
    Promise.allSettled([animationDone, analyzeContent(formData)]).then(([, apiResult]) => {
      const raw = apiResult.status === 'fulfilled' ? apiResult.value : { _apiError: 'Error inesperado' }
      if (raw?._apiError) {
        const msg = raw._apiError
        let friendly
        if (/transcri|audio/i.test(msg))
          friendly = 'No se pudo transcribir el audio. Verifica que el archivo sea MP3, WAV o M4A.'
        else if (/connect|conexi[oó]n|network|fetch/i.test(msg))
          friendly = 'No hay conexión con el servidor. Verifica que el backend esté corriendo.'
        else
          friendly = `Error al analizar: ${msg}`
        setAnalysisError(friendly)
        setResult(null)
        setState('done')
        return
      }
      if (raw) {
        setSavedToDB(true)
        setIncidentId(raw.incident_id ?? null)
        if (raw.analyzed_content) setOriginalContent(raw.analyzed_content)
      }
      setResult(mapApiResult(raw))
      setAnalysisError(null)
      setState('done')
    })
  }, [imageFile, audioFile, text, url, t])

  const resetScan = () => {
    _persist = _emptyPersist()
    setImageFile(null)
    setAudioFile(null)
    setText('')
    setUrl('')
    setState('idle')
    setLogLines([])
    setResult(null)
    setSavedToDB(false)
    setIncidentId(null)
    setReported(false)
    setShowReport(false)
    setOriginalContent('')
    setAnalysisError(null)
    setImageExpanded(false)
    setLightboxOpen(false)
    setZoomed(false)
  }

  const handleReport = () => {
    setReported(true)
    setShowReport(true)
    if (incidentId) reportIncident(incidentId)
  }

  const hasContent = text.trim() || url.trim() || imageFile || audioFile
  const display = result

  return (
    <>
    <div className="flex h-full min-h-0">
      {/* Left panel */}
      <div className="flex-1 flex flex-col p-5 gap-3 min-w-0 border-r border-[#262626]">
        <div>
          <h1 className="text-sm font-semibold text-neutral-200">{t('scanner.title')}</h1>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            {t('scanner.subtitle')}
          </p>
        </div>

        {/* Unified input zone */}
        {state === 'idle' && (
          <div className="flex flex-col gap-3">
            {/* Drop zone */}
            <div
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className="rounded flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
              style={{
                border: `1px dashed ${isDragging ? '#f59e0b80' : '#262626'}`,
                background: isDragging ? '#f59e0b08' : '#0e0e0e',
                minHeight: 140,
                padding: '20px 16px',
              }}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="hidden"
                accept="image/*,audio/*"
                multiple
                onChange={(e) => Array.from(e.target.files).forEach(handleFileChange)}
              />
              <ShieldAlert size={20} strokeWidth={1.5} style={{ color: isDragging ? '#f59e0b' : '#444' }} />
              <div className="text-center select-none">
                <p className="text-[12px] font-mono" style={{ color: '#666' }}>Arrastra imagen o audio aquí</p>
                <p className="text-[11px] font-mono mt-0.5" style={{ color: '#444' }}>o usa las opciones abajo</p>
              </div>
            </div>

            {/* File pills */}
            {(imageFile || audioFile) && (
              <div className="flex flex-wrap gap-1.5">
                {imageFile && (
                  <div
                    className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded border"
                    style={{ color: '#f59e0b', borderColor: '#f59e0b30', background: '#f59e0b0a' }}
                  >
                    <span className="max-w-[140px] truncate">{imageFile.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setImageFile(null) }}
                      className="shrink-0 transition-colors hover:text-red-400"
                    >
                      <X size={10} strokeWidth={2} />
                    </button>
                  </div>
                )}
                {audioFile && (
                  <div
                    className="flex items-center gap-1.5 text-[11px] font-mono px-2 py-1 rounded border"
                    style={{ color: '#a78bfa', borderColor: '#a78bfa30', background: '#a78bfa0a' }}
                  >
                    <span className="max-w-[140px] truncate">{audioFile.name}</span>
                    <button
                      onClick={(e) => { e.stopPropagation(); setAudioFile(null) }}
                      className="shrink-0 transition-colors hover:text-red-400"
                    >
                      <X size={10} strokeWidth={2} />
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Image preview — collapsible, appears immediately after upload */}
            {imagePreviewUrl && (
              <div className="rounded border overflow-hidden" style={{ borderColor: '#262626', background: '#0a0a0a' }}>
                <button
                  onClick={() => setImageExpanded((e) => !e)}
                  className="w-full flex items-center justify-between px-3 py-2 text-[11px] font-mono transition-colors"
                  style={{ color: '#a08e7a' }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = '#131313' }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}
                >
                  <span>Ver imagen adjunta</span>
                  <span style={{ fontSize: 9 }}>{imageExpanded ? '▲' : '▼'}</span>
                </button>
                <div className="border-t border-[#1a1a1a]" style={{ background: '#080808' }}>
                  {imageExpanded ? (
                    <div className="flex items-center justify-center p-2">
                      <img
                        src={imagePreviewUrl}
                        alt="Imagen adjunta"
                        onClick={() => setLightboxOpen(true)}
                        style={{ maxWidth: '100%', maxHeight: 400, objectFit: 'contain', cursor: 'zoom-in' }}
                      />
                    </div>
                  ) : (
                    <div className="flex items-center gap-3 p-2">
                      <img
                        src={imagePreviewUrl}
                        alt="Thumbnail"
                        onClick={() => setLightboxOpen(true)}
                        style={{ width: 60, height: 60, objectFit: 'cover', borderRadius: 3, cursor: 'zoom-in', flexShrink: 0 }}
                      />
                      <span className="text-[11px] font-mono truncate" style={{ color: '#555' }}>
                        {imageFile?.name}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Audio player — appears immediately after upload */}
            {audioPreviewUrl && (
              <div className="rounded border p-3" style={{ borderColor: '#262626', background: '#0a0a0a' }}>
                <p className="text-[10px] uppercase tracking-widest font-mono mb-2" style={{ color: '#555' }}>
                  Audio adjunto
                </p>
                <audio controls style={{ width: '100%', filter: 'invert(1) hue-rotate(180deg)' }}>
                  <source src={audioPreviewUrl} />
                </audio>
              </div>
            )}

            {/* Textarea */}
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Pega el mensaje sospechoso..."
              className="w-full rounded px-3 py-2.5 text-[12px] font-mono text-neutral-200 placeholder-neutral-600 outline-none focus:border-[#383838]"
              style={{ height: 100, background: '#0a0a0a', border: '1px solid #262626', resize: 'vertical' }}
            />

            {/* URL input */}
            <input
              type="text"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              placeholder="https://enlace-sospechoso..."
              className="w-full rounded px-3 py-2.5 text-[12px] font-mono text-neutral-200 placeholder-neutral-600 outline-none focus:border-[#383838]"
              style={{ background: '#0a0a0a', border: '1px solid #262626' }}
            />

            {/* Action bar */}
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 flex-wrap">
                {imageFile && (
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{ background: '#f59e0b20', color: '#f59e0b' }}
                  >
                    imagen adjunta
                  </span>
                )}
                {audioFile && (
                  <span
                    className="text-[10px] font-mono px-2 py-0.5 rounded"
                    style={{ background: '#a78bfa20', color: '#a78bfa' }}
                  >
                    audio adjunto
                  </span>
                )}
              </div>
              <button
                disabled={!hasContent}
                onClick={runAnalysis}
                className="flex items-center gap-1.5 text-[12px] font-semibold px-4 py-2 rounded disabled:opacity-30 transition-colors shrink-0"
                style={{ background: '#f59e0b', color: '#131313' }}
              >
                Analizar todo <ChevronRight size={13} />
              </button>
            </div>
          </div>
        )}

        {/* Terminal log */}
        {(state === 'analyzing' || state === 'done') && (
          <div className="flex flex-col gap-2 border-t border-[#1e1e1e] pt-3">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
                {t('scanner.log')}
              </span>
              {state === 'done' && (
                <button
                  onClick={resetScan}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#ffc174'; e.currentTarget.style.color = '#ffc174' }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#262626'; e.currentTarget.style.color = '#a08e7a' }}
                  className="text-[10px] font-mono rounded transition-colors"
                  style={{ border: '1px solid #262626', color: '#a08e7a', padding: '6px 12px', borderRadius: 4 }}
                >
                  {t('scanner.newScan')}
                </button>
              )}
            </div>
            <TerminalLog lines={logLines} />
            {state === 'done' && savedToDB && (
              <div className="flex items-center justify-between gap-3">
                <div className="flex items-center gap-1.5 text-[11px] font-mono text-emerald-500 shrink-0">
                  <CheckCircle size={12} strokeWidth={1.5} />
                  {t('scanner.savedToDB')}
                </div>
                {reported ? (
                  <div className="flex items-center gap-1.5 text-[11px] font-mono" style={{ color: '#10b981' }}>
                    <CheckCircle size={12} strokeWidth={1.5} />
                    Reportado a la inteligencia colectiva
                  </div>
                ) : (
                  <button
                    onClick={handleReport}
                    className="text-[11px] font-mono px-2.5 py-1 rounded border transition-colors shrink-0"
                    style={{ color: '#f59e0b', borderColor: '#f59e0b40', background: '#f59e0b08' }}
                  >
                    Reportar amenaza
                  </button>
                )}
              </div>
            )}
            {state === 'done' && originalContent && (
              <div className="card-base p-3">
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-2">
                  Contenido Analizado
                </p>
                <HighlightedContent text={originalContent} entities={display?.entities ?? {}} vtData={display?.virustotal ?? null} />
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
        ) : !display ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3 px-4">
            <AlertOctagon size={24} strokeWidth={1.5} style={{ color: '#ef4444' }} />
            <p className="text-[12px] font-mono leading-relaxed" style={{ color: '#a08e7a' }}>
              {analysisError || 'Error al analizar. Verifica que el backend esté corriendo e intenta de nuevo.'}
            </p>
            <button
              onClick={resetScan}
              className="text-[11px] font-mono px-3 py-1.5 rounded border transition-colors"
              style={{ color: '#f59e0b', borderColor: '#f59e0b40', background: '#f59e0b08' }}
            >
              Intentar de nuevo
            </button>
          </div>
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
                {similarLabel(display.similar, display.region) && (
                  <p className="text-[11px] text-neutral-500 font-mono mt-2 truncate">
                    {similarLabel(display.similar, display.region)}
                  </p>
                )}
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

            {/* VirusTotal external verification */}
            {display.virustotal && (
              <div className="card-base p-4">
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-3 text-left">
                  Verificación Externa
                </p>
                <div className="flex flex-col gap-1.5">
                  {display.virustotal.malicious > 0 ? (
                    <p className="text-[13px] font-mono font-semibold" style={{ color: '#ef4444' }}>
                      {display.virustotal.malicious}/{display.virustotal.total_engines} motores detectaron amenaza
                    </p>
                  ) : (
                    <p className="text-[13px] font-mono font-semibold" style={{ color: '#10b981' }}>
                      Sin detecciones conocidas
                    </p>
                  )}
                  {display.virustotal.suspicious > 0 && (
                    <p className="text-[11px] font-mono" style={{ color: '#f59e0b' }}>
                      {display.virustotal.suspicious} motor{display.virustotal.suspicious !== 1 ? 'es' : ''} sospechoso{display.virustotal.suspicious !== 1 ? 's' : ''}
                    </p>
                  )}
                </div>
                <p className="text-[9px] font-mono mt-3" style={{ color: '#444' }}>
                  Powered by VirusTotal
                </p>
              </div>
            )}

            {similarLabel(display.similar, display.region) && (
              <p className="text-center text-[11px] text-neutral-600 font-mono">
                {similarLabel(display.similar, display.region)}
              </p>
            )}
          </>
        )}
      </div>
    </div>

    {showReport && display && (
      <ReportModal display={display} incidentId={incidentId} onClose={() => setShowReport(false)} />
    )}

    {lightboxOpen && imagePreviewUrl && (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center"
        style={{ background: 'rgba(0,0,0,0.92)' }}
        onClick={() => { setLightboxOpen(false); setZoomed(false) }}
      >
        <img
          src={imagePreviewUrl}
          alt="Vista completa"
          onClick={(e) => { e.stopPropagation(); setZoomed((z) => !z) }}
          style={{
            maxWidth:        '90vw',
            maxHeight:       '90vh',
            objectFit:       'contain',
            cursor:          zoomed ? 'zoom-out' : 'zoom-in',
            transform:       zoomed ? 'scale(2)' : 'scale(1)',
            transformOrigin: 'center',
            transition:      'transform 0.25s ease',
          }}
        />
        <button
          onClick={() => { setLightboxOpen(false); setZoomed(false) }}
          className="absolute top-4 right-5 transition-colors"
          style={{ color: '#666', fontSize: 22, lineHeight: 1 }}
          onMouseEnter={(e) => { e.currentTarget.style.color = '#e5e2e1' }}
          onMouseLeave={(e) => { e.currentTarget.style.color = '#666' }}
        >
          ✕
        </button>
      </div>
    )}
    </>
  )
}
