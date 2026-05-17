const HARMOND = "'Harmond', serif"
const GEIST   = "'Geist Variable', 'Geist', system-ui, sans-serif"

const rotateStyle = `
  @keyframes rotatePhone {
    0%, 40%  { transform: rotate(0deg); }
    60%, 100% { transform: rotate(90deg); }
  }
  .rotate-phone-anim {
    animation: rotatePhone 2s ease-in-out infinite;
    display: inline-block;
    transform-origin: center;
  }
`

function PhoneIcon() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
      <rect x="5" y="2" width="14" height="20" rx="2" />
      <circle cx="12" cy="18" r="0.5" fill="currentColor" />
    </svg>
  )
}

export default function RotatePrompt({ onDismiss }) {
  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 9999,
      background: '#0a0a0a',
      display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center',
      gap: 20, padding: 32, textAlign: 'center',
    }}>
      <style>{rotateStyle}</style>

      <span style={{ fontFamily: HARMOND, fontWeight: 800, fontSize: 18, color: '#ffc174', letterSpacing: '0.12em' }}>
        HAVEN
      </span>

      <div className="rotate-phone-anim" style={{ color: '#ffc174', margin: '8px 0' }}>
        <PhoneIcon />
      </div>

      <p style={{ fontFamily: HARMOND, fontSize: 24, color: '#f0ede8', lineHeight: 1.2, margin: 0 }}>
        Gira tu dispositivo
      </p>

      <p style={{ fontFamily: GEIST, fontSize: 14, color: '#666', maxWidth: 260, lineHeight: 1.6, margin: 0 }}>
        HAVEN funciona mejor en horizontal o en una pantalla más grande.
      </p>

      <button
        onClick={onDismiss}
        style={{
          marginTop: 8, background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: GEIST, fontSize: 13, color: '#444', transition: 'color 200ms', padding: 0,
        }}
        onMouseEnter={(e) => { e.currentTarget.style.color = '#ffc174' }}
        onMouseLeave={(e) => { e.currentTarget.style.color = '#444' }}
      >
        Continuar de todas formas →
      </button>
    </div>
  )
}
