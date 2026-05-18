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

  useEffect(() => {
    if (map.current) return

    map.current = new maplibregl.Map({
      container:        mapContainer.current,
      style:            'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json',
      center:           [-85, 15],
      zoom:             3,
      attributionControl: false,
    })

    map.current.on('load', () => {
      map.current.addSource('incidents', {
        type: 'geojson',
        data: { type: 'FeatureCollection', features: [] },
      })

      map.current.addLayer({
        id:     'incident-points',
        type:   'circle',
        source: 'incidents',
        paint: {
          'circle-radius': [
            'interpolate', ['linear'], ['get', 'risk_score'],
            60, 6,
            80, 9,
            100, 12,
          ],
          'circle-color': [
            'case',
            ['>=', ['get', 'risk_score'], 80], '#ef4444',
            '#ffc174',
          ],
          'circle-opacity': 0.85,
          'circle-stroke-width': 2,
          'circle-stroke-color': [
            'case',
            ['>=', ['get', 'risk_score'], 80], '#ef444440',
            '#ffc17440',
          ],
        },
      })

      const popup = new maplibregl.Popup({
        closeButton: false,
        closeOnClick: false,
        className: 'threat-popup',
      })

      map.current.on('mouseenter', 'incident-points', (e) => {
        map.current.getCanvas().style.cursor = 'pointer'
        const props = e.features[0].properties
        popup
          .setLngLat(e.lngLat)
          .setHTML(`
            <div style="background:#111;border:1px solid #262626;
              padding:8px 12px;border-radius:4px;
              font-family:monospace;font-size:12px;color:#f0ede8">
              <div style="color:#ffc174;font-size:10px;margin-bottom:4px">
                ${props.threat_type?.toUpperCase() ?? '—'}
              </div>
              <div>${props.region || 'LATAM'}</div>
              <div style="color:#666;margin-top:4px">
                Riesgo: <span style="color:${
                  props.risk_score >= 80 ? '#ef4444' : '#ffc174'
                }">${props.risk_score}/100</span>
              </div>
            </div>
          `)
          .addTo(map.current)
      })

      map.current.on('mouseleave', 'incident-points', () => {
        map.current.getCanvas().style.cursor = ''
        popup.remove()
      })

      console.log('[ThreatMap] layer added, map ready')
    })

    return () => {
      map.current?.remove()
      map.current = null
    }
  }, [])

  useEffect(() => {
    if (!map.current) return

    const updatePoints = () => {
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
              threat_type: inc.threat_type,
              region,
            },
          }
        })
        .filter(Boolean)

      console.log('[ThreatMap] updating', features.length, 'points')

      const source = map.current.getSource('incidents')
      if (source) source.setData({ type: 'FeatureCollection', features })
    }

    if (map.current.isStyleLoaded()) {
      updatePoints()
    } else {
      map.current.once('load', updatePoints)
    }
  }, [incidents])

  return (
    <div style={{ width: '100%', height: '100%', position: 'relative' }}>
      <div ref={mapContainer} style={{ width: '100%', height: '100%' }} />
    </div>
  )
}
