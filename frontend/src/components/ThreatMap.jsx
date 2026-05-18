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

function buildGeoJSON(incidents) {
  const features = incidents
    .map((inc) => {
      const region = inc.location || inc.region
      const coords = getCoords(region)
      if (!coords) return null
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: coords },
        properties: {
          risk_score:  inc.risk_score,
          threat_type: inc.threat_type ?? 'unknown',
          region:      region ?? 'LATAM',
        },
      }
    })
    .filter(Boolean)

  return { type: 'FeatureCollection', features }
}

export default function ThreatMap({ incidents = [] }) {
  const mapContainer = useRef()
  const map          = useRef()
  const incidentsRef = useRef(incidents)

  // Initialise map once; use incidentsRef so the load callback always
  // has access to whatever incidents were fetched before style finished loading.
  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container:          mapContainer.current,
      style:              'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center:             [-85, 15],
      zoom:               3,
      attributionControl: false,
    })

    map.current.on('load', () => {
      if (!map.current) return

      map.current.addSource('threats', {
        type: 'geojson',
        data: buildGeoJSON(incidentsRef.current),
      })

      map.current.addLayer({
        id:     'threat-circles',
        type:   'circle',
        source: 'threats',
        paint: {
          'circle-radius': 7,
          'circle-color': [
            'case', ['>=', ['get', 'risk_score'], 80], '#ef4444', '#ffc174',
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': [
            'case', ['>=', ['get', 'risk_score'], 80], '#ef444466', '#ffc17466',
          ],
        },
      })

      map.current.on('click', 'threat-circles', (e) => {
        const p     = e.features[0].properties
        const color = p.risk_score >= 80 ? '#ef4444' : '#ffc174'
        new maplibregl.Popup({ offset: 10, className: 'threat-popup' })
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#111;border:1px solid #262626;
              padding:8px 12px;border-radius:4px;
              font-family:monospace;font-size:12px;color:#f0ede8">
              <div style="color:#ffc174;font-size:10px;margin-bottom:4px">
                ${p.threat_type.toUpperCase()}
              </div>
              <div>${p.region}</div>
              <div style="color:#666;margin-top:4px">
                Riesgo: <span style="color:${color}">${p.risk_score}/100</span>
              </div>
            </div>
          `)
          .addTo(map.current)
      })

      map.current.on('mouseenter', 'threat-circles', () => {
        map.current.getCanvas().style.cursor = 'pointer'
      })
      map.current.on('mouseleave', 'threat-circles', () => {
        map.current.getCanvas().style.cursor = ''
      })
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  // Keep incidentsRef current; if style already loaded, update source directly.
  useEffect(() => {
    incidentsRef.current = incidents

    if (!map.current || !map.current.isStyleLoaded()) return
    const source = map.current.getSource('threats')
    if (source) source.setData(buildGeoJSON(incidents))
  }, [incidents])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
