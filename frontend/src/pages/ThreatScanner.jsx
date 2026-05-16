import { useState, useRef, useEffect, useCallback } from 'react'
import { Upload, Link, FileText, Mic, ChevronRight, AlertOctagon, ShieldAlert } from 'lucide-react'

const TABS = [
  { id: 'image', label: 'Image',  icon: Upload   },
  { id: 'url',   label: 'URL',    icon: Link     },
  { id: 'text',  label: 'Text',   icon: FileText },
  { id: 'audio', label: 'Audio',  icon: Mic      },
]

const LOG_LINES = [
  { t: 0,    text: '» Initializing analysis pipeline...',                      color: 'neutral' },
  { t: 400,  text: '» Extracting content features...',                         color: 'neutral' },
  { t: 800,  text: '» Running Mistral OCR scan...',                            color: 'neutral' },
  { t: 1300, text: '» Classifying threat vectors [urgency / authority / coercion]...', color: 'neutral' },
  { t: 1900, text: '» Computing semantic embedding (1024-dim)...',              color: 'neutral' },
  { t: 2400, text: '» Querying pgvector similarity index...',                  color: 'neutral' },
  { t: 2900, text: '  ✓ 34 similar incidents found — Chihuahua region.',       color: 'amber'   },
  { t: 3300, text: '» Computing final risk score...',                          color: 'neutral' },
  { t: 3700, text: '  ✓ Analysis complete. Risk: HIGH (88/100)',                color: 'red'     },
]

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
    { name: 'Authority Impersonation', value: 91 },
    { name: 'Urgency',                 value: 82 },
    { name: 'Coercion',                value: 65 },
  ],
  entities: {
    phone:    '+52 614-822-5511',
    domain:   'bbva-verificacion-cuenta.mx',
    keywords: ['urgente', 'bloqueada', 'transferencia', 'fondos'],
  },
  actions: [
    'No hagas clic en ningún enlace del mensaje',
    'Llama directamente a BBVA: 800 226 2663',
    'Reporta en condusef.gob.mx / CERT-MX',
    'Bloquea el número remitente',
  ],
  similar: 34,
  region:   'Chihuahua',
}

function scoreColor(s) {
  if (s >= 80) return '#ef4444'
  if (s >= 60) return '#f59e0b'
  return '#10b981'
}

function CircularScore({ score }) {
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
        <span className="text-[9px] text-neutral-500 uppercase tracking-widest mt-0.5">risk</span>
      </div>
    </div>
  )
}

function VectorBar({ name, value }) {
  const color = value >= 80 ? '#ef4444' : value >= 60 ? '#f59e0b' : '#6b7280'
  return (
    <div>
      <div className="flex items-center justify-between mb-1">
        <span className="text-[11px] text-neutral-400">{name}</span>
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
      {lines.length > 0 && lines.length < LOG_LINES.length && (
        <span className="text-neutral-600 animate-pulse">▌</span>
      )}
      <div ref={endRef} />
    </div>
  )
}

export default function ThreatScanner() {
  const [activeTab, setActiveTab] = useState('url')
  const [content, setContent]   = useState('')
  const [fileName, setFileName] = useState(null)
  const [isDragging, setIsDragging] = useState(false)
  const [state, setState] = useState('idle')   // idle | analyzing | done
  const [logLines, setLogLines] = useState([])
  const fileRef = useRef(null)

  const runAnalysis = useCallback(() => {
    setState('analyzing')
    setLogLines([])
    LOG_LINES.forEach(({ t, text, color }) => {
      setTimeout(() => {
        setLogLines((prev) => [...prev, { text, color }])
      }, t)
    })
    setTimeout(() => setState('done'), LOG_LINES.at(-1).t + 400)
  }, [])

  const handleDemo = () => {
    setContent(DEMO_CONTENT[activeTab])
    setTimeout(runAnalysis, 200)
  }

  const handleFile = (file) => {
    setFileName(file.name)
    setContent(file.name)
  }

  const hasContent = content.trim().length > 0 || fileName

  return (
    <div className="flex h-full min-h-0">
      {/* Left panel */}
      <div className="flex-1 flex flex-col p-5 gap-3 min-w-0 border-r border-[#262626]">
        <div>
          <h1 className="text-sm font-semibold text-neutral-200">Threat Scanner</h1>
          <p className="text-[11px] text-neutral-500 mt-0.5">
            Analyze URLs, screenshots, emails, and audio for phishing indicators
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 border-b border-[#262626] pb-0">
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              onClick={() => { setActiveTab(id); setContent(''); setFileName(null); setState('idle'); setLogLines([]) }}
              className={`flex items-center gap-1.5 px-3 py-2 text-[11px] font-medium border-b-2 transition-colors -mb-px ${
                activeTab === id
                  ? 'border-amber-400 text-amber-400'
                  : 'border-transparent text-neutral-500 hover:text-neutral-300'
              }`}
            >
              <Icon size={12} strokeWidth={2} />
              {label}
            </button>
          ))}
        </div>

        {/* Input zone — hidden when analyzing/done */}
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
                      Drop {activeTab === 'image' ? 'screenshot or image' : 'audio file'} here<br />
                      <span className="text-neutral-600">or click to browse</span>
                    </p>
                  </>
                )}
              </div>
            ) : (
              <div>
                {activeTab === 'url' ? (
                  <input
                    type="text"
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="https://suspicious-link.mx/..."
                    className="w-full bg-[#1c1b1b] border border-[#262626] rounded px-3 py-2.5 text-[12px] font-mono text-neutral-200 placeholder-neutral-600 outline-none focus:border-[#383838]"
                  />
                ) : (
                  <textarea
                    value={content}
                    onChange={(e) => setContent(e.target.value)}
                    placeholder="Paste suspicious message, email body, or SMS..."
                    rows={5}
                    className="w-full bg-[#1c1b1b] border border-[#262626] rounded px-3 py-2.5 text-[12px] font-mono text-neutral-200 placeholder-neutral-600 outline-none focus:border-[#383838] resize-none"
                  />
                )}
              </div>
            )}

            <div className="flex items-center gap-2 mt-3">
              <button
                disabled={!hasContent}
                onClick={runAnalysis}
                className="flex items-center gap-1.5 bg-amber-400 text-[#131313] text-[12px] font-semibold px-4 py-2 rounded disabled:opacity-30 hover:bg-amber-300 transition-colors"
              >
                Analyze <ChevronRight size={13} />
              </button>
              <button
                onClick={handleDemo}
                className="text-[11px] text-neutral-500 hover:text-neutral-300 transition-colors px-2 py-2"
              >
                Try demo →
              </button>
            </div>
          </div>
        )}

        {/* Terminal log */}
        {(state === 'analyzing' || state === 'done') && (
          <div className="flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono">
                Analysis Log
              </span>
              {state === 'done' && (
                <button
                  onClick={() => { setContent(''); setFileName(null); setState('idle'); setLogLines([]) }}
                  className="text-[10px] text-neutral-600 hover:text-neutral-400 transition-colors"
                >
                  ← New scan
                </button>
              )}
            </div>
            <TerminalLog lines={logLines} />
          </div>
        )}
      </div>

      {/* Right panel — Threat Report */}
      <div className="w-[320px] shrink-0 flex flex-col p-5 gap-4 overflow-y-auto">
        {state !== 'done' ? (
          <div className="flex flex-col items-center justify-center h-full text-center gap-3">
            <ShieldAlert size={28} className="text-neutral-700" strokeWidth={1} />
            <p className="text-[12px] text-neutral-600">
              Submit content to generate<br />threat assessment
            </p>
          </div>
        ) : (
          <>
            {/* Score + category */}
            <div className="card-base p-4 flex items-center gap-4">
              <CircularScore score={MOCK_RESULT.score} />
              <div>
                <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-1">
                  Classification
                </p>
                <span className="text-[11px] font-semibold text-red-400 bg-red-500/10 border border-red-500/20 px-2 py-0.5 rounded uppercase tracking-widest">
                  {MOCK_RESULT.category}
                </span>
                <p className="text-[11px] text-neutral-500 font-mono mt-2">
                  {MOCK_RESULT.similar} similar · {MOCK_RESULT.region}
                </p>
              </div>
            </div>

            {/* Panic block — score > 75 */}
            {MOCK_RESULT.score > 75 && (
              <div className="rounded border border-red-500/25 bg-red-500/5 p-3 flex gap-2.5">
                <AlertOctagon size={15} className="text-red-400 shrink-0 mt-0.5" strokeWidth={1.5} />
                <div>
                  <p className="text-[12px] font-semibold text-red-400">Pausa.</p>
                  <p className="text-[11px] text-neutral-400 mt-0.5 leading-relaxed">
                    No transfieras dinero. No compartas contraseñas.<br />
                    Llama directamente a tu banco.
                  </p>
                </div>
              </div>
            )}

            {/* Psychological Vectors */}
            <div className="card-base p-4">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-3">
                Psychological Vectors
              </p>
              <div className="flex flex-col gap-3">
                {MOCK_RESULT.vectors.map((v) => <VectorBar key={v.name} {...v} />)}
              </div>
            </div>

            {/* Entities */}
            <div className="card-base p-4">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-3">
                Entities Extracted
              </p>
              <div className="flex flex-col gap-2 font-mono text-[11px]">
                <div className="flex gap-2">
                  <span className="text-neutral-600 shrink-0">phone</span>
                  <span className="text-amber-400">{MOCK_RESULT.entities.phone}</span>
                </div>
                <div className="flex gap-2">
                  <span className="text-neutral-600 shrink-0">domain</span>
                  <span className="text-red-400 break-all">{MOCK_RESULT.entities.domain}</span>
                </div>
                <div className="flex gap-2 flex-wrap">
                  <span className="text-neutral-600 shrink-0">tags</span>
                  <div className="flex flex-wrap gap-1">
                    {MOCK_RESULT.entities.keywords.map((k) => (
                      <span key={k} className="bg-[#222] border border-[#2a2a2a] text-neutral-400 px-1.5 py-0.5 rounded text-[10px]">
                        {k}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            {/* Recommended Actions */}
            <div className="card-base p-4">
              <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-mono mb-3">
                Recommended Actions
              </p>
              <ul className="flex flex-col gap-2">
                {MOCK_RESULT.actions.map((a, i) => (
                  <li key={i} className="flex items-start gap-2 text-[11px] text-neutral-300">
                    <span className="text-amber-400 font-mono mt-0.5 shrink-0">{i + 1}.</span>
                    {a}
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-center text-[11px] text-neutral-600 font-mono">
              {MOCK_RESULT.similar} casos similares detectados en {MOCK_RESULT.region}
            </p>
          </>
        )}
      </div>
    </div>
  )
}
