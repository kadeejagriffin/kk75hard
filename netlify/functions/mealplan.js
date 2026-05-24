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
    const { prefs, goals, type, meal, servings, calorieGoal, nutritionGoals } = body

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
      const nutritionGoals = Array.isArray(prefs?.goal) ? prefs.goal.join(', ') : (prefs?.goal || 'eat healthier')
      const prompt = `Suggest ONE alternative ${meal} for ${day} to replace: "${current}"
The person's preferences: ${nutritionGoals}, dietary: ${prefs?.dietary?.join(', ')||'none'}, avoid: ${prefs?.allergies||'none'}
Make it different from the current meal but equally delicious and nutritious.
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
    const nutritionGoals = Array.isArray(prefs?.goal) ? prefs.goal.join(', ') : (prefs?.goal || 'eat healthier')
    const prompt = `You are a nutritionist helping someone on a 75-day wellness challenge called "Magical Sunshine".
User details:
- Wellness goals: ${goals || 'general wellness'}
- Nutrition goals: ${nutritionGoals || 'balanced'}
- Daily calorie target: ${calorieGoal ? calorieGoal + ' calories total per day' : 'not specified - estimate reasonable calories'}
- Dietary: ${prefs?.dietary?.length ? prefs.dietary.join(', ') : 'none'}
- Allergies: ${prefs?.allergies || 'none'}
- Cuisines: ${prefs?.cuisines?.length ? prefs.cuisines.join(', ') : 'open to anything'}

Generate a 7-day meal plan with breakfast, lunch, dinner, snack per day. Also generate a grocery list by category.


Respond ONLY with valid JSON. Each meal should be an object with "name" and "calories" fields:
{
  "days": {
    "monday": {
      "breakfast":{"name":"oatmeal with berries","calories":350},
      "lunch":{"name":"grilled chicken salad","calories":480},
      "dinner":{"name":"salmon with roasted veg","calories":560},
      "snack":{"name":"apple with almond butter","calories":200}
    },
    "tuesday": {"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "wednesday": {"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "thursday": {"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "friday": {"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "saturday": {"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}},
    "sunday": {"breakfast":{"name":"...","calories":0},"lunch":{"name":"...","calories":0},"dinner":{"name":"...","calories":0},"snack":{"name":"...","calories":0}}
  },
  "grocery": {
    "produce": ["item1"],
    "protein": ["item1"],
    "dairy & eggs": ["item1"],
    "grains & bread": ["item1"],
    "pantry": ["item1"],
    "snacks": ["item1"]
  }
}`
    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 2000, messages: [{ role: 'user', content: prompt }] })
    })
    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error?.message || 'API error')
    const parsed = JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{}')
    return { statusCode: 200, headers, body: JSON.stringify(parsed) }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
