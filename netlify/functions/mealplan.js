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
    const { prefs, goals } = JSON.parse(event.body)

    const prompt = `You are a friendly nutritionist helping someone on a 75-day personal wellness challenge called "Magical Sunshine".

User's details:
- Wellness goals: ${goals || 'general wellness'}
- Dietary preferences: ${prefs.dietary?.length ? prefs.dietary.join(', ') : 'none specified'}
- Allergies/restrictions: ${prefs.allergies || 'none'}
- Nutrition goal: ${prefs.goal || 'eat healthier'}
- Cuisine preferences: ${prefs.cuisines?.length ? prefs.cuisines.join(', ') : 'open to anything'}

Generate a 7-day meal plan (Monday-Sunday) with breakfast, lunch, dinner, and one snack per day. Keep it realistic, delicious, and achievable for someone with a busy lifestyle. Make the meals feel special and nourishing, not bland diet food.

Also generate a consolidated grocery list organized by category.

Respond ONLY with valid JSON, no extra text:
{
  "days": {
    "monday": {"breakfast":"...","lunch":"...","dinner":"...","snack":"..."},
    "tuesday": {"breakfast":"...","lunch":"...","dinner":"...","snack":"..."},
    "wednesday": {"breakfast":"...","lunch":"...","dinner":"...","snack":"..."},
    "thursday": {"breakfast":"...","lunch":"...","dinner":"...","snack":"..."},
    "friday": {"breakfast":"...","lunch":"...","dinner":"...","snack":"..."},
    "saturday": {"breakfast":"...","lunch":"...","dinner":"...","snack":"..."},
    "sunday": {"breakfast":"...","lunch":"...","dinner":"...","snack":"..."}
  },
  "grocery": {
    "produce": ["item1","item2"],
    "protein": ["item1","item2"],
    "dairy & eggs": ["item1","item2"],
    "grains & bread": ["item1","item2"],
    "pantry": ["item1","item2"],
    "snacks": ["item1","item2"]
  }
}`

    const resp = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': process.env.ANTHROPIC_API_KEY,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-haiku-4-5-20251001',
        max_tokens: 2000,
        messages: [{ role: 'user', content: prompt }]
      })
    })

    const data = await resp.json()
    if (!resp.ok) throw new Error(data.error?.message || 'API error')

    const text = data.content?.[0]?.text || ''
    const clean = text.replace(/```json|```/g, '').trim()
    const parsed = JSON.parse(clean)

    return { statusCode: 200, headers, body: JSON.stringify(parsed) }
  } catch (e) {
    console.error(e)
    return { statusCode: 500, headers, body: JSON.stringify({ error: e.message }) }
  }
}
