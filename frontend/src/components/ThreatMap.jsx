import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'

const GEOCODING = {
  'Chihuahua':    [-106.0889,  28.6353],
  'Juárez':       [-106.4245,  31.6904],
  'CDMX':         [ -99.1332,  19.4326],
  'México':       [ -99.1332,  19.4326],
  'Mexico':       [ -99.1332,  19.4326],
  'Monterrey':    [-100.3161,  25.6866],
  'Guadalajara':  [-103.3496,  20.6597],
  'Bogotá':       [ -74.0721,   4.7110],
  'Lima':         [ -77.0428, -12.0464],
  'Buenos Aires': [ -58.3816, -34.6037],
  'São Paulo':    [ -46.6333, -23.5505],
}

function getCoords(region) {
  if (!region) return null
  for (const [key, coords] of Object.entries(GEOCODING)) {
    if (region.includes(key)) return coords
  }
  return null
}

export default function ThreatMap({ incidents = [] }) {
  const mapContainer = useRef()
  const map          = useRef()
  const markersRef   = useRef([])
  const popupsRef    = useRef([])
  const incidentsRef = useRef(incidents)

  function placeMarkers() {
    if (!map.current) return

    markersRef.current.forEach((m) => m.remove())
    popupsRef.current.forEach((p) => p.remove())
    markersRef.current = []
    popupsRef.current  = []

    incidentsRef.current.forEach((inc) => {
      const region     = inc.location || inc.region
      const baseCoords = getCoords(region)
      if (!baseCoords) return

      // Small random jitter so stacked incidents at the same city spread out
      const offset = 0.3
      const coords = [
        baseCoords[0] + (Math.random() - 0.5) * offset,
        baseCoords[1] + (Math.random() - 0.5) * offset,
      ]

      const color  = inc.risk_score >= 80 ? '#ef4444' : '#ffc174'
      const border = inc.risk_score >= 80 ? '#ef444480' : '#ffc17480'

      const popup = new maplibregl.Popup({ offset: 10, className: 'threat-popup' })
        .setLngLat(coords)
        .setHTML(`
          <div style="background:#111;border:1px solid #262626;
            padding:8px 12px;border-radius:4px;
            font-family:monospace;font-size:12px;color:#f0ede8">
            <div style="color:#ffc174;font-size:10px;margin-bottom:4px">
              ${(inc.threat_type ?? 'unknown').toUpperCase()}
            </div>
            <div>${region ?? 'LATAM'}</div>
            <div style="color:#666;margin-top:4px">
              Riesgo: <span style="color:${color}">${inc.risk_score}/100</span>
            </div>
          </div>
        `)

      const el = document.createElement('div')
      el.style.cssText = `
        width:12px;height:12px;border-radius:50%;
        background:${color};
        border:2px solid ${border};
        cursor:pointer;
      `

      el.addEventListener('mouseenter', () => { if (map.current) popup.addTo(map.current) })
      el.addEventListener('mouseleave', () => popup.remove())

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .addTo(map.current)

      markersRef.current.push(marker)
      popupsRef.current.push(popup)
    })
  }

  // Initialise map once; 'load' covers the case where incidents arrive first
  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container:          mapContainer.current,
      style:              'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center:             [-85, 15],
      zoom:               3,
      attributionControl: false,
    })

    map.current.on('load', () => placeMarkers())

    return () => {
      markersRef.current.forEach((m) => m.remove())
      popupsRef.current.forEach((p) => p.remove())
      markersRef.current = []
      popupsRef.current  = []
      map.current?.remove()
      map.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Update markers whenever incidents change; Marker objects don't need style loaded
  useEffect(() => {
    incidentsRef.current = incidents
    placeMarkers()
  }, [incidents]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
