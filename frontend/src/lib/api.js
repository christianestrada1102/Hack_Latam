const BASE_URL = 'http://localhost:8000'

export async function getStats() {
  try {
    const res = await fetch(`${BASE_URL}/api/feed/stats`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getFeed(filters = {}) {
  try {
    const params = new URLSearchParams()
    if (filters.region)           params.set('region', filters.region)
    if (filters.threat_type)      params.set('threat_type', filters.threat_type)
    if (filters.min_risk != null) params.set('min_risk', filters.min_risk)
    if (filters.limit)            params.set('limit', filters.limit)
    if (filters.offset)           params.set('offset', filters.offset)
    if (filters.search)           params.set('search', filters.search)

    const res = await fetch(`${BASE_URL}/api/feed/?${params}`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getAlerts() {
  try {
    const res = await fetch(`${BASE_URL}/api/feed/alerts`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function getCampaigns() {
  try {
    const res = await fetch(`${BASE_URL}/api/feed/campaigns`)
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function reportIncident(incidentId) {
  try {
    const res = await fetch(`${BASE_URL}/api/feed/${incidentId}/report`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ user_confirmed: true, notes: '' }),
    })
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}

export async function analyzeContent(formData) {
  try {
    const res = await fetch(`${BASE_URL}/api/analyze`, {
      method: 'POST',
      body: formData,
    })
    if (!res.ok) {
      let message = `Error del servidor (${res.status})`
      try {
        const body = await res.json()
        message = body.detail || body.message || message
      } catch {
        const text = await res.text()
        message = text || message
      }
      console.error('[API] analyzeContent failed:', res.status, message)
      return { _apiError: message }
    }
    const data = await res.json()
    console.log('[API] analyzeContent response:', data)
    return data
  } catch (err) {
    console.error('[API] analyzeContent network error:', err)
    return { _apiError: err.message || 'Error de conexión' }
  }
}
