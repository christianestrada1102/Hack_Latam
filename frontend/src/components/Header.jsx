import { useRef, useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { BellIcon } from '@radix-ui/react-icons'
import gsap from 'gsap'
import { useLang } from '../lib/LanguageContext'
import AlertsModal from './AlertsModal'

export default function Header({ menuOpen, onMenuToggle }) {
  const { pathname } = useLocation()
  const { lang, toggle, t } = useLang()
  const normalizedPath = pathname.replace(/^\/app/, '') || '/'
  const title = t(`page.${normalizedPath}`) || 'HAVEN'

  const [showAlerts, setShowAlerts] = useState(false)

  const line1 = useRef(null)
  const line2 = useRef(null)
  const line3 = useRef(null)

  useEffect(() => {
    if (!line1.current) return
    if (menuOpen) {
      gsap.to(line1.current, { rotation: 45, y: 7, duration: 0.3, ease: 'power2.inOut', transformOrigin: 'center' })
      gsap.to(line2.current, { opacity: 0, duration: 0.15 })
      gsap.to(line3.current, { rotation: -45, y: -7, duration: 0.3, ease: 'power2.inOut', transformOrigin: 'center' })
    } else {
      gsap.to(line1.current, { rotation: 0, y: 0, duration: 0.3, ease: 'power2.inOut' })
      gsap.to(line2.current, { opacity: 1, duration: 0.2 })
      gsap.to(line3.current, { rotation: 0, y: 0, duration: 0.3, ease: 'power2.inOut' })
    }
  }, [menuOpen])

  return (
    <header className="relative flex items-center justify-between px-4 md:px-6 h-12 border-b border-[#262626] bg-[#131313] shrink-0">
      {/* Left: hamburger (mobile) or shield + title (desktop) */}
      <div className="flex items-center gap-2">
        <button
          onClick={onMenuToggle}
          className="md:hidden flex flex-col justify-center gap-[5px] w-8 h-8 -ml-1 shrink-0"
          aria-label="Toggle menu"
        >
          <span ref={line1} className="block w-5 h-[1.5px] bg-neutral-400 origin-center" />
          <span ref={line2} className="block w-5 h-[1.5px] bg-neutral-400" />
          <span ref={line3} className="block w-5 h-[1.5px] bg-neutral-400 origin-center" />
        </button>
        <Shield size={14} className="hidden md:block text-neutral-500" strokeWidth={1.5} />
        <span className="hidden md:block text-sm text-neutral-300 font-medium">{title}</span>
      </div>

      {/* Center: brand on mobile */}
      <span className="md:hidden absolute left-1/2 -translate-x-1/2 text-sm font-semibold text-neutral-300 pointer-events-none">
        HAVEN
      </span>

      {/* Right: bell + ES/EN toggle */}
      <div className="flex items-center gap-3">
        <button
          onClick={() => setShowAlerts(true)}
          className="flex items-center justify-center transition-colors hover:text-neutral-300"
          style={{ color: '#555' }}
          aria-label="Recibir alertas SMS"
          title="Recibir alertas SMS"
        >
          <BellIcon style={{ width: 14, height: 14 }} />
        </button>

        <button
          onClick={toggle}
          className="flex items-center gap-1 font-mono text-[11px] tracking-widest"
          aria-label="Toggle language"
        >
          <span className={lang === 'es' ? 'text-amber-400 font-semibold' : 'text-neutral-600 hover:text-neutral-400'}>
            ES
          </span>
          <span className="text-neutral-700">|</span>
          <span className={lang === 'en' ? 'text-amber-400 font-semibold' : 'text-neutral-600 hover:text-neutral-400'}>
            EN
          </span>
        </button>
      </div>

      {showAlerts && <AlertsModal onClose={() => setShowAlerts(false)} />}
    </header>
  )
}
