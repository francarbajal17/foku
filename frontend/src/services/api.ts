import type { Contact, ContactConfig, AppConfig } from '@foku/shared'

async function apiFetch<T>(url: string, options?: RequestInit): Promise<T> {
  const res = await fetch(url, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as { error: string }).error ?? res.statusText)
  }
  return res.json() as Promise<T>
}

export async function getContacts(): Promise<Contact[]> {
  const data = await apiFetch<{ contacts: Contact[] } | { status: string }>('/api/contacts')
  if ('status' in data) return [] // 202 loading — return empty, caller shows spinner
  return data.contacts
}

export async function refreshContacts(): Promise<Contact[]> {
  const data = await apiFetch<{ contacts: Contact[] }>('/api/contacts/refresh', {
    method: 'POST',
  })
  return data.contacts
}

export async function patchContactConfig(updates: ContactConfig[]): Promise<ContactConfig[]> {
  const data = await apiFetch<{ contacts: ContactConfig[] }>('/api/config/contacts', {
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ contacts: updates }),
  })
  return data.contacts
}

export async function getConfig(): Promise<AppConfig> {
  return apiFetch<AppConfig>('/api/config')
}
