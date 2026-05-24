exports.handler = async (event) => {
  const headers = {
    'Content-Type': 'application/json',
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
  }

  if (event.httpMethod === 'OPTIONS') return { statusCode: 200, headers, body: '' }
  if (event.httpMethod !== 'POST') return { statusCode: 405, headers, body: JSON.stringify({ error: 'method not allowed' }) }

  try {
    const body = JSON.parse(event.body)
    const { prefs, goals, type, meal, servings, calorieGoal } = body

    // Recipe request
    if (type === 'recipe') {
      const count = servings || 2
      const prompt = `Give me a simple recipe for: "${meal}" scaled for ${count} ${count===1?'person':'people'}.
Format as JSON only:
{
  "name": "meal name",
  "time": "total time",
  "serves": "${count} ${count===1?'person':'people'}",
  "ingredients": ["ingredient with exact amount"],
  "steps": ["step 1", "step 2"],
  "tip": "one helpful tip"
}`
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error?.message || 'API error')
      const parsed = JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{}')
      return { statusCode: 200, headers, body: JSON.stringify(parsed) }
    }

    // Swap single meal request
    if (type === 'swap') {
      const { day, current } = body
      const ng = Array.isArray(prefs?.goal) ? prefs.goal.join(', ') : (prefs?.goal || 'eat healthier')
      const prompt = `Suggest ONE alternative ${meal} for ${day} to replace: "${current}"
Preferences: ${ng}, dietary: ${prefs?.dietary?.join(', ')||'none'}, avoid: ${prefs?.allergies||'none'}
Respond with JSON only: {"meal": "meal name and brief description"}`
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error?.message || 'API error')
      const parsed = JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{}')
      return { statusCode: 200, headers, body: JSON.stringify(parsed) }
    }

    // Full meal plan request
    const ng = Array.isArray(prefs?.goal) ? prefs.goal.join(', ') : (prefs?.goal || 'eat healthier')
    const calNote = calorieGoal ? `Daily calorie target: ${calorieGoal} calories. Make meals add up to this.` : 'Estimate reasonable calories for each meal.'
    const prompt = `You are a nutritionist for a 75-day wellness challenge.
User: goals=${goals||'wellness'}, nutrition=${ng}, dietary=${prefs?.dietary?.join(',')||'none'}, allergies=${prefs?.allergies||'none'}, cuisines=${prefs?.cuisines?.join(',')||'any'}
${calNote}

Generate a 7-day meal plan. Each meal is an object: {"name":"...","calories":000}
Respond ONLY with this JSON structure:
{
  "days": {
    "monday":{"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "tuesday":{"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "wednesday":{"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "thursday":{"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "friday":{"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "saturday":{"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "sunday":{"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}}
  },
  "grocery":{"produce":[],"protein":[],"dairy & eggs":[],"grains & bread":[],"pantry":[],"snacks":[]}
}`

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 3000, messages: [{ role: 'user', content: prompt }] })
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error?.message || 'API error')
    const text = data.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{}'
    const parsed = JSON.parse(text)
    if (!parsed.days) throw new Error('generation failed')

    // Convert grocery object to array format
    const groceryList = {}
    if (parsed.grocery) {
      Object.entries(parsed.grocery).forEach(([section, items]) => {
        if (Array.isArray(items) && items.length > 0) {
          groceryList[section] = items.map(item => ({ name: item, checked: false }))
        }
      })
    }

    return { statusCode: 200, headers, body: JSON.stringify({ days: parsed.days, grocery: groceryList }) }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
