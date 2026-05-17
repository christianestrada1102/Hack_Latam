import { NavLink, Link } from 'react-router-dom'
import { LayoutDashboard, ScanSearch, Radio, Bell } from 'lucide-react'
import { useLang } from '../lib/LanguageContext'

const NAV = [
  { to: '/app',                icon: LayoutDashboard, key: 'nav.dashboard' },
  { to: '/app/scanner',        icon: ScanSearch,      key: 'nav.scanner'   },
  { to: '/app/intelligence',   icon: Radio,           key: 'nav.intel'     },
  { to: '/app/alerts',         icon: Bell,            key: 'nav.alerts'    },
]

export default function Sidebar() {
  const { t } = useLang()

  return (
    <aside className="flex flex-col w-56 min-h-screen bg-[#1c1b1b] border-r border-[#262626] px-3 py-5 shrink-0">
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
            className={({ isActive }) =>
              `flex items-center gap-3 px-3 py-2 text-sm transition-colors border-l-2 ${
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
  )
}
