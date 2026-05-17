import { useLocation } from 'react-router-dom'
import { Shield } from 'lucide-react'
import { useLang } from '../lib/LanguageContext'

export default function Header() {
  const { pathname } = useLocation()
  const { lang, toggle, t } = useLang()
  const normalizedPath = pathname.replace(/^\/app/, '') || '/'
  const title = t(`page.${normalizedPath}`) || 'HackLatam'

  return (
    <header className="flex items-center justify-between px-6 h-12 border-b border-[#262626] bg-[#131313] shrink-0">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-neutral-500" strokeWidth={1.5} />
        <span className="text-sm text-neutral-300 font-medium">{title}</span>
      </div>

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
    </header>
  )
}
