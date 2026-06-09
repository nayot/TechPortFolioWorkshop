async function request(path, options = {}) {
  const res = await fetch(path, { credentials: 'include', ...options });
  if (!res.ok) {
    const body = await res.json().catch(() => ({ error: res.statusText }));
    throw new Error(body.error || `HTTP ${res.status}`);
  }
  return res.json();
}

export const api = {
  get: (path) => request(path),
  post: (path, body) => request(path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  put: (path, body) => request(path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }),
  delete: (path) => request(path, { method: 'DELETE' }),
};

export async function aiComplete(messages, model) {
  const data = await api.post('/api/ai/complete', { messages, model });
  return data.content;
}

export function stripFences(text) {
  return text.replace(/^```[a-z]*\n?/m, '').replace(/\n?```\s*$/m, '').trim();
}

export function parseJsonSafe(text) {
  try {
    return JSON.parse(stripFences(text));
  } catch {
    return null;
  }
}
