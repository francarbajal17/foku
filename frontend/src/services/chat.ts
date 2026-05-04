async function chatFetch(path: string, body: object): Promise<void> {
  const res = await fetch(path, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error ?? res.statusText)
  }
}

export async function openConversation(jid: string): Promise<void> {
  await chatFetch('/api/chat/open', { jid })
}

export async function sendMessage(jid: string, text: string): Promise<void> {
  await chatFetch('/api/chat/send', { jid, text })
}

export async function closeConversation(jid: string): Promise<void> {
  await chatFetch('/api/chat/close', { jid })
}
