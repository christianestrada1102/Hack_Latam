import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import Globe from 'globe.gl'
import {
  GlobeIcon,
  ArrowRightIcon,
  UploadIcon,
  MagnifyingGlassIcon,
  LockClosedIcon,
  ChatBubbleIcon,
  Link2Icon,
  SpeakerLoudIcon,
  GitHubLogoIcon,
} from '@radix-ui/react-icons'
import { getStats, getFeed } from '../lib/api'

gsap.registerPlugin(ScrollTrigger)

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:       '#080808',
  surface:  '#0f0f0f',
  border:   '#1a1a1a',
  accent:   '#ffc174',
  danger:   '#ef4444',
  text:     '#f0ede8',
  muted:    '#6b6560',
}

const HARMOND   = "'Harmond', serif"
const GEIST     = "'Geist Variable', 'Geist', system-ui, sans-serif"
const MONO      = "'JetBrains Mono', 'Fira Code', monospace"

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
  'Santiago':      [-33.4489, -70.6693],
  'Caracas':       [ 10.4806, -66.9036],
  'Medellín':      [ 6.2442,  -75.5812],
}

const STAT_ITEMS = [
  { end: 697000000, prefix: '',  suffix: '',     label: 'intentos de phishing en LATAM' },
  { end: 13500000,  prefix: '',  suffix: '',     label: 'mexicanos víctimas de fraude' },
  { end: 9,         prefix: '',  suffix: '%',    label: 'que denuncia el fraude' },
  { end: 8750,      prefix: '$', suffix: ' MXN', label: 'pérdida promedio por caso' },
]

const STEPS = [
  {
    num: '01', title: 'Analiza', Icon: UploadIcon,
    desc: 'Sube un screenshot, mensaje, URL o llamada. El pipeline extrae texto con OCR y transcripción Whisper.',
  },
  {
    num: '02', title: 'Detecta', Icon: MagnifyingGlassIcon,
    desc: 'La IA identifica manipulación psicológica, dominios falsos y patrones de fraude conocidos en LATAM.',
  },
  {
    num: '03', title: 'Protege', Icon: LockClosedIcon,
    desc: 'Tu análisis alimenta la red colectiva que protege a otros usuarios en México, Colombia, Argentina y más.',
  },
]

const SCAN_CARDS = [
  { Icon: UploadIcon,       title: 'Imagen / Screenshot', body: 'OCR con Mistral Pixtral. Lee texto en screenshots de WhatsApp, SMS o emails.' },
  { Icon: ChatBubbleIcon,   title: 'Texto / Mensaje',     body: 'Análisis psicológico en tiempo real. Detecta urgencia, coerción y autoridad falsa.' },
  { Icon: Link2Icon,        title: 'URL / Enlace',         body: 'Verificación con VirusTotal + análisis del contenido real de la página.' },
  { Icon: SpeakerLoudIcon,  title: 'Audio / Llamada',     body: 'Transcripción con Whisper. Analiza grabaciones de vishing y extorsión.' },
]

// ─── Helpers ──────────────────────────────────────────────────────────────────

function geocode(region) {
  if (!region) return null
  for (const [key, coords] of Object.entries(GEO)) {
    if (region.includes(key)) return coords
  }
  return null
}

function scoreColor(s) {
  if (s >= 80) return C.danger
  if (s >= 60) return C.accent
  return '#6b6560'
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

function Nav() {
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  return (
    <nav style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: 60, padding: '0 48px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? 'rgba(8,8,8,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: '1px solid #1a1a1a',
      transition: 'background .3s, backdrop-filter .3s',
    }}>
      <Link to="/" style={{ fontFamily: HARMOND, fontWeight: 600, fontSize: 15, color: C.accent, letterSpacing: '0.12em', textDecoration: 'none' }}>
        HACKLATAM
      </Link>

      <div style={{ display: 'flex', gap: 32, fontFamily: GEIST, fontSize: 13, color: C.muted }}>
        {[['#problem', 'El problema'], ['#how', 'Cómo funciona'], ['#demo', 'Demo']].map(([href, label]) => (
          <a key={href} href={href}
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.text }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.muted }}>
            {label}
          </a>
        ))}
      </div>

      <Link to="/app"
        style={{ border: `1px solid #2a2a2a`, color: C.text, padding: '7px 18px', borderRadius: 4, fontFamily: GEIST, fontSize: 13, textDecoration: 'none', transition: 'border-color .2s, color .2s' }}
        onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent }}
        onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = C.text }}>
        Abrir app →
      </Link>
    </nav>
  )
}

// ─── Hero + Globe intro ───────────────────────────────────────────────────────
// Globe renders full-screen first, then shrinks to right panel after 1.8s.

function HeroSection({ stats, incidents }) {
  const heroRef      = useRef(null)
  const contentRef   = useRef(null)
  const globeWrapRef = useRef(null)
  const globeElRef   = useRef(null)
  const globeRef     = useRef(null)
  const introPlayed  = useRef(false)

  const line1 = useRef(null)
  const line2 = useRef(null)
  const line3 = useRef(null)
  const subRef = useRef(null)
  const ctaRef = useRef(null)
  const statRef = useRef(null)

  const points = useMemo(() => incidents
    .filter((i) => i.risk_score > 0 && i.threat_type !== 'unknown')
    .map((inc) => {
      const coords = geocode(inc.region)
      if (!coords) return null
      return {
        lat:   coords[0],
        lng:   coords[1],
        color: inc.risk_score >= 80 ? '#ef4444' : inc.risk_score >= 60 ? '#ffc174' : '#6b6560',
        label: `<div style="font:11px monospace;background:#111;border:1px solid #262626;padding:6px 10px;border-radius:4px;color:#f0ede8;pointer-events:none">${inc.threat_type.toUpperCase()}<br/>${inc.region ?? '—'} · <span style="color:${scoreColor(inc.risk_score)}">${inc.risk_score}</span></div>`,
      }
    })
    .filter(Boolean), [incidents])

  // Init globe
  useEffect(() => {
    const el = globeElRef.current
    if (!el) return

    const g = Globe()(el)
    g.width(el.offsetWidth || window.innerWidth)
      .height(el.offsetHeight || window.innerHeight)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#ffc174')
      .atmosphereAltitude(0.12)
      .showGraticules(true)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
      .bumpImageUrl(null)
      .pointsData([])
      .pointAltitude(0)
      .pointRadius(0.4)
      .pointColor('color')
      .pointsMerge(true)
      .pointLabel('label')
      .pointsTransitionDuration(1200)
      .ringsData([])
      .ringLat('lat')
      .ringLng('lng')
      .ringColor(() => '#ffc17460')
      .ringMaxRadius(3)
      .ringPropagationSpeed(1)
      .ringRepeatPeriod(1500)

    g.pointOfView({ lat: 10, lng: -75, altitude: 1.8 })
    g.controls().autoRotate      = true
    g.controls().autoRotateSpeed = 0.3
    g.controls().enableDamping   = true
    g.controls().dampingFactor   = 0.05
    g.controls().enableZoom      = false

    globeRef.current = g

    const ro = new ResizeObserver(() => {
      if (globeRef.current && el) {
        globeRef.current.width(el.clientWidth).height(el.clientHeight)
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      globeRef.current = null
      while (el.firstChild) el.removeChild(el.firstChild)
    }
  }, [])

  // Update points + rings
  useEffect(() => {
    if (globeRef.current && points.length > 0) {
      globeRef.current.pointsData(points).ringsData(points)
    }
  }, [points])

  // Intro animation: globe full-screen → right panel, content slides in
  useEffect(() => {
    if (introPlayed.current) return
    introPlayed.current = true

    const wrap    = globeWrapRef.current
    const content = contentRef.current
    if (!wrap || !content) return

    gsap.set(content, { opacity: 0, x: -40 })

    const tl = gsap.timeline({ delay: 1.8 })

    // Globe: animate from full-screen centered to right-panel position
    tl.to(wrap, {
      left: '45%', width: '55%',
      duration: 1.1, ease: 'power3.inOut',
    }, 0)

    // Content fades + slides in from left
    tl.to(content, {
      opacity: 1, x: 0,
      duration: 0.9, ease: 'power3.out',
    }, 0.35)

    // Headline lines stagger up
    tl.from([line1.current, line2.current, line3.current], {
      y: 56, duration: 0.8, stagger: 0.12, ease: 'power3.out',
    }, 0.5)

    tl.from(subRef.current, { opacity: 0, y: 20, duration: 0.6, ease: 'power2.out' }, 0.85)
    tl.from(ctaRef.current,  { opacity: 0, y: 16, duration: 0.5, ease: 'power2.out' }, 1.0)
    tl.from(statRef.current, { opacity: 0, duration: 0.4 }, 1.2)
  }, [])

  return (
    <section ref={heroRef} style={{
      position: 'relative', height: '100vh', overflow: 'hidden',
      background: C.bg,
    }}>
      {/* Globe wrapper — starts full-screen, animates to right panel */}
      <div ref={globeWrapRef} style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none',
        zIndex: 1,
      }}>
        <div ref={globeElRef} style={{ width: '100%', height: '100%' }} />
        {/* Left gradient overlay so globe blends into content */}
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(to right, ${C.bg} 0%, ${C.bg}cc 30%, transparent 65%)`,
        }} />
      </div>

      {/* Hero content — left panel */}
      <div ref={contentRef} style={{
        position: 'absolute', top: 0, left: 0,
        width: '50%', height: '100%',
        zIndex: 10, display: 'flex', alignItems: 'center',
        padding: '80px 0 0 64px', pointerEvents: 'auto',
      }}>
        <div style={{ maxWidth: 520 }}>
          {/* Label */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 28 }}>
            <GlobeIcon style={{ color: C.accent, flexShrink: 0 }} width={13} height={13} />
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: C.accent }}>
              INTELIGENCIA DEFENSIVA · LATAM
            </span>
          </div>

          {/* Headline */}
          <h1 style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 72, lineHeight: 1.04, marginBottom: 28 }}>
            <div style={{ overflow: 'hidden' }}>
              <div ref={line1} style={{ color: C.text }}>El fraude digital</div>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div ref={line2} style={{ color: C.text }}>no avisa.</div>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div ref={line3} style={{ color: C.accent }}>Tú sí puedes.</div>
            </div>
          </h1>

          {/* Subtext */}
          <p ref={subRef} style={{ fontFamily: GEIST, fontSize: 16, color: C.muted, maxWidth: 420, lineHeight: 1.7, marginBottom: 36 }}>
            Analiza mensajes, imágenes y llamadas sospechosas en segundos. Inteligencia colectiva para toda LATAM.
          </p>

          {/* CTAs */}
          <div ref={ctaRef} style={{ display: 'flex', gap: 12, marginBottom: 36, flexWrap: 'wrap' }}>
            <Link to="/app/scanner" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: C.accent, color: '#080808',
              padding: '13px 26px', borderRadius: 4,
              fontFamily: GEIST, fontWeight: 700, fontSize: 14, textDecoration: 'none',
            }}>
              Analizar amenaza
              <ArrowRightIcon width={14} height={14} />
            </Link>
            <Link to="/app" style={{
              border: '1px solid #2a2a2a', color: C.text,
              padding: '13px 26px', borderRadius: 4,
              fontFamily: GEIST, fontSize: 14, textDecoration: 'none', background: 'transparent',
              transition: 'border-color .2s',
            }}
              onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#444' }}
              onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a' }}>
              Ver dashboard
            </Link>
          </div>

          {/* Live stats */}
          <div ref={statRef} style={{ fontFamily: MONO, fontSize: 12, color: '#333' }}>
            <span style={{ color: C.accent }}>{stats.threats ?? '—'}</span>
            <span style={{ color: '#2a2a2a' }}> amenazas · </span>
            <span style={{ color: C.accent }}>{stats.campaigns ?? '—'}</span>
            <span style={{ color: '#2a2a2a' }}> campañas · avg </span>
            <span style={{ color: C.accent }}>{stats.avgRisk ?? '—'}</span>
          </div>
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
      // Cards reveal with stagger
      gsap.utils.toArray('.prob-card').forEach((el, i) => {
        gsap.from(el, {
          opacity: 0, y: 32, duration: 0.7, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 80%', once: true },
          delay: i * 0.1,
        })
      })

      // Count-up
      document.querySelectorAll('.stat-num').forEach((el) => {
        const end    = parseFloat(el.dataset.end)
        const prefix = el.dataset.prefix || ''
        const suffix = el.dataset.suffix || ''
        const obj    = { v: 0 }
        ScrollTrigger.create({
          trigger: el, start: 'top 80%', once: true,
          onEnter() {
            gsap.to(obj, {
              v: end, duration: 2.2, ease: 'power2.out',
              onUpdate() {
                el.textContent = prefix + Math.round(obj.v).toLocaleString('es-MX') + suffix
              },
            })
          },
        })
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} id="problem" style={{
      background: C.bg, borderTop: `1px solid ${C.border}`,
      padding: '120px 64px',
    }}>
      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: C.accent, marginBottom: 16, textAlign: 'center' }}>
        EL PROBLEMA
      </p>
      <h2 style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 56, color: C.text, textAlign: 'center', marginBottom: 80, lineHeight: 1.1 }}>
        El fraude digital en LATAM es sistémico.
      </h2>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 20 }}>
        {STAT_ITEMS.map(({ end, prefix, suffix, label }) => (
          <div key={label} className="prob-card" style={{
            background: C.surface, border: `1px solid ${C.border}`, borderRadius: 8,
            padding: '36px 28px', textAlign: 'center',
          }}>
            <div
              className="stat-num"
              data-end={end} data-prefix={prefix} data-suffix={suffix}
              style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 42, color: C.accent, marginBottom: 14, lineHeight: 1 }}>
              {prefix}0{suffix}
            </div>
            <p style={{ fontFamily: GEIST, fontSize: 13, color: C.muted, lineHeight: 1.6 }}>{label}</p>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: MONO, fontSize: 11, color: '#2e2e2e', textAlign: 'center', marginTop: 48 }}>
        Fuente: CONDUSEF · ENVIPE 2025 · The CIU
      </p>
    </section>
  )
}

// ─── Globe section (fixed height, responsive, no scroll hijack) ───────────────

function GlobeSection({ incidents }) {
  const containerRef = useRef(null)
  const globeRef     = useRef(null)
  const [recent, setRecent] = useState([])
  const [winW, setWinW]     = useState(() => window.innerWidth)

  const isMobile = winW < 768
  const isTablet = winW >= 768 && winW < 1024
  const sidebarW = isMobile ? '100%' : isTablet ? '40%' : '35%'

  const points = useMemo(() => incidents
    .filter((i) => i.risk_score > 0 && i.threat_type !== 'unknown')
    .map((inc) => {
      const coords = geocode(inc.region)
      if (!coords) return null
      return {
        lat:   coords[0],
        lng:   coords[1],
        color: inc.risk_score >= 80 ? '#ef4444' : inc.risk_score >= 60 ? '#ffc174' : '#6b6560',
        label: `<div style="font:11px monospace;background:#111;border:1px solid #262626;padding:6px 10px;border-radius:4px;color:#f0ede8;pointer-events:none">${inc.threat_type.toUpperCase()}<br/>${inc.region ?? '—'} · <span style="color:${scoreColor(inc.risk_score)}">${inc.risk_score}</span></div>`,
      }
    })
    .filter(Boolean), [incidents])

  useEffect(() => {
    setRecent(incidents.filter((i) => i.risk_score > 0 && i.threat_type !== 'unknown').slice(0, 5))
  }, [incidents])

  useEffect(() => {
    const fn = () => setWinW(window.innerWidth)
    window.addEventListener('resize', fn, { passive: true })
    return () => window.removeEventListener('resize', fn)
  }, [])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const g = Globe()(el)
    g.width(el.offsetWidth)
      .height(el.offsetHeight)
      .backgroundColor('rgba(0,0,0,0)')
      .showAtmosphere(true)
      .atmosphereColor('#ffc174')
      .atmosphereAltitude(0.12)
      .showGraticules(true)
      .globeImageUrl('https://unpkg.com/three-globe/example/img/earth-dark.jpg')
      .bumpImageUrl(null)
      .pointsData([])
      .pointAltitude(0)
      .pointRadius(0.4)
      .pointColor('color')
      .pointsMerge(true)
      .pointLabel('label')
      .pointsTransitionDuration(1200)
      .ringsData([])
      .ringLat('lat')
      .ringLng('lng')
      .ringColor(() => '#ffc17460')
      .ringMaxRadius(3)
      .ringPropagationSpeed(1)
      .ringRepeatPeriod(1500)

    g.pointOfView({ lat: 10, lng: -75, altitude: 1.8 })
    g.controls().autoRotate      = true
    g.controls().autoRotateSpeed = 0.3
    g.controls().enableZoom      = false
    globeRef.current = g

    const ro = new ResizeObserver(() => {
      if (globeRef.current && el) {
        globeRef.current.width(el.clientWidth).height(el.clientHeight)
      }
    })
    ro.observe(el)

    return () => {
      ro.disconnect()
      globeRef.current = null
      while (el.firstChild) el.removeChild(el.firstChild)
    }
  }, [])

  useEffect(() => {
    if (globeRef.current && points.length > 0) {
      globeRef.current.pointsData(points).ringsData(points)
    }
  }, [points])

  return (
    <section style={{
      background: C.bg, borderTop: `1px solid ${C.border}`,
      display: 'flex',
      flexDirection: isMobile ? 'column-reverse' : 'row',
      height: isMobile ? 'auto' : 700,
      overflow: 'hidden',
    }}>
      {/* Sidebar */}
      <div style={{
        width: sidebarW, flexShrink: 0,
        padding: isMobile ? '32px 24px' : isTablet ? '0 40px' : '0 64px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        position: 'relative', zIndex: 10,
      }}>
        <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', color: C.accent, marginBottom: 20 }}>
          AMENAZAS EN TIEMPO REAL
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 28 }}>
          <span style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 52, color: C.accent, lineHeight: 1 }}>
            {points.length}
          </span>
          <span style={{ fontFamily: GEIST, fontSize: 13, color: C.muted }}>incidentes mapeados</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.map((inc) => (
            <div key={inc.id} style={{
              background: '#111111dd', border: `1px solid ${C.border}`,
              borderRadius: 6, padding: '8px 12px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 2 }}>
                <span style={{ fontFamily: MONO, fontSize: 10, color: scoreColor(inc.risk_score), letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                  {inc.threat_type}
                </span>
                <span style={{ fontFamily: MONO, fontSize: 13, fontWeight: 700, color: scoreColor(inc.risk_score) }}>
                  {inc.risk_score}
                </span>
              </div>
              <p style={{ fontFamily: MONO, fontSize: 10, color: '#444', marginTop: 1 }}>{inc.region ?? '—'}</p>
            </div>
          ))}
          {recent.length === 0 && (
            <p style={{ fontFamily: MONO, fontSize: 11, color: '#333' }}>Sin incidentes mapeados aún.</p>
          )}
        </div>
      </div>

      {/* Globe — pointer-events none prevents scroll capture */}
      <div style={{ flex: 1, position: 'relative', height: isMobile ? 380 : '100%' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }} />
        <div style={{
          position: 'absolute', top: 0, left: 0, width: 80, height: '100%', pointerEvents: 'none',
          background: `linear-gradient(to right, ${C.bg}, transparent)`,
        }} />
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowItWorks() {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.step-card').forEach((el) => {
        gsap.from(el, {
          x: 80, opacity: 0, duration: 0.75, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 80%', once: true, toggleActions: 'play none none none' },
        })
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} id="how" style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: '120px 64px' }}>
      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: C.accent, marginBottom: 16 }}>
        CÓMO FUNCIONA
      </p>
      <h2 style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 52, color: C.text, marginBottom: 64, lineHeight: 1.1 }}>
        Tres pasos para estar protegido.
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
        {STEPS.map(({ num, title, desc, Icon }) => (
          <div key={num} className="step-card" style={{
            position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', gap: 40,
            padding: '36px 48px',
            background: C.surface, borderLeft: `2px solid ${C.accent}`,
            borderTop: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
            borderRadius: 8,
          }}>
            {/* Watermark number */}
            <span style={{
              position: 'absolute', right: 40, top: '50%', transform: 'translateY(-50%)',
              fontFamily: HARMOND, fontWeight: 800, fontSize: 130, color: C.border,
              lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
            }}>
              {num}
            </span>
            <Icon style={{ color: C.accent, flexShrink: 0 }} width={22} height={22} />
            <div>
              <h3 style={{ fontFamily: HARMOND, fontWeight: 600, fontSize: 28, color: C.text, marginBottom: 10 }}>{title}</h3>
              <p style={{ fontFamily: GEIST, fontSize: 15, color: C.muted, lineHeight: 1.7, maxWidth: 580 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── What You Can Scan ────────────────────────────────────────────────────────

function ScanCard({ Icon, title, body }) {
  const cardRef = useRef(null)
  const iconRef = useRef(null)
  const [hovered, setHovered] = useState(false)

  const handleEnter = () => {
    setHovered(true)
    gsap.to(iconRef.current, { scale: 1.15, duration: 0.25, ease: 'power2.out' })
  }
  const handleLeave = () => {
    setHovered(false)
    gsap.to(iconRef.current, { scale: 1, duration: 0.2, ease: 'power2.in' })
  }

  return (
    <div
      ref={cardRef}
      onMouseEnter={handleEnter}
      onMouseLeave={handleLeave}
      style={{
        background: C.surface,
        border: `1px solid ${hovered ? C.accent : C.border}`,
        borderRadius: 8, padding: '36px 32px',
        transition: 'border-color .25s',
        cursor: 'default',
      }}
    >
      <div ref={iconRef} style={{ display: 'inline-flex', marginBottom: 20, color: hovered ? C.accent : C.muted, transition: 'color .25s' }}>
        <Icon width={24} height={24} />
      </div>
      <h3 style={{ fontFamily: HARMOND, fontWeight: 600, fontSize: 20, color: C.text, marginBottom: 12 }}>{title}</h3>
      <p style={{ fontFamily: GEIST, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{body}</p>
      <Link to="/app/scanner" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6,
        marginTop: 24, fontFamily: MONO, fontSize: 12, color: hovered ? C.accent : '#333',
        textDecoration: 'none', transition: 'color .25s',
      }}>
        Probar <ArrowRightIcon width={11} height={11} />
      </Link>
    </div>
  )
}

function WhatYouCanScan() {
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.scan-card-wrap').forEach((el, i) => {
        gsap.from(el, {
          opacity: 0, y: 28, duration: 0.65, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 80%', once: true, toggleActions: 'play none none none' },
          delay: i * 0.08,
        })
      })
    }, ref)
    return () => ctx.revert()
  }, [])

  return (
    <section ref={ref} style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: '120px 64px' }}>
      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: C.accent, marginBottom: 16 }}>
        QUÉ PUEDES ANALIZAR
      </p>
      <h2 style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 52, color: C.text, marginBottom: 64, lineHeight: 1.1 }}>
        Un escáner. Cuatro vectores.
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
        {SCAN_CARDS.map((c) => (
          <div key={c.title} className="scan-card-wrap">
            <ScanCard {...c} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  const btnRef = useRef(null)

  useEffect(() => {
    const tween = gsap.to(btnRef.current, {
      scale: 1.02, duration: 1.5, ease: 'sine.inOut',
      yoyo: true, repeat: -1, repeatDelay: 1.5,
    })
    return () => tween.kill()
  }, [])

  return (
    <section id="demo" style={{
      background: C.bg, borderTop: `1px solid ${C.border}`,
      padding: '160px 64px', textAlign: 'center',
    }}>
      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: C.accent, marginBottom: 28 }}>
        EMPIEZA AHORA
      </p>
      <h2 style={{ fontFamily: HARMOND, fontWeight: 800, fontStyle: 'italic', fontSize: 64, color: C.text, marginBottom: 20, lineHeight: 1.08 }}>
        ¿Recibiste algo sospechoso?
      </h2>
      <p style={{ fontFamily: GEIST, fontSize: 18, color: C.muted, marginBottom: 56 }}>
        Analízalo gratis. Sin registro. 100% anónimo.
      </p>
      <Link
        ref={btnRef}
        to="/app/scanner"
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          background: C.accent, color: '#080808',
          padding: '18px 52px', borderRadius: 6,
          fontFamily: HARMOND, fontWeight: 600, fontSize: 18,
          textDecoration: 'none',
        }}
      >
        Analizar ahora
        <ArrowRightIcon width={16} height={16} />
      </Link>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  const fLink = { color: C.muted, fontFamily: GEIST, fontSize: 13, textDecoration: 'none', display: 'block', transition: 'color .2s' }

  return (
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}`, padding: '56px 64px 40px' }}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 48, marginBottom: 48 }}>
        <div>
          <p style={{ fontFamily: HARMOND, fontWeight: 600, fontSize: 16, color: C.accent, letterSpacing: '0.12em', marginBottom: 8 }}>
            HACKLATAM
          </p>
          <p style={{ fontFamily: GEIST, fontSize: 12, color: C.muted }}>inteligencia de amenazas</p>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          {[['Dashboard', '/app'], ['Escáner', '/app/scanner'], ['Feed de Inteligencia', '/app/intelligence'], ['Alertas', '/app/alerts']].map(([label, to]) => (
            <Link key={to} to={to} style={fLink}
              onMouseEnter={(e) => { e.currentTarget.style.color = C.text }}
              onMouseLeave={(e) => { e.currentTarget.style.color = C.muted }}>
              {label}
            </Link>
          ))}
        </div>

        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12, color: C.muted }}>
            <GitHubLogoIcon width={14} height={14} />
            <span style={{ fontFamily: GEIST, fontSize: 13 }}>Open source · GitHub</span>
          </div>
          <p style={{ fontFamily: MONO, fontSize: 12, color: '#2e2e2e', lineHeight: 1.7 }}>
            Construido para DEF/ACC<br />hack@latam 2025
          </p>
        </div>
      </div>

      <div style={{ borderTop: `1px solid ${C.border}`, paddingTop: 24, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <p style={{ fontFamily: GEIST, fontSize: 11, color: '#2e2e2e' }}>© 2025 HackLatam</p>
        <p style={{ fontFamily: MONO, fontSize: 11, color: '#222' }}>v0.1.0-alpha</p>
      </div>
    </footer>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [stats, setStats]       = useState({ threats: null, campaigns: null, avgRisk: null })
  const [incidents, setIncidents] = useState([])

  useEffect(() => {
    const load = async () => {
      const [s, f] = await Promise.all([getStats(), getFeed({ limit: 60 })])
      if (s) setStats({
        threats:   s.total_24h,
        campaigns: s.active_campaigns,
        avgRisk:   s.avg_risk_score != null ? Number(s.avg_risk_score).toFixed(1) : null,
      })
      if (f) setIncidents(f)
    }
    load()
    const iv = setInterval(() => getFeed({ limit: 60 }).then((f) => { if (f) setIncidents(f) }), 30000)
    return () => clearInterval(iv)
  }, [])

  return (
    <div style={{ background: C.bg, color: C.text, fontFamily: GEIST, minHeight: '100vh' }}>
      <Nav />
      <HeroSection stats={stats} incidents={incidents} />
      <ProblemSection />
      <GlobeSection incidents={incidents} />
      <HowItWorks />
      <WhatYouCanScan />
      <FinalCTA />
      <Footer />
    </div>
  )
}
