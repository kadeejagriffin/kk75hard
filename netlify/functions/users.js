exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const SUPABASE_URL = 'https://kbfzalzbqwglcnwznurq.supabase.co'
  const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZnphbHpicXdnbGNud3pudXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzUzNzYsImV4cCI6MjA5NDYxMTM3Nn0.pb6ZPU2aPFLPooQtMY73NILjWRaxxqKZR2GTY5H71Yw'
  const base = `${SUPABASE_URL}/rest/v1/users`
  const sh = { 'Content-Type': 'application/json', 'apikey': SUPABASE_KEY, 'Authorization': `Bearer ${SUPABASE_KEY}` }

  try {
    if (event.httpMethod === 'GET') {
      const name = event.queryStringParameters?.name
      if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'name required' }) }
      const r = await fetch(`${base}?name=eq.${encodeURIComponent(name)}&limit=1`, { headers: sh })
      const data = await r.json()
      if (!data.length) return { statusCode: 404, headers, body: JSON.stringify({ error: 'not found' }) }
      return { statusCode: 200, headers, body: JSON.stringify(data[0]) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body)
      const check = await fetch(`${base}?name=eq.${encodeURIComponent(body.name)}&limit=1`, { headers: sh })
      const existing = await check.json()
      if (existing.length) return { statusCode: 409, headers, body: JSON.stringify({ error: 'exists' }) }
      const r = await fetch(base, { method: 'POST', headers: { ...sh, 'Prefer': 'return=representation' }, body: JSON.stringify(body) })
      const data = await r.json()
      return { statusCode: 201, headers, body: JSON.stringify(Array.isArray(data) ? data[0] : data) }
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body)
      const r = await fetch(`${base}?name=eq.${encodeURIComponent(body.name)}`, { method: 'PATCH', headers: { ...sh, 'Prefer': 'return=representation' }, body: JSON.stringify(body) })
      const data = await r.json()
      return { statusCode: 200, headers, body: JSON.stringify(Array.isArr
