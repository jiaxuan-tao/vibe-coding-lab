// Client-side Qwen API wrapper using a user-provided browser-local key.
// Never put a private project key in a VITE_* variable: Vite would expose it in the build.

const QWEN_MODEL = 'qwen-flash'
const QWEN_URL = 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions'

function getStoredKey() {
  try {
    const state = JSON.parse(localStorage.getItem('shiori-ui') || '{}')
    return state?.state?.qwenApiKey || null
  } catch { return null }
}

export async function callQwenClient(prompt, { maxOutputTokens = 2048, temperature = 0.7 } = {}) {
  const key = getStoredKey()
  if (!key) return null

  try {
    const res = await fetch(QWEN_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${key}`,
      },
      body: JSON.stringify({
        model: QWEN_MODEL,
        messages: [
          { role: 'system', content: '你是严谨的中文学习助手。严格按用户要求的 JSON 格式返回，不要添加解释。' },
          { role: 'user', content: prompt },
        ],
        temperature,
        max_tokens: maxOutputTokens,
      }),
    })
    if (!res.ok) return null
    const data = await res.json()
    return data?.choices?.[0]?.message?.content || null
  } catch {
    return null
  }
}

export function hasQwenClientKey() {
  return !!getStoredKey()
}
