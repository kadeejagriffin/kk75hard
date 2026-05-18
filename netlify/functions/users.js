exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  try {
    const { createClient } = require('@supabase/supabase-js')
    const sb = createClient(
      'https://kbfzalzbqwglcnwznurq.supabase.co',
      'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImtiZnphbHpicXdnbGNud3pudXJxIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzkwMzUzNzYsImV4cCI6MjA5NDYxMTM3Nn0.pb6ZPU2aPFLPooQtMY73NILjWRaxxqKZR2GTY5H71Yw'
    )

    if (event.httpMethod === 'GET') {
      const name = event.queryStringParameters?.name
      if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'name required' }) }
      const { data, error } = await sb.from('users').select('*').eq('name', name).single()
      if (error || !data) return { statusCode: 404, headers, body: JSON.stringify({ error: 'not found' }) }
      return { statusCode: 200, headers, body: JSON.stringify(data) }
    }

    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body)
      const { data: existing } = await sb.from('users').select('name').eq('name', body.name).single()
      if (existing) return { statusCode: 409, headers, body: JSON.stringify({ error: 'exists' }) }
      const { data, error } = await sb.from('users').insert([body]).select().single()
      if (error) throw error
      return { statusCode: 201, headers, body: JSON.stringify(data) }
    }

    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body)
      const { data, error } = await sb.from('users').upsert(body).select().single()
      if (error) throw error
      return { statusCode: 200, headers, body: JSON.stringify(data) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'method not allowed' }) }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
