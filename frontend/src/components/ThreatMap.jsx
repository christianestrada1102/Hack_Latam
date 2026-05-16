import { useState, useMemo } from 'react'
import {
  Map,
  MapClusterLayer,
  MapPopup,
  MapControls,
} from '@/components/ui/map'

const CARTO_DARK = 'https://basemaps.cartocdn.com/gl/dark-matter-gl-style/style.json'

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
  const city = region.split(',')[0].trim().toLowerCase()
  return GEOCODE[city] ?? null
}

function buildGeoJSON(incidents) {
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
  return { type: 'FeatureCollection', features }
}

function scoreColor(s) {
  if (s >= 80) return '#ef4444'
  if (s >= 60) return '#f59e0b'
  return '#6b7280'
}

export default function ThreatMap({ incidents = [] }) {
  const [popup, setPopup] = useState(null)

  const geoJSON = useMemo(() => buildGeoJSON(incidents), [incidents])

  const handlePointClick = (feature, coordinates) => {
    const { id, threat_type, region, risk_score } = feature.properties
    setPopup({ lng: coordinates[0], lat: coordinates[1], id, threat_type, region, risk_score })
  }

  return (
    <Map
      theme="dark"
      styles={{ dark: CARTO_DARK, light: CARTO_DARK }}
      center={[-85, 15]}
      zoom={3}
      scrollZoom={false}
    >
      <MapClusterLayer
        data={geoJSON}
        clusterColors={['#ffc174', '#f59e0b', '#ef4444']}
        clusterThresholds={[5, 20]}
        pointColor="#ffc174"
        onPointClick={handlePointClick}
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
