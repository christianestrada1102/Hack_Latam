import { useState, useEffect, useRef } from 'react'
import { Map, MapPopup, MapControls, useMap } from '@/components/ui/map'

const CARTO_DARK = 'https://tiles.openfreemap.org/styles/dark'

const GEOCODE = {
  'chihuahua':     { lat: 28.6353,  lng: -106.0889 },
  'ciudad juárez': { lat: 31.6904,  lng: -106.4245 },
  'juárez':        { lat: 31.6904,  lng: -106.4245 },
  'cdmx':          { lat: 19.4326,  lng: -99.1332  },
  'monterrey':     { lat: 25.6866,  lng: -100.3161 },
  'guadalajara':   { lat: 20.6597,  lng: -103.3496 },
  'bogotá':        { lat:  4.7110,  lng: -74.0721  },
  'lima':          { lat: -12.0464, lng: -77.0428  },
  'buenos aires':  { lat: -34.6037, lng: -58.3816  },
  'são paulo':     { lat: -23.5505, lng: -46.6333  },
  'mexico':        { lat: 19.4326,  lng: -99.1332  },
}

function geocodeRegion(region) {
  if (!region) return null
  const r = region.toLowerCase()
  if (r.includes('chihuahua'))                             return GEOCODE['chihuahua']
  if (r.includes('juárez') || r.includes('juarez'))       return GEOCODE['juárez']
  if (r.includes('cdmx') || r.includes('ciudad de m'))    return GEOCODE['cdmx']
  if (r.includes('monterrey'))                             return GEOCODE['monterrey']
  if (r.includes('guadalajara'))                           return GEOCODE['guadalajara']
  if (r.includes('bogotá') || r.includes('bogota'))       return GEOCODE['bogotá']
  if (r.includes('lima'))                                  return GEOCODE['lima']
  if (r.includes('buenos aires'))                          return GEOCODE['buenos aires']
  if (r.includes('são paulo') || r.includes('sao paulo')) return GEOCODE['são paulo']
  if (r.includes('méxico') || r.includes('mexico'))       return GEOCODE['mexico']
  return null
}

function buildPoints(incidents) {
  const features = incidents
    .map((inc) => {
      const geo = geocodeRegion(inc.region)
      if (!geo) return null
      return {
        type: 'Feature',
        geometry: { type: 'Point', coordinates: [geo.lng, geo.lat] },
        properties: {
          id:          inc.id,
          threat_type: inc.threat_type,
          region:      inc.region ?? '—',
          risk_score:  inc.risk_score ?? 0,
        },
      }
    })
    .filter(Boolean)
  console.log('[ThreatMap] mapped points:', features.length, features.map(f => f.properties.region))
  return { type: 'FeatureCollection', features }
}

const SOURCE_ID = 'incidents'
const LAYER_ID  = 'incident-circles'

function IncidentLayer({ incidents, onPointClick }) {
  const { map, isLoaded } = useMap()
  const onClickRef = useRef(onPointClick)
  onClickRef.current = onPointClick

  // Add source + layer once map is ready
  useEffect(() => {
    if (!isLoaded || !map) return

    map.addSource(SOURCE_ID, {
      type: 'geojson',
      data: buildPoints(incidents),
    })

    map.addLayer({
      id: LAYER_ID,
      type: 'circle',
      source: SOURCE_ID,
      paint: {
        'circle-radius': 8,
        'circle-color': [
          'case',
          ['>=', ['get', 'risk_score'], 80], '#ef4444',
          ['>=', ['get', 'risk_score'], 60], '#ffc174',
          '#666666',
        ],
        'circle-opacity': 0.8,
        'circle-stroke-width': 1,
        'circle-stroke-color': '#ffffff',
      },
    })

    const handleClick = (e) => {
      if (!e.features?.length) return
      const feature = e.features[0]
      const [lng, lat] = feature.geometry.coordinates.slice()
      onClickRef.current(feature.properties, lng, lat)
    }
    const setCursor   = () => { map.getCanvas().style.cursor = 'pointer' }
    const clearCursor = () => { map.getCanvas().style.cursor = '' }

    map.on('click',      LAYER_ID, handleClick)
    map.on('mouseenter', LAYER_ID, setCursor)
    map.on('mouseleave', LAYER_ID, clearCursor)

    return () => {
      map.off('click',      LAYER_ID, handleClick)
      map.off('mouseenter', LAYER_ID, setCursor)
      map.off('mouseleave', LAYER_ID, clearCursor)
      try {
        if (map.getLayer(LAYER_ID))   map.removeLayer(LAYER_ID)
        if (map.getSource(SOURCE_ID)) map.removeSource(SOURCE_ID)
      } catch { /* ignore */ }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, map])

  // Keep source data in sync when incidents change
  useEffect(() => {
    if (!isLoaded || !map) return
    const source = map.getSource(SOURCE_ID)
    if (source) source.setData(buildPoints(incidents))
  }, [isLoaded, map, incidents])

  return null
}

function scoreColor(s) {
  if (s >= 80) return '#ef4444'
  if (s >= 60) return '#f59e0b'
  return '#6b7280'
}

export default function ThreatMap({ incidents = [] }) {
  const [popup, setPopup] = useState(null)

  return (
    <Map
      theme="dark"
      styles={{ dark: CARTO_DARK, light: CARTO_DARK }}
      center={[-85, 15]}
      zoom={3}
      scrollZoom={false}
    >
      <IncidentLayer
        incidents={incidents}
        onPointClick={(props, lng, lat) => setPopup({ ...props, lng, lat })}
      />

      {popup && (
        <MapPopup
          longitude={popup.lng}
          latitude={popup.lat}
          onClose={() => setPopup(null)}
          closeButton
        >
          <div style={{
            background: '#1c1b1b',
            border: '1px solid #262626',
            borderRadius: 6,
            padding: '8px 12px',
            minWidth: 160,
          }}>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 6, marginBottom: 4 }}>
              <span style={{
                fontFamily: 'monospace',
                fontSize: 20,
                fontWeight: 700,
                color: scoreColor(popup.risk_score),
                lineHeight: 1,
              }}>
                {popup.risk_score}
              </span>
              <span style={{
                fontFamily: 'monospace',
                fontSize: 9,
                textTransform: 'uppercase',
                letterSpacing: '0.1em',
                color: '#6b7280',
              }}>
                riesgo
              </span>
            </div>
            <p style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#ef4444',
              textTransform: 'uppercase',
              letterSpacing: '0.05em',
              margin: 0,
              marginBottom: 2,
            }}>
              {popup.threat_type}
            </p>
            <p style={{
              fontFamily: 'monospace',
              fontSize: 11,
              color: '#a3a3a3',
              margin: 0,
            }}>
              {popup.region}
            </p>
          </div>
        </MapPopup>
      )}

      <MapControls position="bottom-right" showZoom />
    </Map>
  )
}
