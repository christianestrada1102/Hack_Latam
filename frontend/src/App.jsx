import { useEffect, useState } from 'react'
import { Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './lib/LanguageContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import RotatePrompt from './components/RotatePrompt'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ThreatScanner from './pages/ThreatScanner'
import IntelligenceFeed from './pages/IntelligenceFeed'
import Alerts from './pages/Alerts'

function AppLayout() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isMobilePortrait, setIsMobilePortrait] = useState(
    () => window.innerWidth < 768 && window.innerHeight > window.innerWidth
  )

  useEffect(() => {
    const update = () => {
      setIsMobilePortrait(window.innerWidth < 768 && window.innerHeight > window.innerWidth)
    }
    window.addEventListener('resize', update)
    window.addEventListener('orientationchange', update)
    return () => {
      window.removeEventListener('resize', update)
      window.removeEventListener('orientationchange', update)
    }
  }, [])

  if (isMobilePortrait && !dismissed) {
    return <RotatePrompt onDismiss={() => setDismissed(true)} />
  }

  return (
    <div className="flex h-screen bg-[#131313] overflow-hidden">
      <Sidebar open={menuOpen} onClose={() => setMenuOpen(false)} />
      <div className="flex flex-col flex-1 min-w-0">
        <Header menuOpen={menuOpen} onMenuToggle={() => setMenuOpen((o) => !o)} />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route index               element={<Dashboard />} />
            <Route path="scanner"      element={<ThreatScanner />} />
            <Route path="intelligence" element={<IntelligenceFeed />} />
            <Route path="alerts"       element={<Alerts />} />
          </Routes>
        </main>
      </div>
    </div>
  )
}

export default function App() {
  return (
    <LanguageProvider>
      <Routes>
        <Route path="/"      element={<Landing />} />
        <Route path="/app/*" element={<AppLayout />} />
      </Routes>
    </LanguageProvider>
  )
}
