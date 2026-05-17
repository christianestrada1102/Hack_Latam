import { useEffect, useRef } from 'react'
import { NavLink, Link } from 'react-router-dom'
import { LayoutDashboard, ScanSearch, Radio, Bell } from 'lucide-react'
import gsap from 'gsap'
import { useLang } from '../lib/LanguageContext'

const NAV = [
  { to: '/app',                icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/app/scanner',        icon: ScanSearch,      key: 'nav.scanner'   },
  { to: '/app/intelligence',   icon: Radio,           key: 'nav.intel'     },
  { to: '/app/alerts',         icon: Bell,            key: 'nav.alerts'    },
]

export default function Sidebar({ open, onClose }) {
  const { t } = useLang()
  const sidebarRef = useRef(null)
  const overlayRef = useRef(null)

  // Set initial off-screen position on mobile
  useEffect(() => {
    if (window.innerWidth < 768) {
      gsap.set(sidebarRef.current, { x: '-100%' })
    }
    // Clear GSAP transform on desktop resize so CSS takes over
    const handleResize = () => {
      if (window.innerWidth >= 768 && sidebarRef.current) {
        gsap.set(sidebarRef.current, { clearProps: 'transform,x' })
        if (overlayRef.current) gsap.set(overlayRef.current, { opacity: 0, pointerEvents: 'none' })
      }
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  // Animate open/close on mobile
  useEffect(() => {
    if (window.innerWidth >= 768) return
    const sidebar = sidebarRef.current
    const overlay = overlayRef.current

    if (open) {
      gsap.to(sidebar, { x: 0, duration: 0.4, ease: 'power2.out' })
      gsap.to(overlay, { opacity: 1, pointerEvents: 'auto', duration: 0.3 })
      gsap.fromTo(
        sidebar.querySelectorAll('.nav-item'),
        { opacity: 0, x: -20 },
        { opacity: 1, x: 0, duration: 0.3, stagger: 0.06, delay: 0.15 }
      )
    } else {
      gsap.to(sidebar, { x: '-100%', duration: 0.3, ease: 'power2.in' })
      gsap.to(overlay, { opacity: 0, pointerEvents: 'none', duration: 0.3 })
    }
  }, [open])

  return (
    <>
      {/* Dark overlay — mobile only */}
      <div
        ref={overlayRef}
        className="md:hidden fixed inset-0 z-40"
        style={{ background: 'rgba(0,0,0,0.85)', opacity: 0, pointerEvents: 'none' }}
        onClick={onClose}
      />

      <aside
        ref={sidebarRef}
        className="fixed md:static top-0 left-0 z-50 md:z-auto flex flex-col w-56 h-screen bg-[#1c1b1b] border-r border-[#262626] px-3 py-5 shrink-0"
      >
        <div className="px-2 mb-8">
          <span style={{ fontFamily: 'Harmond, serif', fontWeight: 800, color: '#ffc174', fontSize: '20px', letterSpacing: '0.05em' }}>
            HAVEN
          </span>
          <p className="text-[10px] text-neutral-500 mt-0.5 font-mono">
            {t('nav.tagline')}
          </p>
        </div>

        <nav className="flex flex-col gap-0.5">
          {NAV.map(({ to, icon: Icon, key }) => (
            <NavLink
              key={to}
              to={to}
              end={to === '/app'}
              onClick={() => { if (window.innerWidth < 768) onClose() }}
              className={({ isActive }) =>
                `nav-item flex items-center gap-3 px-3 py-2 text-sm transition-colors border-l-2 ${
                  isActive
                    ? 'border-amber-400 bg-amber-400/5 text-amber-400 font-medium'
                    : 'border-transparent text-neutral-400 hover:text-neutral-200 hover:bg-[#201f1f]'
                }`
              }
            >
              <Icon size={15} strokeWidth={1.5} />
              {t(key)}
            </NavLink>
          ))}
        </nav>

        <div className="mt-auto px-2 pt-4 border-t border-[#262626]">
          <Link
            to="/"
            style={{ fontSize: 12, color: '#666', textDecoration: 'none', display: 'block', marginBottom: 8, paddingTop: 12, borderTop: '1px solid #1a1a1a', transition: 'color 200ms' }}
            onMouseEnter={(e) => { e.currentTarget.style.color = '#ffc174' }}
            onMouseLeave={(e) => { e.currentTarget.style.color = '#666' }}
          >
            ← Volver a HAVEN
          </Link>
          <p style={{ fontFamily: 'OffBitTrial, monospace', fontSize: '10px', color: '#a08e7a', letterSpacing: '0.05em', whiteSpace: 'nowrap', overflow: 'hidden' }}>HAVEN · DEF/ACC · hack@latam 2026</p>
        </div>
      </aside>
    </>
  )
}
