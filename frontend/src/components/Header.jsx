import { useLocation } from 'react-router-dom'
import { Shield } from 'lucide-react'

const TITLES = {
  '/':             'Dashboard',
  '/scanner':      'Threat Scanner',
  '/intelligence': 'Intelligence Feed',
  '/alerts':       'Alerts',
}

export default function Header() {
  const { pathname } = useLocation()
  const title = TITLES[pathname] ?? 'HackLatam'

  return (
    <header className="flex items-center justify-between px-6 h-12 border-b border-[#262626] bg-[#131313] shrink-0">
      <div className="flex items-center gap-2">
        <Shield size={14} className="text-neutral-500" strokeWidth={1.5} />
        <span className="text-sm text-neutral-300 font-medium">{title}</span>
      </div>

      <div className="flex items-center gap-2">
        <span className="relative flex h-2 w-2">
          <span className="live-pulse absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75" />
          <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400" />
        </span>
        <span className="text-[11px] font-mono text-amber-400 uppercase tracking-widest">
          Live
        </span>
      </div>
    </header>
  )
}
