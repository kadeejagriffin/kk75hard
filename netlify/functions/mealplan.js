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
Respond with JSON only (no markdown):
{"name":"meal name","time":"total time","serves":"${count} people","ingredients":["item with amount"],"steps":["step 1"],"tip":"one tip"}`
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error?.message || 'recipe API error')
      const text = data.content?.[0]?.text || '{}'
      const clean = text.replace(/```json|```/g, '').trim()
      return { statusCode: 200, headers, body: JSON.stringify(JSON.parse(clean)) }
    }

    // Swap single meal request
    if (type === 'swap') {
      const { day, current } = body
      const ng = Array.isArray(prefs?.goal) ? prefs.goal.join(', ') : (prefs?.goal || 'healthy')
      const prompt = `Suggest one alternative ${meal} for ${day} to replace: "${current}". Preferences: ${ng}, dietary: ${prefs?.dietary?.join(',')||'none'}, avoid: ${prefs?.allergies||'none'}. Respond with JSON only: {"meal":"name and description"}`
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 200, messages: [{ role: 'user', content: prompt }] })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error?.message || 'swap API error')
      const text = data.content?.[0]?.text || '{}'
      return { statusCode: 200, headers, body: JSON.stringify(JSON.parse(text.replace(/```json|```/g, '').trim())) }
    }

    // Full meal plan
    const ng = Array.isArray(prefs?.goal) ? prefs.goal.join(', ') : (prefs?.goal || 'eat healthier')
    const calLine = calorieGoal ? `Daily calorie goal: ${calorieGoal} calories. Make meals add up to this target.` : 'Include estimated calories for each meal.'

    const prompt = `You are a nutritionist. Create a 7-day meal plan.
Person: goals=${goals||'wellness'}, nutrition=${ng}, dietary=${prefs?.dietary?.join(',')||'none'}, allergies=${prefs?.allergies||'none'}, cuisines=${prefs?.cuisines?.join(',')||'any'}.
${calLine}

Return ONLY a JSON object (no markdown, no explanation) with this exact structure:
{"days":{"monday":{"breakfast":{"name":"meal name","calories":300},"lunch":{"name":"meal name","calories":450},"dinner":{"name":"meal name","calories":550},"snack":{"name":"meal name","calories":150}},"tuesday":{"breakfast":{"name":"","calories":0},"lunch":{"name":"","calories":0},"dinner":{"name":"","calories":0},"snack":{"name":"","calories":0}},"wednesday":{"breakfast":{"name":"","calories":0},"lunch":{"name":"","calories":0},"dinner":{"name":"","calories":0},"snack":{"name":"","calories":0}},"thursday":{"breakfast":{"name":"","calories":0},"lunch":{"name":"","calories":0},"dinner":{"name":"","calories":0},"snack":{"name":"","calories":0}},"friday":{"breakfast":{"name":"","calories":0},"lunch":{"name":"","calories":0},"dinner":{"name":"","calories":0},"snack":{"name":"","calories":0}},"saturday":{"breakfast":{"name":"","calories":0},"lunch":{"name":"","calories":0},"dinner":{"name":"","calories":0},"snack":{"name":"","calories":0}},"sunday":{"breakfast":{"name":"","calories":0},"lunch":{"name":"","calories":0},"dinner":{"name":"","calories":0},"snack":{"name":"","calories":0}}},"grocery":{"produce":["item"],"protein":["item"],"dairy & eggs":["item"],"grains & bread":["item"],"pantry":["item"],"snacks":["item"]}}`

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 4000, messages: [{ role: 'user', content: prompt }] })
    })

    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error?.message || 'API error: ' + resp.status)

    const rawText = data.content?.[0]?.text || ''
    const cleanText = rawText.replace(/```json|```/g, '').trim()

    let parsed
    try {
      parsed = JSON.parse(cleanText)
    } catch(parseErr) {
      throw new Error('JSON parse failed: ' + parseErr.message + ' | Raw: ' + cleanText.substring(0, 200))
    }

    if (!parsed.days) throw new Error('No days in response. Keys: ' + Object.keys(parsed).join(','))

    // Build grocery list in app format
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
    console.error('mealplan error:', e.message)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
