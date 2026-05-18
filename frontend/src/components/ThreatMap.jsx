import Globe from 'globe.gl'
import { useEffect, useRef } from 'react'

const GEOCODING = {
  'Chihuahua':   [28.6353,  -106.0889],
  'Juárez':      [31.6904,  -106.4245],
  'CDMX':        [19.4326,  -99.1332 ],
  'México':      [19.4326,  -99.1332 ],
  'Mexico':      [19.4326,  -99.1332 ],
  'Monterrey':   [25.6866,  -100.3161],
  'Guadalajara': [20.6597,  -103.3496],
  'Bogotá':      [4.7110,   -74.0721 ],
  'Lima':        [-12.0464, -77.0428 ],
  'Buenos Aires':[-34.6037, -58.3816 ],
  'São Paulo':   [-23.5505, -46.6333 ],
}

function getCoords(region) {
  if (!region) return null
  for (const [key, coords] of Object.entries(GEOCODING)) {
    if (region.includes(key)) return coords
  }
  return null
}

export default function ThreatMap({ incidents = [] }) {
  const containerRef = useRef()
  const globeRef     = useRef()

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const globe = Globe()(el)
    globe
      .width(el.offsetWidth  || 600)
      .height(el.offsetHeight || 350)
      .globeImageUrl('//unpkg.com/three-globe/example/img/earth-dark.jpg')
      .backgroundColor('rgba(0,0,0,0)')
      .atmosphereColor('#ffc174')
      .atmosphereAltitude(0.1)
      .pointOfView({ lat: 15, lng: -85, altitude: 2 })

    globe.controls().enableZoom      = false
    globe.controls().autoRotate      = false
    globe.controls().enableDamping   = true
    globe.controls().dampingFactor   = 0.05

    const tooltipEl = el.querySelector('.scene-tooltip')
    if (tooltipEl) {
      tooltipEl.style.zIndex        = '9999'
      tooltipEl.style.pointerEvents = 'none'
    }

    globeRef.current = globe

    return () => globe._destructor?.()
  }, [])

  useEffect(() => {
    if (!globeRef.current || !incidents.length) return

    const points = incidents
      .map((inc) => {
        const coords = getCoords(inc.location || inc.region)
        if (!coords) return null
        return {
          lat:         coords[0],
          lng:         coords[1],
          color:       inc.risk_score >= 80 ? '#ef4444' : '#ffc174',
          altitude:    inc.risk_score / 1000,
          threat_type: inc.threat_type,
          region:      inc.location || inc.region,
          risk_score:  inc.risk_score,
        }
      })
      .filter(Boolean)

    console.log('[ThreatMap Globe] points:', points.length, points.map(p => p.region))

    globeRef.current
      .pointsData(points)
      .pointColor('color')
      .pointAltitude('altitude')
      .pointRadius(0.4)
      .pointLabel((d) => `
        <div style="background:#111;border:1px solid #262626;
          padding:8px 12px;border-radius:4px;font-family:monospace;
          font-size:12px;color:#f0ede8;pointer-events:none">
          <div style="color:#ffc174;font-size:10px;margin-bottom:4px">
            ${d.threat_type?.toUpperCase() ?? '—'}
          </div>
          <div>${d.region || 'LATAM'}</div>
          <div style="color:#666;font-size:11px">
            Riesgo: <span style="color:${d.risk_score >= 80 ? '#ef4444' : '#ffc174'}">
              ${d.risk_score}/100
            </span>
          </div>
        </div>
      `)
      .ringsData(points.filter((p) => p.risk_score >= 80))
      .ringColor(() => '#ef444460')
      .ringMaxRadius(3)
      .ringPropagationSpeed(1)
      .ringRepeatPeriod(1500)
  }, [incidents])

  return (
    <div
      ref={containerRef}
      style={{ width: '100%', height: '100%', background: 'transparent' }}
    />
  )
}
