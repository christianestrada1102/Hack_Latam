import { Routes, Route } from 'react-router-dom'
import { LanguageProvider } from './lib/LanguageContext'
import Sidebar from './components/Sidebar'
import Header from './components/Header'
import Landing from './pages/Landing'
import Dashboard from './pages/Dashboard'
import ThreatScanner from './pages/ThreatScanner'
import IntelligenceFeed from './pages/IntelligenceFeed'
import Alerts from './pages/Alerts'

function AppLayout() {
  return (
    <div className="flex h-screen bg-[#131313] overflow-hidden">
      <Sidebar />
      <div className="flex flex-col flex-1 min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto">
          <Routes>
            <Route index             element={<Dashboard />} />
            <Route path="scanner"    element={<ThreatScanner />} />
            <Route path="intelligence" element={<IntelligenceFeed />} />
            <Route path="alerts"     element={<Alerts />} />
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
        <Route path="/"     element={<Landing />} />
        <Route path="/app/*" element={<AppLayout />} />
      </Routes>
    </LanguageProvider>
  )
}
