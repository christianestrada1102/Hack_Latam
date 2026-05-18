import maplibregl from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import { useEffect, useRef } from 'react'

const GEOCODING = {
  'Chihuahua':    [-106.0889, 28.6353 ],
  'Juárez':       [-106.4245, 31.6904 ],
  'CDMX':         [-99.1332,  19.4326 ],
  'México':       [-99.1332,  19.4326 ],
  'Mexico':       [-99.1332,  19.4326 ],
  'Monterrey':    [-100.3161, 25.6866 ],
  'Guadalajara':  [-103.3496, 20.6597 ],
  'Bogotá':       [-74.0721,  4.7110  ],
  'Lima':         [-77.0428,  -12.0464],
  'Buenos Aires': [-58.3816,  -34.6037],
  'São Paulo':    [-46.6333,  -23.5505],
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

  // Initialise map once
  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container:          mapContainer.current,
      style:              'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center:             [-85, 15],
      zoom:               3,
      attributionControl: false,
    })

    return () => {
      markersRef.current.forEach((m) => m.remove())
      markersRef.current = []
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Re-render markers whenever incidents change
  useEffect(() => {
    if (!map.current) return

    // Clear existing markers
    markersRef.current.forEach((m) => m.remove())
    markersRef.current = []

    console.log('[ThreatMap] updating', incidents.length, 'incidents')

    incidents.forEach((inc) => {
      const region = inc.location || inc.region
      const coords = getCoords(region)
      if (!coords) return

      const el = document.createElement('div')
      el.style.cssText = `
        width: 12px;
        height: 12px;
        border-radius: 50%;
        background: ${inc.risk_score >= 80 ? '#ef4444' : '#ffc174'};
        border: 2px solid ${inc.risk_score >= 80 ? '#ef444480' : '#ffc17480'};
        cursor: pointer;
      `

      const popup = new maplibregl.Popup({ offset: 10, className: 'threat-popup' })
        .setHTML(`
          <div style="background:#111;border:1px solid #262626;
            padding:8px 12px;border-radius:4px;
            font-family:monospace;font-size:12px;color:#f0ede8">
            <div style="color:#ffc174;font-size:10px;margin-bottom:4px">
              ${inc.threat_type?.toUpperCase() ?? '—'}
            </div>
            <div>${region || 'LATAM'}</div>
            <div style="color:#666;margin-top:4px">
              Riesgo: <span style="color:${
                inc.risk_score >= 80 ? '#ef4444' : '#ffc174'
              }">${inc.risk_score}/100</span>
            </div>
          </div>
        `)

      const marker = new maplibregl.Marker({ element: el })
        .setLngLat(coords)
        .setPopup(popup)
        .addTo(map.current)

      markersRef.current.push(marker)
    })

    console.log('[ThreatMap] placed', markersRef.current.length, 'markers')
  }, [incidents])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
