import { NavLink } from 'react-router-dom'
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
        <span className="font-mono text-sm font-semibold tracking-widest text-amber-400 uppercase">
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
        <p className="text-[10px] text-neutral-600 font-mono">v0.1.0-alpha</p>
      </div>
    </aside>
  )
}
