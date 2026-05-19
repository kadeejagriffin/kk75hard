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
    const { prefs, goals, type, meal } = JSON.parse(event.body)

    // Recipe request
    if (type === 'recipe') {
      const recipePrompt = `Give me a simple, clear recipe for: "${meal}"

Format as JSON only:
{
  "name": "meal name",
  "time": "total time",
  "serves": "servings",
  "ingredients": ["ingredient 1 with amount", "ingredient 2"],
  "steps": ["step 1", "step 2", "step 3"],
  "tip": "one helpful cooking tip"
}`
      const resp = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: 'claude-haiku-4-5-20251001', max_tokens: 800, messages: [{ role: 'user', content: recipePrompt }] })
      })
      const data = await resp.json()
      if (!resp.ok) throw new Error(data.error?.message || 'API error')
      const parsed = JSON.parse(data.content?.[0]?.text?.replace(/```json|```/g, '').trim() || '{}')
      return { statusCode: 200, headers, body: JSON.stringify(parsed) }
    }

    // Meal plan request
    const nutritionGoals = Array.isArray(prefs.goal) ? prefs.goal.join(', ') : (prefs.goal || 'eat healthier')
    const prompt = `You are a friendly nutritionist helping someone on a 75-day wellness challenge called "Magical Sunshine".

User's details:
- Wellness goals: ${goals || 'general wellness'}
- Nutrition goals: ${nutritionGoals}
- Dietary preferences: ${prefs.dietary?.length ? prefs.dietary.join(', ') : 'none'}
- Allergies/restrictions: ${prefs.allergies || 'none'}
- Cuisine preferences: ${prefs.cuisines?.length ? prefs.cuisines.join(', ') : 'open to anything'}

Generate a 7-day meal plan with breakfast, lunch, dinner, and snack per day. Make meals delicious, realistic, and aligned with their goals. Also generate a grocery list by category.

Respond ONLY with valid JSON:
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
