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
    if (filters.region)      params.set('region', filters.region)
    if (filters.threat_type) params.set('threat_type', filters.threat_type)
    if (filters.min_risk)    params.set('min_risk', filters.min_risk)
    if (filters.limit)       params.set('limit', filters.limit)

    const res = await fetch(`${BASE_URL}/api/feed/?${params}`)
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
    if (!res.ok) return null
    return await res.json()
  } catch {
    return null
  }
}
