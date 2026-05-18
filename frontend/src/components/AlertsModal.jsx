import { useState } from 'react'
import { X } from 'lucide-react'
import { CheckCircledIcon } from '@radix-ui/react-icons'
import { subscribeAlerts } from '../lib/api'

export default function AlertsModal({ onClose }) {
  const [phone, setPhone]   = useState('+52')
  const [status, setStatus] = useState('idle')   // idle | loading | success | error
  const [error, setError]   = useState('')

  const handleSubmit = async () => {
    setStatus('loading')
    setError('')
    try {
      await subscribeAlerts(phone.trim())
      setStatus('success')
    } catch (err) {
      setError(err.message || 'Error al suscribirse')
      setStatus('error')
    }
  }

  const canSubmit = status !== 'loading' && phone.replace(/\D/g, '').length >= 10

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.75)' }}
      onClick={(e) => { if (e.target === e.currentTarget) onClose() }}
    >
      <div
        className="w-full max-w-sm rounded border flex flex-col"
        style={{ background: '#1c1b1b', borderColor: '#262626' }}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 border-b"
          style={{ borderColor: '#262626' }}
        >
          <p className="text-sm font-semibold" style={{ color: '#e5e2e1' }}>
            Recibir alertas SMS
          </p>
          <button
            onClick={onClose}
            className="transition-colors hover:text-neutral-300"
            style={{ color: '#555' }}
          >
            <X size={16} strokeWidth={1.5} />
          </button>
        </div>

        {status === 'success' ? (
          /* Success state */
          <div className="px-5 py-8 flex flex-col items-center gap-3 text-center">
            <CheckCircledIcon style={{ width: 32, height: 32, color: '#22c55e' }} />
            <p className="text-[13px] font-semibold font-mono" style={{ color: '#22c55e' }}>
              ✓ Recibirás alertas de amenazas críticas
            </p>
            <p className="text-[11px] leading-relaxed" style={{ color: '#666' }}>
              Te notificaremos por SMS cuando detectemos una amenaza con score ≥ 80 en LATAM.
            </p>
            <button
              onClick={onClose}
              className="mt-2 text-[11px] font-mono px-4 py-2 rounded border transition-colors"
              style={{ borderColor: '#262626', color: '#a08e7a' }}
            >
              Cerrar
            </button>
          </div>
        ) : (
          /* Input state */
          <div className="px-5 py-4 flex flex-col gap-4">
            <p className="text-[12px] leading-relaxed" style={{ color: '#a08e7a' }}>
              Ingresa tu número para recibir alertas cuando se detecte una amenaza crítica en LATAM.
            </p>

            <input
              type="tel"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="+521234567890"
              className="w-full rounded px-3 py-2.5 text-[12px] font-mono text-neutral-200 placeholder-neutral-600 outline-none"
              style={{ background: '#0a0a0a', border: '1px solid #262626' }}
              onKeyDown={(e) => { if (e.key === 'Enter' && canSubmit) handleSubmit() }}
            />

            {status === 'error' && (
              <p className="text-[11px] font-mono" style={{ color: '#ef4444' }}>{error}</p>
            )}

            <button
              disabled={!canSubmit}
              onClick={handleSubmit}
              className="w-full py-2.5 rounded text-[12px] font-semibold transition-colors disabled:opacity-40"
              style={{ background: '#f59e0b', color: '#131313' }}
            >
              {status === 'loading' ? 'Activando…' : 'Activar alertas'}
            </button>

            <p className="text-[10px] leading-relaxed" style={{ color: '#555' }}>
              Tu número solo se usa para alertas de amenazas con score ≥ 80.
              Puedes cancelar en cualquier momento.
            </p>
          </div>
        )}
      </div>
    </div>
  )
}
