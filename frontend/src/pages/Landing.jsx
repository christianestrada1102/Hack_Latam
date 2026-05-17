import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import * as THREE from 'three'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Globe from 'globe.gl'
import { getStats, getFeed } from '../lib/api'

gsap.registerPlugin(ScrollTrigger)

// ─── Constants ────────────────────────────────────────────────────────────────

const GEO = {
  'Chihuahua':     [28.6353, -106.0889],
  'Ciudad Juárez': [31.6904, -106.4245],
  'Juárez':        [31.6904, -106.4245],
  'CDMX':          [19.4326,  -99.1332],
  'México':        [19.4326,  -99.1332],
  'Mexico':        [19.4326,  -99.1332],
  'Monterrey':     [25.6866, -100.3161],
  'Guadalajara':   [20.6597, -103.3496],
  'Bogotá':        [ 4.7110,  -74.0721],
  'Lima':          [-12.0464, -77.0428],
  'Buenos Aires':  [-34.6037, -58.3816],
  'São Paulo':     [-23.5505, -46.6333],
}

const EXAMPLES = [
  { score: 95, category: 'VISHING',  urgency: 91, authority: 88, coercion: 82,
    summary: 'Suplantación ejecutivo BBVA',   region: 'Monterrey, México' },
  { score: 88, category: 'PHISHING', urgency: 85, authority: 72, coercion: 65,
    summary: 'Dominio: bbva-verificacion.mx', region: 'CDMX, México' },
  { score: 78, category: 'SMISHING', urgency: 78, authority: 60, coercion: 55,
    summary: '"Tu cuenta está bloqueada"',    region: 'Guadalajara, México' },
]

const STEPS = [
  { num: '01', title: 'Analiza', desc: 'Envía un mensaje sospechoso, captura de pantalla, URL o llamada de audio. El pipeline extrae texto con OCR y transcripción Whisper.' },
  { num: '02', title: 'Detecta', desc: 'Modelos de IA identifican vectores de manipulación psicológica: urgencia artificial, suplantación de autoridad y coerción.' },
  { num: '03', title: 'Protege', desc: 'Recibe acciones concretas y un score de riesgo. Tu caso alimenta la inteligencia colectiva que protege a toda LATAM.' },
]

const SCAN_CARDS = [
  { icon: '🖼️', title: 'Imagen / Screenshot', back: 'OCR con Mistral AI extrae texto visible y analiza capturas de mensajes, sitios o comprobantes.', to: '/app/scanner' },
  { icon: '💬', title: 'Texto / Mensaje',      back: 'Análisis psicológico detecta urgencia artificial, suplantación de autoridad y coerción en tiempo real.', to: '/app/scanner' },
  { icon: '🔗', title: 'URL / Enlace',          back: 'Verificado con VirusTotal + análisis del contenido de página en vivo. Detecta dominios maliciosos.', to: '/app/scanner' },
  { icon: '🎧', title: 'Audio / Llamada',       back: 'Transcripción con Whisper + detección de presión emocional en mensajes de voz y llamadas.', to: '/app/scanner' },
]

// ─── Helpers ─────────────────────────────────────────────────────────────────

function geocode(region) {
  if (!region) return null
  for (const [key, coords] of Object.entries(GEO)) {
    if (region.includes(key)) return coords
  }
  return null
}

function scoreColor(s) {
  if (s >= 80) return '#ef4444'
  if (s >= 60) return '#f59e0b'
  return '#10b981'
}

// ─── Hero Particles (Three.js) ────────────────────────────────────────────────

function HeroParticles() {
  const mountRef = useRef(null)

  useEffect(() => {
    const el = mountRef.current
    if (!el) return
    const W = el.clientWidth || window.innerWidth
    const H = el.clientHeight || window.innerHeight

    const scene    = new THREE.Scene()
    const camera   = new THREE.PerspectiveCamera(60, W / H, 0.1, 1000)
    camera.position.z = 5

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(W, H)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    renderer.setClearColor(0x000000, 0)
    el.appendChild(renderer.domElement)

    const COUNT = 80
    const pos   = new Float32Array(COUNT * 3)
    const vel   = []
    for (let i = 0; i < COUNT; i++) {
      pos[i * 3]     = (Math.random() - 0.5) * 14
      pos[i * 3 + 1] = (Math.random() - 0.5) * 9
      pos[i * 3 + 2] = (Math.random() - 0.5) * 3
      vel.push({ x: (Math.random() - 0.5) * 0.004, y: (Math.random() - 0.5) * 0.004 })
    }
    const ptGeom = new THREE.BufferGeometry()
    ptGeom.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    const ptMat  = new THREE.PointsMaterial({ color: 0xffc174, size: 0.07, transparent: true, opacity: 0.5 })
    scene.add(new THREE.Points(ptGeom, ptMat))

    const linePos  = new Float32Array(COUNT * COUNT * 6)
    const lineGeom = new THREE.BufferGeometry()
    lineGeom.setAttribute('position', new THREE.BufferAttribute(linePos, 3))
    const lineMat  = new THREE.LineBasicMaterial({ color: 0xffc174, transparent: true, opacity: 0.12 })
    scene.add(new THREE.LineSegments(lineGeom, lineMat))

    let raf
    const DIST = 3.0
    const tick = () => {
      raf = requestAnimationFrame(tick)
      for (let i = 0; i < COUNT; i++) {
        pos[i * 3]     = ((pos[i * 3]     + vel[i].x + 7)  % 14) - 7
        pos[i * 3 + 1] = ((pos[i * 3 + 1] + vel[i].y + 4.5) % 9) - 4.5
      }
      ptGeom.attributes.position.needsUpdate = true
      let li = 0
      for (let i = 0; i < COUNT; i++) {
        for (let j = i + 1; j < COUNT; j++) {
          const dx = pos[i*3]-pos[j*3], dy = pos[i*3+1]-pos[j*3+1], dz = pos[i*3+2]-pos[j*3+2]
          if (Math.sqrt(dx*dx + dy*dy + dz*dz) < DIST) {
            linePos[li++]=pos[i*3]; linePos[li++]=pos[i*3+1]; linePos[li++]=pos[i*3+2]
            linePos[li++]=pos[j*3]; linePos[li++]=pos[j*3+1]; linePos[li++]=pos[j*3+2]
          }
        }
      }
      lineGeom.setDrawRange(0, li / 3)
      lineGeom.attributes.position.needsUpdate = true
      renderer.render(scene, camera)
    }
    tick()

    const onResize = () => {
      const nW = el.clientWidth, nH = el.clientHeight
      camera.aspect = nW / nH
      camera.updateProjectionMatrix()
      renderer.setSize(nW, nH)
    }
    window.addEventListener('resize', onResize)

    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', onResize)
      renderer.dispose()
      if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement)
    }
  }, [])

  return <div ref={mountRef} className="absolute inset-0 w-full h-full pointer-events-none" />
}

// ─── Cycling Threat Card ──────────────────────────────────────────────────────

function ThreatCard() {
  const [idx, setIdx]         = useState(0)
  const [visible, setVisible] = useState(true)
  const [hovering, setHover]  = useState(false)

  useEffect(() => {
    const iv = setInterval(() => {
      setVisible(false)
      setTimeout(() => { setIdx((i) => (i + 1) % EXAMPLES.length); setVisible(true) }, 320)
    }, 4000)
    return () => clearInterval(iv)
  }, [])

  const ex     = EXAMPLES[idx]
  const color  = scoreColor(ex.score)
  const circ   = 2 * Math.PI * 36
  const offset = circ - (ex.score / 100) * circ

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background:  '#111111',
        border:      `1px solid ${hovering ? '#ffc17450' : '#1a1a1a'}`,
        borderRadius: 10,
        padding:     28,
        boxShadow:   hovering ? '0 0 56px #ffc17420' : 'none',
        opacity:     visible ? 1 : 0,
        transform:   visible ? 'translateY(0)' : 'translateY(10px)',
        transition:  'border-color .3s ease, box-shadow .3s ease, opacity .32s ease, transform .32s ease',
      }}
    >
      <div className="flex items-start gap-5 mb-5">
        <div className="relative shrink-0" style={{ width: 84, height: 84 }}>
          <svg className="absolute inset-0 -rotate-90" width="84" height="84">
            <circle cx="42" cy="42" r="36" fill="none" stroke="#1e1e1e" strokeWidth="5" />
            <circle cx="42" cy="42" r="36" fill="none" stroke={color} strokeWidth="5"
              strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              style={{ transition: 'stroke-dashoffset 0.9s ease, stroke .3s' }} />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span style={{ fontFamily: 'monospace', fontSize: 24, fontWeight: 700, color, lineHeight: 1 }}>{ex.score}</span>
            <span style={{ fontSize: 9, color: '#555', fontFamily: 'monospace', textTransform: 'uppercase', letterSpacing: '0.1em' }}>riesgo</span>
          </div>
        </div>
        <div style={{ paddingTop: 4 }}>
          <span style={{ fontSize: 10, fontFamily: 'monospace', color, letterSpacing: '0.15em', padding: '2px 8px', background: `${color}18`, border: `1px solid ${color}30`, borderRadius: 3 }}>
            {ex.category}
          </span>
          <p style={{ fontSize: 13, color: '#d4d0ce', marginTop: 10, lineHeight: 1.4 }}>{ex.summary}</p>
          <p style={{ fontSize: 11, color: '#444', fontFamily: 'monospace', marginTop: 4 }}>{ex.region}</p>
        </div>
      </div>

      {[['Urgencia', ex.urgency], ['Autoridad', ex.authority], ['Coerción', ex.coercion]].map(([label, value]) => (
        <div key={label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginBottom: 4 }}>
            <span style={{ color: '#555' }}>{label}</span>
            <span style={{ fontFamily: 'monospace', color: scoreColor(value) }}>{value}%</span>
          </div>
          <div style={{ height: 2, background: '#1e1e1e', borderRadius: 1 }}>
            <div style={{ height: '100%', width: `${value}%`, background: scoreColor(value), borderRadius: 1, transition: 'width .9s ease' }} />
          </div>
        </div>
      ))}

      {ex.score > 75 && (
        <div style={{ marginTop: 16, background: '#ef444412', border: '1px solid #ef444428', borderRadius: 6, padding: '10px 14px', display: 'flex', gap: 10, alignItems: 'flex-start' }}>
          <span style={{ color: '#ef4444', fontSize: 14, flexShrink: 0 }}>⚠</span>
          <p style={{ fontSize: 11, color: '#ef4444', lineHeight: 1.4 }}>Alto riesgo. No transfieras dinero. Llama directamente a tu banco.</p>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginTop: 20 }}>
        {EXAMPLES.map((_, i) => (
          <button key={i} onClick={() => setIdx(i)}
            style={{ width: i === idx ? 20 : 6, height: 4, borderRadius: 2, background: i === idx ? '#ffc174' : '#2a2a2a', border: 'none', cursor: 'pointer', transition: 'all .3s' }} />
        ))}
      </div>
    </div>
  )
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
      padding: '0 48px', height: 60,
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? 'rgba(10,10,10,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(14px)' : 'none',
      borderBottom: scrolled ? '1px solid #1a1a1a' : '1px solid transparent',
      transition: 'background .3s, backdrop-filter .3s, border-color .3s',
    }}>
      <Link to="/" style={{ fontFamily: 'monospace', fontSize: 14, fontWeight: 700, color: '#ffc174', letterSpacing: '0.12em', textDecoration: 'none' }}>
        HACKLATAM
      </Link>
      <div style={{ display: 'flex', gap: 36, fontSize: 13, color: '#888' }}>
        {[['#problem', 'El problema'], ['#how', 'Cómo funciona'], ['#demo', 'Demo']].map(([href, label]) => (
          <a key={href} href={href} style={{ color: 'inherit', textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={(e) => { e.target.style.color = '#e5e2e1' }}
            onMouseLeave={(e) => { e.target.style.color = '#888' }}>
            {label}
          </a>
        ))}
      </div>
      <Link to="/app" style={{
        border: '1px solid #ffc17460', color: '#ffc174', padding: '7px 20px', borderRadius: 4,
        fontSize: 13, fontFamily: 'monospace', textDecoration: 'none', transition: 'background .2s',
      }}
        onMouseEnter={(e) => { e.currentTarget.style.background = '#ffc17410' }}
        onMouseLeave={(e) => { e.currentTarget.style.background = 'transparent' }}>
        Abrir app →
      </Link>
    </nav>
  )
}

// ─── Hero ─────────────────────────────────────────────────────────────────────

function HeroSection({ stats }) {
  const heroRef = useRef(null)
  const line1   = useRef(null)
  const line2   = useRef(null)
  const line3   = useRef(null)
  const subRef  = useRef(null)
  const ctaRef  = useRef(null)
  const statRef = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      const tl = gsap.timeline({ defaults: { ease: 'power3.out' }, delay: 0.15 })
      tl
        .from([line1.current, line2.current, line3.current], { y: 80, duration: 0.9, stagger: 0.13 })
        .from(subRef.current,  { opacity: 0, y: 24, duration: 0.65 }, '-=0.45')
        .from(ctaRef.current,  { opacity: 0, y: 20, duration: 0.55 }, '-=0.35')
        .from(statRef.current, { opacity: 0,         duration: 0.45 }, '-=0.25')
    }, heroRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={heroRef} style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: '#0a0a0a', display: 'flex', alignItems: 'center', paddingTop: 60 }}>
      <HeroParticles />

      <div style={{ position: 'relative', zIndex: 1, display: 'flex', alignItems: 'center', width: '100%', padding: '0 64px', gap: 48 }}>
        {/* Left — 55% */}
        <div style={{ flex: '0 0 55%' }}>
          <p style={{ fontSize: 11, letterSpacing: '0.22em', color: '#ffc174', fontFamily: 'monospace', marginBottom: 28 }}>
            INTELIGENCIA DEFENSIVA · LATAM
          </p>

          <h1 style={{ fontSize: 64, fontWeight: 700, lineHeight: 1.06, marginBottom: 28 }}>
            <div style={{ overflow: 'hidden' }}>
              <div ref={line1} style={{ color: '#e5e2e1' }}>El fraude digital</div>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div ref={line2} style={{ color: '#e5e2e1' }}>no avisa.</div>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div ref={line3} style={{ color: '#ffc174' }}>Tú sí puedes.</div>
            </div>
          </h1>

          <p ref={subRef} style={{ fontSize: 16, color: '#a08e7a', maxWidth: 480, lineHeight: 1.65, marginBottom: 36 }}>
            Analiza mensajes, imágenes y llamadas sospechosas en segundos. Inteligencia colectiva para LATAM.
          </p>

          <div ref={ctaRef} style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            <Link to="/app/scanner" style={{ background: '#ffc174', color: '#131313', padding: '13px 28px', borderRadius: 4, fontWeight: 700, fontSize: 14, textDecoration: 'none' }}>
              Analizar amenaza →
            </Link>
            <Link to="/app" style={{ border: '1px solid #262626', color: '#e5e2e1', padding: '13px 28px', borderRadius: 4, fontSize: 14, textDecoration: 'none', background: 'transparent' }}>
              Ver dashboard →
            </Link>
          </div>

          <div ref={statRef} style={{ fontFamily: 'monospace', fontSize: 13, color: '#444' }}>
            <span style={{ color: '#ffc174' }}>{stats.threats ?? '—'}</span>{' amenazas · '}
            <span style={{ color: '#ffc174' }}>{stats.campaigns ?? '—'}</span>{' campañas · Score avg '}
            <span style={{ color: '#ffc174' }}>{stats.avgRisk ?? '—'}</span>
          </div>
        </div>

        {/* Right — 45% */}
        <div style={{ flex: '0 0 calc(45% - 48px)', minWidth: 0 }}>
          <ThreatCard />
        </div>
      </div>
    </section>
  )
}

// ─── Problem ──────────────────────────────────────────────────────────────────

function ProblemSection() {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      document.querySelectorAll('.stat-num').forEach((el) => {
        const end    = parseFloat(el.dataset.end)
        const prefix = el.dataset.prefix || ''
        const suffix = el.dataset.suffix || ''
        const obj    = { v: 0 }
        ScrollTrigger.create({
          trigger: el, start: 'top 82%', once: true,
          onEnter() {
            gsap.to(obj, {
              v: end, duration: 2.5, ease: 'power2.out',
              onUpdate() { el.textContent = prefix + Math.round(obj.v).toLocaleString('es-MX') + suffix },
            })
          },
        })
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  const items = [
    { end: 697000000, prefix: '',  suffix: '',      label: 'intentos de phishing en LATAM' },
    { end: 13500000,  prefix: '',  suffix: '',      label: 'mexicanos víctimas de fraude' },
    { end: 9,         prefix: '',  suffix: '%',     label: 'que denuncia el fraude' },
    { end: 8750,      prefix: '$', suffix: ' MXN',  label: 'pérdida promedio por caso' },
  ]

  return (
    <section ref={ref} id="problem" style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a', padding: '120px 64px' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.22em', color: '#ffc174', fontFamily: 'monospace', marginBottom: 16, textAlign: 'center' }}>
        EL PROBLEMA
      </p>
      <h2 style={{ fontSize: 40, fontWeight: 700, color: '#e5e2e1', textAlign: 'center', marginBottom: 80 }}>
        El fraude digital en LATAM es sistémico.
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24 }}>
        {items.map(({ end, prefix, suffix, label }) => (
          <div key={label} style={{ textAlign: 'center', padding: '32px 24px', background: '#111', border: '1px solid #1a1a1a', borderRadius: 8 }}>
            <div className="stat-num"
              data-end={end} data-prefix={prefix} data-suffix={suffix}
              style={{ fontSize: 38, fontWeight: 800, fontFamily: 'monospace', color: '#ffc174', marginBottom: 12 }}>
              {prefix}0{suffix}
            </div>
            <p style={{ fontSize: 13, color: '#a08e7a', lineHeight: 1.55 }}>{label}</p>
          </div>
        ))}
      </div>

      <p style={{ textAlign: 'center', fontSize: 11, color: '#333', fontFamily: 'monospace', marginTop: 56 }}>
        Fuente: CONDUSEF · ENVIPE 2025 · The CIU
      </p>
    </section>
  )
}

// ─── Globe ────────────────────────────────────────────────────────────────────

function GlobeSection({ incidents }) {
  const sectionRef   = useRef(null)
  const containerRef = useRef(null)
  const globeRef     = useRef(null)
  const [recent, setRecent] = useState([])

  const points = useMemo(() => {
    return incidents
      .filter((inc) => inc.risk_score > 0 && inc.threat_type !== 'unknown')
      .map((inc) => {
        const coords = geocode(inc.region)
        if (!coords) return null
        return {
          lat:      coords[0],
          lng:      coords[1],
          altitude: 0.01 + (inc.risk_score / 100) * 0.09,
          color:    inc.risk_score >= 80 ? '#ef4444cc' : '#f59e0bcc',
          radius:   0.35 + (inc.risk_score / 100) * 0.5,
          label:    `<div style="font:11px monospace;background:#111;border:1px solid #262626;padding:6px 10px;border-radius:4px;color:#e5e2e1;pointer-events:none">${inc.threat_type.toUpperCase()}<br/>${inc.region ?? '—'} · <span style="color:${scoreColor(inc.risk_score)}">${inc.risk_score}</span></div>`,
        }
      })
      .filter(Boolean)
  }, [incidents])

  useEffect(() => {
    setRecent(incidents.filter((i) => i.risk_score > 0 && i.threat_type !== 'unknown').slice(0, 5))
  }, [incidents])

  // Init globe once
  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const g = Globe()(el)
    g.width(el.offsetWidth)
      .height(el.offsetHeight)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(false)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
      .bumpImageUrl(null)
      .pointsData([])
      .pointAltitude('altitude')
      .pointColor('color')
      .pointRadius('radius')
      .pointLabel('label')
      .pointsTransitionDuration(1200)

    g.controls().autoRotate      = true
    g.controls().autoRotateSpeed = 0.2
    g.controls().enableDamping   = true
    g.controls().dampingFactor   = 0.05
    globeRef.current = g

    return () => {
      globeRef.current = null
      while (el.firstChild) el.removeChild(el.firstChild)
    }
  }, [])

  // Update points when data changes
  useEffect(() => {
    if (globeRef.current && points.length > 0) {
      globeRef.current.pointsData(points)
    }
  }, [points])

  // Pin section with ScrollTrigger
  useEffect(() => {
    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start:   'top top',
        end:     '+=90%',
        pin:     true,
        pinSpacing: true,
      })
    }, sectionRef)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={sectionRef} style={{ position: 'relative', height: '100vh', background: '#0a0a0a', overflow: 'hidden', borderTop: '1px solid #1a1a1a' }}>
      {/* Sidebar */}
      <div style={{ position: 'absolute', left: 48, top: '50%', transform: 'translateY(-50%)', width: 260, zIndex: 10, pointerEvents: 'none' }}>
        <p style={{ fontSize: 10, letterSpacing: '0.22em', color: '#ffc174', fontFamily: 'monospace', marginBottom: 20 }}>
          AMENAZAS EN TIEMPO REAL
        </p>
        <p style={{ fontSize: 40, fontWeight: 800, fontFamily: 'monospace', color: '#e5e2e1', marginBottom: 24, lineHeight: 1 }}>
          <span style={{ color: '#ffc174' }}>{points.length}</span>
          <span style={{ fontSize: 16, color: '#555', display: 'block', marginTop: 4 }}>incidentes mapeados</span>
        </p>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.map((inc) => (
            <div key={inc.id} style={{ background: '#111111dd', border: '1px solid #1a1a1a', borderRadius: 6, padding: '8px 12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <span style={{ fontSize: 10, fontFamily: 'monospace', color: scoreColor(inc.risk_score), textTransform: 'uppercase', letterSpacing: '0.1em' }}>{inc.threat_type}</span>
                <span style={{ fontSize: 13, fontFamily: 'monospace', fontWeight: 700, color: scoreColor(inc.risk_score) }}>{inc.risk_score}</span>
              </div>
              <p style={{ fontSize: 10, color: '#555', fontFamily: 'monospace', marginTop: 3 }}>{inc.region ?? '—'}</p>
            </div>
          ))}
          {recent.length === 0 && (
            <p style={{ fontSize: 11, color: '#333', fontFamily: 'monospace' }}>Sin incidentes mapeados aún.</p>
          )}
        </div>
      </div>

      {/* Globe */}
      <div ref={containerRef} style={{ position: 'absolute', inset: 0 }} />

      {/* Right fade gradient so globe blends */}
      <div style={{ position: 'absolute', top: 0, left: 0, width: 340, height: '100%', pointerEvents: 'none',
        background: 'linear-gradient(to right, #0a0a0a 60%, transparent)' }} />
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.step-item').forEach((el) => {
        gsap.from(el, {
          x: 90, opacity: 0, duration: 0.75, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 78%' },
        })
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} id="how" style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a', padding: '120px 64px' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.22em', color: '#ffc174', fontFamily: 'monospace', marginBottom: 16 }}>
        CÓMO FUNCIONA
      </p>
      <h2 style={{ fontSize: 40, fontWeight: 700, color: '#e5e2e1', marginBottom: 64 }}>
        Tres pasos para estar protegido.
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
        {STEPS.map(({ num, title, desc }) => (
          <div key={num} className="step-item"
            style={{ display: 'flex', alignItems: 'center', gap: 48, padding: '36px 48px', background: '#111', border: '1px solid #1a1a1a', borderRadius: 8 }}>
            <span style={{ fontSize: 88, fontWeight: 900, fontFamily: 'monospace', color: '#ffc174', opacity: 0.12, lineHeight: 1, flexShrink: 0, userSelect: 'none' }}>
              {num}
            </span>
            <div>
              <h3 style={{ fontSize: 30, fontWeight: 700, color: '#e5e2e1', marginBottom: 12 }}>{title}</h3>
              <p style={{ fontSize: 15, color: '#a08e7a', lineHeight: 1.7, maxWidth: 640 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── What You Can Scan ────────────────────────────────────────────────────────

function FlipCard({ icon, title, back, to }) {
  const [flipped, setFlipped] = useState(false)
  return (
    <div style={{ perspective: 1200, height: 230 }}
      onMouseEnter={() => setFlipped(true)}
      onMouseLeave={() => setFlipped(false)}>
      <div style={{
        position: 'relative', width: '100%', height: '100%',
        transformStyle: 'preserve-3d',
        transform: flipped ? 'rotateY(180deg)' : 'rotateY(0)',
        transition: 'transform 0.55s cubic-bezier(.4,0,.2,1)',
      }}>
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          background: '#111', border: '1px solid #1a1a1a', borderRadius: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: 18,
        }}>
          <span style={{ fontSize: 44 }}>{icon}</span>
          <p style={{ fontSize: 15, fontWeight: 600, color: '#e5e2e1', textAlign: 'center', padding: '0 20px', lineHeight: 1.3 }}>{title}</p>
        </div>
        <div style={{
          position: 'absolute', inset: 0, backfaceVisibility: 'hidden',
          transform: 'rotateY(180deg)',
          background: '#111', border: '1px solid #ffc17430', borderRadius: 8,
          display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
          padding: '24px 28px', gap: 20,
        }}>
          <p style={{ fontSize: 13, color: '#a08e7a', textAlign: 'center', lineHeight: 1.65 }}>{back}</p>
          <Link to={to} style={{ color: '#ffc174', fontSize: 13, fontFamily: 'monospace', textDecoration: 'none' }}>Probar →</Link>
        </div>
      </div>
    </div>
  )
}

function WhatYouCanScan() {
  return (
    <section style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a', padding: '120px 64px' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.22em', color: '#ffc174', fontFamily: 'monospace', marginBottom: 16 }}>
        QUÉ PUEDES ANALIZAR
      </p>
      <h2 style={{ fontSize: 40, fontWeight: 700, color: '#e5e2e1', marginBottom: 64 }}>
        Un escáner. Cuatro vectores de amenaza.
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 20 }}>
        {SCAN_CARDS.map((c) => <FlipCard key={c.title} {...c} />)}
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  return (
    <section id="demo" style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a', padding: '160px 64px', textAlign: 'center' }}>
      <p style={{ fontSize: 10, letterSpacing: '0.22em', color: '#ffc174', fontFamily: 'monospace', marginBottom: 28 }}>
        EMPIEZA AHORA
      </p>
      <h2 style={{ fontSize: 52, fontWeight: 700, color: '#e5e2e1', marginBottom: 20, lineHeight: 1.1 }}>
        ¿Recibiste algo sospechoso?
      </h2>
      <p style={{ fontSize: 18, color: '#a08e7a', marginBottom: 56 }}>
        Analízalo gratis. Sin registro. 100% anónimo.
      </p>
      <Link to="/app/scanner" style={{
        display: 'inline-block', background: '#ffc174', color: '#131313',
        padding: '18px 56px', borderRadius: 6, fontSize: 16, fontWeight: 700,
        textDecoration: 'none', animation: 'pulseCta 2.5s ease-in-out infinite',
      }}>
        Analizar ahora →
      </Link>
      <style>{`@keyframes pulseCta { 0%,100% { box-shadow: 0 0 0 0 rgba(255,193,116,.35) } 50% { box-shadow: 0 0 0 22px rgba(255,193,116,0) } }`}</style>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

const fLink = { color: '#555', fontSize: 13, textDecoration: 'none', display: 'block', transition: 'color .2s' }

function Footer() {
  return (
    <footer style={{ background: '#0a0a0a', borderTop: '1px solid #1a1a1a', padding: '56px 64px 36px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
        <div>
          <p style={{ fontFamily: 'monospace', fontSize: 15, fontWeight: 700, color: '#ffc174', letterSpacing: '0.12em', marginBottom: 8 }}>HACKLATAM</p>
          <p style={{ fontSize: 12, color: '#444', fontFamily: 'monospace' }}>inteligencia de amenazas</p>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[['Dashboard', '/app'], ['Escáner', '/app/scanner'], ['Feed de Inteligencia', '/app/intelligence'], ['Alertas', '/app/alerts']].map(([label, to]) => (
            <Link key={to} to={to} style={fLink}
              onMouseEnter={(e) => { e.target.style.color = '#e5e2e1' }}
              onMouseLeave={(e) => { e.target.style.color = '#555' }}>
              {label}
            </Link>
          ))}
        </div>
        <div>
          <p style={{ fontSize: 13, color: '#555', marginBottom: 12 }}>Open source · GitHub</p>
          <p style={{ fontSize: 12, color: '#333', fontFamily: 'monospace', lineHeight: 1.6 }}>
            Construido para DEF/ACC<br />hack@latam 2025
          </p>
        </div>
      </div>
      <div style={{ borderTop: '1px solid #1a1a1a', paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontSize: 11, color: '#333', fontFamily: 'monospace' }}>© 2025 HackLatam. Todos los derechos reservados.</p>
        <p style={{ fontSize: 11, color: '#2a2a2a', fontFamily: 'monospace' }}>v0.1.0-alpha</p>
      </div>
    </footer>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [stats, setStats]       = useState({ threats: null, campaigns: null, avgRisk: null })
  const [incidents, setIncidents] = useState([])

  useEffect(() => {
    getStats().then((s) => {
      if (s) setStats({
        threats:   s.total_24h,
        campaigns: s.active_campaigns,
        avgRisk:   s.avg_risk_score != null ? Number(s.avg_risk_score).toFixed(1) : null,
      })
    })
    getFeed({ limit: 50 }).then((f) => { if (f) setIncidents(f) })
    const iv = setInterval(() => {
      getFeed({ limit: 50 }).then((f) => { if (f) setIncidents(f) })
    }, 30000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ background: '#0a0a0a', color: '#e5e2e1', fontFamily: 'Geist, system-ui, sans-serif', minHeight: '100vh' }}>
      <Nav />
      <HeroSection stats={stats} />
      <ProblemSection />
      <GlobeSection incidents={incidents} />
      <HowItWorks />
      <WhatYouCanScan />
      <FinalCTA />
      <Footer />
    </div>
  )
}
