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
  LinkedInLogoIcon,
  TwitterLogoIcon,
  BellIcon,
  HeartIcon,
  CheckIcon,
} from '@radix-ui/react-icons'
import { getStats, getFeed } from '../lib/api'
import { useLang } from '../lib/LanguageContext'

gsap.registerPlugin(ScrollTrigger)

// ─── Design tokens ────────────────────────────────────────────────────────────

const C = {
  bg:      '#080808',
  surface: '#0f0f0f',
  border:  '#1a1a1a',
  accent:  '#ffc174',
  danger:  '#ef4444',
  text:    '#f0ede8',
  muted:   '#6b6560',
}

const HARMOND = "'Harmond', serif"
const GEIST   = "'Geist Variable', 'Geist', system-ui, sans-serif"
const MONO    = "'JetBrains Mono', 'Fira Code', monospace"
const OFFBIT  = "'OffBitTrial', monospace"

// ─── Static data (icons/numbers only — text comes from i18n) ─────────────────

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

const STAT_NUMS = [
  { end: 697000000, prefix: '', suffix: '' },
  { end: 13500000,  prefix: '', suffix: '' },
  { end: 9,         prefix: '', suffix: '%' },
  { end: 1326,      prefix: '', suffix: '' },
]

const STEP_ICONS = [
  { num: '01', Icon: UploadIcon },
  { num: '02', Icon: MagnifyingGlassIcon },
  { num: '03', Icon: LockClosedIcon },
  { num: '04', Icon: BellIcon },
]

const SCAN_CARD_ICONS = [UploadIcon, ChatBubbleIcon, Link2Icon, SpeakerLoudIcon]
const CTA_FEATURE_ICONS = [CheckIcon, LockClosedIcon, GlobeIcon, HeartIcon]

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
  return C.muted
}

function useWindowWidth() {
  const [w, setW] = useState(() => window.innerWidth)
  useEffect(() => {
    const fn = () => setW(window.innerWidth)
    window.addEventListener('resize', fn, { passive: true })
    return () => window.removeEventListener('resize', fn)
  }, [])
  return w
}

// ─── Nav ──────────────────────────────────────────────────────────────────────

const Nav = ({ navRef }) => {
  const { lang, toggle, t } = useLang()
  const [scrolled, setScrolled] = useState(false)

  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 50)
    window.addEventListener('scroll', fn, { passive: true })
    return () => window.removeEventListener('scroll', fn)
  }, [])

  const navLinks = [
    ['#problem', t('land.nav.problem')],
    ['#how',     t('land.nav.how')],
    ['#demo',    t('land.nav.demo')],
  ]

  return (
    <nav ref={navRef} style={{
      position: 'fixed', top: 0, left: 0, right: 0, zIndex: 200,
      height: 60, padding: '0 48px',
      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
      background: scrolled ? 'rgba(8,8,8,0.92)' : 'transparent',
      backdropFilter: scrolled ? 'blur(12px)' : 'none',
      WebkitBackdropFilter: scrolled ? 'blur(12px)' : 'none',
      borderBottom: '1px solid #1a1a1a',
      transition: 'background .3s',
    }}>
      <Link to="/" style={{ fontFamily: HARMOND, fontWeight: 600, fontSize: 15, color: C.accent, letterSpacing: '0.12em', textDecoration: 'none' }}>
        HAVEN
      </Link>

      <div style={{ display: 'flex', gap: 32, fontFamily: GEIST, fontSize: 13, color: C.muted }}>
        {navLinks.map(([href, label]) => (
          <a key={href} href={href}
            style={{ color: 'inherit', textDecoration: 'none', transition: 'color .2s' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.text }}
            onMouseLeave={(e) => { e.currentTarget.style.color = C.muted }}>
            {label}
          </a>
        ))}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
        <button
          onClick={toggle}
          aria-label="Toggle language"
          style={{ display: 'flex', alignItems: 'center', gap: 4, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontFamily: MONO, fontSize: 11, letterSpacing: '0.1em' }}>
          <span style={{ color: lang === 'es' ? C.accent : '#555', fontWeight: lang === 'es' ? 600 : 400, transition: 'color .2s' }}>ES</span>
          <span style={{ color: '#2a2a2a' }}>|</span>
          <span style={{ color: lang === 'en' ? C.accent : '#555', fontWeight: lang === 'en' ? 600 : 400, transition: 'color .2s' }}>EN</span>
        </button>
        <Link to="/app"
          style={{ border: '1px solid #2a2a2a', color: C.text, padding: '7px 18px', borderRadius: 4, fontFamily: GEIST, fontSize: 13, textDecoration: 'none', transition: 'border-color .2s, color .2s' }}
          onMouseEnter={(e) => { e.currentTarget.style.borderColor = C.accent; e.currentTarget.style.color = C.accent }}
          onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#2a2a2a'; e.currentTarget.style.color = C.text }}>
          {t('land.nav.openApp')}
        </Link>
      </div>
    </nav>
  )
}

// ─── Hero + Globe intro ───────────────────────────────────────────────────────

function HeroSection({ stats, incidents, navRef }) {
  const { t } = useLang()
  const contentRef   = useRef(null)
  const globeWrapRef = useRef(null)
  const globeElRef   = useRef(null)
  const globeRef     = useRef(null)
  const introPlayed  = useRef(false)
  const line1 = useRef(null)
  const line2 = useRef(null)
  const line3 = useRef(null)
  const subRef  = useRef(null)
  const ctaRef  = useRef(null)
  const statRef = useRef(null)

  const winW = useWindowWidth()
  const headSize = winW < 768 ? 32 : winW < 1024 ? 42 : 56

  const points = useMemo(() => incidents
    .filter((i) => i.risk_score > 0 && i.threat_type !== 'unknown')
    .map((inc) => {
      const coords = geocode(inc.region)
      if (!coords) return null
      return {
        lat:         coords[0],
        lng:         coords[1],
        color:       inc.risk_score >= 80 ? '#ef4444' : inc.risk_score >= 60 ? '#ffc174' : '#6b6560',
        threat_type: inc.threat_type,
        region:      inc.region,
        risk_score:  inc.risk_score,
      }
    })
    .filter(Boolean), [incidents])

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
      .pointRadius(d => d.risk_score >= 80 ? 0.5 : 0.4)
      .pointColor('color')
      .pointsMerge(false)
      .pointLabel(d => `<div style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:4px;padding:8px 12px;font-family:'Geist',sans-serif;font-size:12px;color:#f0ede8;pointer-events:none"><div style="color:#ffc174;font-size:10px;letter-spacing:0.08em;margin-bottom:4px">${d.threat_type?.toUpperCase()}</div><div style="color:#f0ede8;margin-bottom:2px">${d.region || 'LATAM'}</div><div style="color:#6b6560;font-size:11px">Riesgo: <span style="color:${d.risk_score >= 80 ? '#ef4444' : '#ffc174'}">${d.risk_score}/100</span></div></div>`)
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
    g.controls().autoRotateSpeed = 3
    g.controls().enableDamping   = true
    g.controls().dampingFactor   = 0.05
    g.controls().enableZoom      = false
    globeRef.current = g

    g.onPointHover(point => { console.log('[Globe] hover:', point) })
    const tooltipEl = el.querySelector('.scene-tooltip')
    if (tooltipEl) {
      tooltipEl.style.zIndex = '9999'
      tooltipEl.style.pointerEvents = 'none'
    }

    const speedObj = { v: 3 }
    gsap.to(speedObj, {
      delay: 0.6, v: 0.3, duration: 1.2, ease: 'power2.out',
      onUpdate: () => { if (globeRef.current) globeRef.current.controls().autoRotateSpeed = speedObj.v },
    })

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

  useEffect(() => {
    if (introPlayed.current) return
    introPlayed.current = true

    const wrap    = globeWrapRef.current
    const content = contentRef.current
    const nav     = navRef?.current
    if (!wrap || !content) return

    gsap.set(nav,     { opacity: 0, y: -10 })
    gsap.set(content, { opacity: 0, x: -40 })

    const tl = gsap.timeline()
    tl.to(nav, { opacity: 1, y: 0, duration: 0.4, ease: 'power2.out' }, 1.0)
    tl.to(wrap, { left: '45%', width: '55%', duration: 1.1, ease: 'power2.inOut', force3D: true, roundProps: 'x,y' }, 1.25)
    tl.to(content, { opacity: 1, x: 0, duration: 0.9, ease: 'power3.out' }, 1.55)
    tl.from([line1.current, line2.current, line3.current], {
      y: 50, duration: 0.75, stagger: 0.12, ease: 'power3.out',
    }, 1.7)
    tl.from(subRef.current,  { opacity: 0, y: 18, duration: 0.55, ease: 'power2.out' }, 2.1)
    tl.from(ctaRef.current,  { opacity: 0, y: 14, duration: 0.45, ease: 'power2.out' }, 2.25)
    tl.from(statRef.current, { opacity: 0, duration: 0.35 }, 2.5)
  }, [navRef])

  return (
    <section style={{ position: 'relative', height: '100vh', overflow: 'hidden', background: C.bg }}>
      <div ref={globeWrapRef} style={{
        position: 'absolute', top: 0, left: 0,
        width: '100%', height: '100%',
        pointerEvents: 'none', zIndex: 1, willChange: 'transform',
      }}>
        <div ref={globeElRef} style={{ width: '100%', height: '100%', pointerEvents: 'auto', overflow: 'visible' }} />
        <div style={{
          position: 'absolute', inset: 0, pointerEvents: 'none',
          background: `linear-gradient(to right, ${C.bg} 0%, ${C.bg}cc 28%, transparent 60%)`,
        }} />
      </div>

      <div ref={contentRef} style={{
        position: 'absolute', top: 0, left: 0,
        width: '50%', height: '100%',
        zIndex: 10, display: 'flex', alignItems: 'center',
        padding: '80px 0 0 64px', pointerEvents: 'auto',
      }}>
        <div style={{ maxWidth: 520 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 24 }}>
            <GlobeIcon style={{ color: C.accent, flexShrink: 0 }} width={13} height={13} />
            <span style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: C.accent }}>
              {t('land.hero.eyebrow')}
            </span>
          </div>

          <h1 style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: headSize, lineHeight: 1.05, marginBottom: 24 }}>
            <div style={{ overflow: 'hidden' }}>
              <div ref={line1} style={{ color: C.text }}>{t('land.hero.line1')}</div>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div ref={line2} style={{ color: C.text }}>{t('land.hero.line2')}</div>
            </div>
            <div style={{ overflow: 'hidden' }}>
              <div ref={line3} style={{ color: C.accent }}>{t('land.hero.line3')}</div>
            </div>
          </h1>

          <p ref={subRef} style={{ fontFamily: GEIST, fontSize: 16, color: C.muted, maxWidth: 420, lineHeight: 1.7, marginBottom: 32 }}>
            {t('land.hero.sub')}
          </p>

          <div ref={ctaRef} style={{ display: 'flex', gap: 12, marginBottom: 32, flexWrap: 'wrap' }}>
            <Link to="/app/scanner" style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: C.accent, color: '#080808',
              padding: '13px 26px', borderRadius: 4,
              fontFamily: GEIST, fontWeight: 700, fontSize: 14, textDecoration: 'none',
            }}>
              {t('land.hero.cta1')}
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
              {t('land.hero.cta2')}
            </Link>
          </div>

          <div ref={statRef} style={{ fontFamily: MONO, fontSize: 12, color: '#333' }}>
            <span style={{ fontFamily: OFFBIT, fontSize: 14, color: C.accent }}>{stats.threats ?? '—'}</span>
            <span> {t('land.hero.threats')} · </span>
            <span style={{ fontFamily: OFFBIT, fontSize: 14, color: C.accent }}>{stats.campaigns ?? '—'}</span>
            <span> {t('land.hero.campaigns')} · avg </span>
            <span style={{ fontFamily: OFFBIT, fontSize: 14, color: C.accent }}>{stats.avgRisk ?? '—'}</span>
          </div>
        </div>
      </div>
    </section>
  )
}

// ─── Problem ──────────────────────────────────────────────────────────────────

function ProblemSection() {
  const { t } = useLang()
  const ref = useRef(null)

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.stat-row').forEach((el, i) => {
        gsap.from(el, {
          opacity: 0, x: -24, duration: 0.65, ease: 'power3.out',
          scrollTrigger: { trigger: el, start: 'top 80%', once: true },
          delay: i * 0.1,
        })
      })

      document.querySelectorAll('.stat-num').forEach((el) => {
        const end    = parseFloat(el.dataset.end)
        const prefix = el.dataset.prefix || ''
        el.textContent = prefix + '0'
        const obj = { v: 0 }
        ScrollTrigger.create({
          trigger: el, start: 'top 80%', once: true,
          onEnter() {
            gsap.to(obj, {
              v: end, duration: 2.2, ease: 'power2.out',
              onUpdate() {
                el.textContent = prefix + Math.round(obj.v).toLocaleString('es-MX')
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
      <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: C.accent, marginBottom: 16 }}>
        {t('land.problem.eyebrow')}
      </p>
      <h2 style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 56, color: C.text, marginBottom: 72, lineHeight: 1.08 }}>
        {t('land.problem.title')}
      </h2>

      <div style={{ maxWidth: 900 }}>
        {STAT_NUMS.map(({ end, prefix, suffix }, i) => (
          <div key={i} className="stat-row" style={{
            display: 'flex', alignItems: 'center', gap: 40,
            padding: '32px 0',
            borderBottom: i < STAT_NUMS.length - 1 ? `1px solid #0f0f0f` : 'none',
          }}>
            <div style={{ flexShrink: 0, minWidth: 220, lineHeight: 1 }}>
              <span
                className="stat-num"
                data-end={end} data-prefix={prefix} data-suffix={suffix}
                style={{ fontFamily: OFFBIT, fontWeight: 'bold', fontSize: 48, color: C.accent }}
              />
              {suffix && (
                <span style={{ fontFamily: MONO, fontWeight: 700, fontSize: 36, color: C.accent }}>{suffix}</span>
              )}
            </div>
            <div style={{ width: 1, alignSelf: 'stretch', background: C.border, flexShrink: 0 }} />
            <div>
              <p style={{ fontFamily: GEIST, fontSize: 15, color: C.text, marginBottom: 6, lineHeight: 1.4 }}>{t(`land.stat${i}.label`)}</p>
              <p style={{ fontFamily: GEIST, fontSize: 13, color: '#333', lineHeight: 1.5 }}>{t(`land.stat${i}.ctx`)}</p>
            </div>
          </div>
        ))}
      </div>

      <p style={{ fontFamily: MONO, fontSize: 11, color: '#2a2a2a', marginTop: 48 }}>
        {t('land.problem.source')}
      </p>
    </section>
  )
}

// ─── Globe section ────────────────────────────────────────────────────────────

function GlobeSection({ incidents }) {
  const { t } = useLang()
  const containerRef = useRef(null)
  const globeRef     = useRef(null)
  const [recent, setRecent] = useState([])
  const winW    = useWindowWidth()
  const isMobile = winW < 768
  const isTablet = winW >= 768 && winW < 1024
  const sidebarW = isMobile ? '100%' : isTablet ? '40%' : '35%'

  const points = useMemo(() => incidents
    .filter((i) => i.risk_score > 0 && i.threat_type !== 'unknown')
    .map((inc) => {
      const coords = geocode(inc.region)
      if (!coords) return null
      return {
        lat:         coords[0],
        lng:         coords[1],
        color:       inc.risk_score >= 80 ? '#ef4444' : inc.risk_score >= 60 ? '#ffc174' : '#6b6560',
        threat_type: inc.threat_type,
        region:      inc.region,
        risk_score:  inc.risk_score,
      }
    })
    .filter(Boolean), [incidents])

  useEffect(() => {
    setRecent(incidents.filter((i) => i.risk_score > 0 && i.threat_type !== 'unknown').slice(0, 5))
  }, [incidents])

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
      .pointRadius(d => d.risk_score >= 80 ? 0.5 : 0.4)
      .pointColor('color')
      .pointsMerge(false)
      .pointLabel(d => `<div style="background:#0f0f0f;border:1px solid #2a2a2a;border-radius:4px;padding:8px 12px;font-family:'Geist',sans-serif;font-size:12px;color:#f0ede8;pointer-events:none"><div style="color:#ffc174;font-size:10px;letter-spacing:0.08em;margin-bottom:4px">${d.threat_type?.toUpperCase()}</div><div style="color:#f0ede8;margin-bottom:2px">${d.region || 'LATAM'}</div><div style="color:#6b6560;font-size:11px">Riesgo: <span style="color:${d.risk_score >= 80 ? '#ef4444' : '#ffc174'}">${d.risk_score}/100</span></div></div>`)
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

    g.onPointHover(point => { console.log('[Globe] hover:', point) })
    const tooltipEl = el.querySelector('.scene-tooltip')
    if (tooltipEl) {
      tooltipEl.style.zIndex = '9999'
      tooltipEl.style.pointerEvents = 'none'
    }

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
      <div style={{
        width: sidebarW, flexShrink: 0,
        padding: isMobile ? '32px 24px' : isTablet ? '0 40px' : '0 64px',
        display: 'flex', flexDirection: 'column', justifyContent: 'center',
        position: 'relative', zIndex: 10,
      }}>
        <p style={{ fontFamily: MONO, fontSize: 10, letterSpacing: '0.2em', color: C.accent, marginBottom: 20 }}>
          {t('land.globe.eyebrow')}
        </p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 28 }}>
          <span style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 52, color: C.accent, lineHeight: 1 }}>
            {points.length}
          </span>
          <span style={{ fontFamily: GEIST, fontSize: 13, color: C.muted }}>{t('land.globe.mapped')}</span>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {recent.map((inc) => (
            <div key={inc.id} style={{ background: '#111111dd', border: `1px solid ${C.border}`, borderRadius: 6, padding: '8px 12px' }}>
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
            <p style={{ fontFamily: MONO, fontSize: 11, color: '#333' }}>{t('land.globe.empty')}</p>
          )}
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', height: isMobile ? 380 : '100%' }}>
        <div ref={containerRef} style={{ position: 'absolute', inset: 0, pointerEvents: 'auto', overflow: 'visible' }} />
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
  const { t } = useLang()
  const ref = useRef(null)

  const steps = STEP_ICONS.map((s, i) => ({
    ...s,
    title: t(`land.step${i}.title`),
    desc:  t(`land.step${i}.desc`),
  }))

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
        {t('land.how.eyebrow')}
      </p>
      <h2 style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 52, color: C.text, marginBottom: 64, lineHeight: 1.1 }}>
        {t('land.how.title')}
      </h2>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
        {steps.map(({ num, title, desc, Icon }) => (
          <div key={num} className="step-card" style={{
            position: 'relative', overflow: 'hidden',
            display: 'flex', alignItems: 'center', gap: 40,
            padding: '36px 48px',
            background: C.surface,
            borderLeft: `2px solid ${C.accent}`,
            borderTop: `1px solid ${C.border}`, borderRight: `1px solid ${C.border}`, borderBottom: `1px solid ${C.border}`,
            borderRadius: 8,
          }}>
            <span style={{
              position: 'absolute', right: 36, top: '50%', transform: 'translateY(-50%)',
              fontFamily: HARMOND, fontWeight: 800, fontSize: 120, color: C.border,
              lineHeight: 1, userSelect: 'none', pointerEvents: 'none',
            }}>
              {num}
            </span>
            <Icon style={{ color: C.accent, flexShrink: 0 }} width={22} height={22} />
            <div>
              <h3 style={{ fontFamily: HARMOND, fontWeight: 600, fontSize: 26, color: C.text, marginBottom: 10 }}>{title}</h3>
              <p style={{ fontFamily: GEIST, fontSize: 15, color: C.muted, lineHeight: 1.75, maxWidth: 600 }}>{desc}</p>
            </div>
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── What You Can Scan ────────────────────────────────────────────────────────

function ScanCard({ Icon, title, body, tryLabel }) {
  const iconRef = useRef(null)
  const [hovered, setHovered] = useState(false)

  return (
    <div
      onMouseEnter={() => { setHovered(true);  gsap.to(iconRef.current, { scale: 1.15, duration: 0.25, ease: 'power2.out' }) }}
      onMouseLeave={() => { setHovered(false); gsap.to(iconRef.current, { scale: 1,    duration: 0.2,  ease: 'power2.in'  }) }}
      style={{
        background: C.surface, border: `1px solid ${hovered ? C.accent : C.border}`,
        borderRadius: 8, padding: '36px 32px', transition: 'border-color .25s', cursor: 'default',
      }}
    >
      <div ref={iconRef} style={{ display: 'inline-flex', marginBottom: 20, color: hovered ? C.accent : C.muted, transition: 'color .25s' }}>
        <Icon width={24} height={24} />
      </div>
      <h3 style={{ fontFamily: HARMOND, fontWeight: 600, fontSize: 20, color: C.text, marginBottom: 12 }}>{title}</h3>
      <p style={{ fontFamily: GEIST, fontSize: 14, color: C.muted, lineHeight: 1.7 }}>{body}</p>
      <Link to="/app/scanner" style={{
        display: 'inline-flex', alignItems: 'center', gap: 6, marginTop: 24,
        fontFamily: MONO, fontSize: 12, color: hovered ? C.accent : '#333',
        textDecoration: 'none', transition: 'color .25s',
      }}>
        {tryLabel} <ArrowRightIcon width={11} height={11} />
      </Link>
    </div>
  )
}

function WhatYouCanScan() {
  const { t } = useLang()
  const ref = useRef(null)

  const scanCards = SCAN_CARD_ICONS.map((Icon, i) => ({
    Icon,
    title: t(`land.card${i}.title`),
    body:  t(`land.card${i}.body`),
  }))
  const tryLabel = t('land.scan.try')

  useEffect(() => {
    const ctx = gsap.context(() => {
      gsap.utils.toArray('.scan-card-wrap').forEach((el, i) => {
        gsap.from(el, {
          opacity: 0, y: 24, duration: 0.6, ease: 'power3.out',
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
        {t('land.scan.eyebrow')}
      </p>
      <h2 style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 52, color: C.text, marginBottom: 64, lineHeight: 1.1 }}>
        {t('land.scan.title')}
      </h2>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2,1fr)', gap: 20 }}>
        {scanCards.map((c, i) => (
          <div key={i} className="scan-card-wrap">
            <ScanCard {...c} tryLabel={tryLabel} />
          </div>
        ))}
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function FinalCTA() {
  const { lang, t } = useLang()
  const sectionRef = useRef(null)
  const glowRef    = useRef(null)
  const btnRef     = useRef(null)

  const ctaFeatures = CTA_FEATURE_ICONS.map((Icon, i) => ({ Icon, label: t(`land.feat${i}`) }))

  useEffect(() => {
    const section = sectionRef.current
    const glow    = glowRef.current
    if (!section || !glow) return

    const onMove = (e) => {
      const rect = section.getBoundingClientRect()
      const x = e.clientX - rect.left - rect.width  / 2
      const y = e.clientY - rect.top  - rect.height / 2
      gsap.to(glow, { x: x * 0.15, y: y * 0.15, duration: 0.6, ease: 'power2.out' })
    }
    section.addEventListener('mousemove', onMove)
    return () => section.removeEventListener('mousemove', onMove)
  }, [])

  useEffect(() => {
    const tween = gsap.to(btnRef.current, {
      scale: 1.02, duration: 1.5, ease: 'sine.inOut',
      yoyo: true, repeat: -1, repeatDelay: 1.5,
    })
    return () => tween.kill()
  }, [])

  return (
    <section ref={sectionRef} id="demo" style={{
      position: 'relative', overflow: 'hidden',
      background: C.bg, borderTop: `1px solid ${C.border}`,
      padding: '140px 64px',
    }}>
      <div ref={glowRef} style={{
        position: 'absolute', top: '50%', left: '50%',
        transform: 'translate(-50%,-50%)',
        width: 600, height: 600, borderRadius: '50%',
        background: 'radial-gradient(circle, rgba(255,193,116,0.05) 0%, transparent 70%)',
        pointerEvents: 'none',
      }} />

      <div style={{ position: 'relative', display: 'flex', gap: 80, alignItems: 'center' }}>
        <div style={{ flex: '0 0 60%' }}>
          <p style={{ fontFamily: MONO, fontSize: 11, letterSpacing: '0.18em', color: C.accent, marginBottom: 24 }}>
            {t('land.cta.eyebrow')}
          </p>
          <h2 style={{ fontFamily: HARMOND, fontWeight: 800, fontStyle: 'italic', fontSize: 52, color: C.text, marginBottom: 20, lineHeight: 1.08 }}>
            <div>
              {lang === 'es' && <span style={{ fontFamily: 'Georgia, serif' }}>¿</span>}
              {t('land.cta.titleLine1')}
            </div>
            <div>
              {t('land.cta.titleLine2')}<span style={{ fontFamily: 'Georgia, serif' }}>?</span>
            </div>
          </h2>
          <p style={{ fontFamily: GEIST, fontSize: 16, color: C.muted, maxWidth: 480, lineHeight: 1.75, marginBottom: 44 }}>
            {t('land.cta.sub')}
          </p>
          <Link
            ref={btnRef}
            to="/app/scanner"
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 10,
              background: C.accent, color: '#080808',
              padding: '16px 36px', borderRadius: 4,
              fontFamily: HARMOND, fontWeight: 600, fontSize: 16,
              textDecoration: 'none',
            }}
          >
            {t('land.cta.btn')}
            <ArrowRightIcon width={16} height={16} />
          </Link>
        </div>

        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          {ctaFeatures.map(({ Icon, label }, i) => (
            <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
              <Icon style={{ color: C.accent, flexShrink: 0 }} width={16} height={16} />
              <span style={{ fontFamily: GEIST, fontSize: 14, color: C.muted }}>{label}</span>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: C.bg, borderTop: `1px solid ${C.border}` }}>
      <div style={{
        maxWidth: 1152, margin: '0 auto', padding: '24px 32px',
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <p style={{ fontFamily: GEIST, fontSize: 13, color: '#333' }}>
          © 2026{' '}
          <span style={{ color: '#a08e7a', fontWeight: 500 }}>Christian Estrada</span>
        </p>
        <div style={{ display: 'flex', gap: 16, alignItems: 'center' }}>
          <a href="https://github.com/christianestrada1102" target="_blank" rel="noopener noreferrer"
            style={{ color: '#444', transition: 'color .2s', display: 'flex' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.text }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#444' }}>
            <GitHubLogoIcon width={15} height={15} />
          </a>
          <a href="https://linkedin.com/in/christianestrada" target="_blank" rel="noopener noreferrer"
            style={{ color: '#444', transition: 'color .2s', display: 'flex' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = C.text }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#444' }}>
            <LinkedInLogoIcon width={15} height={15} />
          </a>
        </div>
      </div>
      <p style={{ fontFamily: GEIST, fontSize: 11, color: '#222', textAlign: 'center', paddingBottom: 16 }}>
        HAVEN · DEF/ACC · hack@latam 2025
      </p>
    </footer>
  )
}

// ─── Root ─────────────────────────────────────────────────────────────────────

export default function Landing() {
  const [stats, setStats]         = useState({ threats: null, campaigns: null, avgRisk: null })
  const [incidents, setIncidents] = useState([])
  const navRef = useRef(null)

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
      <Nav navRef={navRef} />
      <HeroSection stats={stats} incidents={incidents} navRef={navRef} />
      <ProblemSection />
      <GlobeSection incidents={incidents} />
      <HowItWorks />
      <WhatYouCanScan />
      <FinalCTA />
      <Footer />
    </div>
  )
}
