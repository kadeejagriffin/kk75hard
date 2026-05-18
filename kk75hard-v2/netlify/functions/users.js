const { getStore } = require('@netlify/blobs')

exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }

  const store = getStore({ name: 'users', consistency: 'strong' })

  try {
    // GET user
    if (event.httpMethod === 'GET') {
      const name = event.queryStringParameters?.name
      if (!name) return { statusCode: 400, headers, body: JSON.stringify({ error: 'name required' }) }
      const data = await store.get(name, { type: 'json' })
      if (!data) return { statusCode: 404, headers, body: JSON.stringify({ error: 'not found' }) }
      return { statusCode: 200, headers, body: JSON.stringify(data) }
    }

    // POST - create user
    if (event.httpMethod === 'POST') {
      const body = JSON.parse(event.body)
      const existing = await store.get(body.name, { type: 'json' })
      if (existing) return { statusCode: 409, headers, body: JSON.stringify({ error: 'exists' }) }
      await store.setJSON(body.name, body)
      return { statusCode: 201, headers, body: JSON.stringify(body) }
    }

    // PUT - update user
    if (event.httpMethod === 'PUT') {
      const body = JSON.parse(event.body)
      await store.setJSON(body.name, body)
      return { statusCode: 200, headers, body: JSON.stringify(body) }
    }

    return { statusCode: 405, headers, body: JSON.stringify({ error: 'method not allowed' }) }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
