/**
 * API Client — conecta o frontend ao backend novo
 *
 * Configura a BASE_URL via variável de ambiente:
 *   VITE_API_URL=http://localhost:3000   (dev)
 *   VITE_API_URL=https://api.terapiaacolher.com.br  (prod)
 *
 * Admin auth: todas as rotas admin enviam o header
 *   Authorization: Bearer <VITE_ADMIN_SECRET>
 */

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000'
const ADMIN_SECRET = import.meta.env.VITE_ADMIN_SECRET || ''

function adminHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${ADMIN_SECRET}`,
  }
}

function therapistHeaders(): Record<string, string> {
  const token = localStorage.getItem('therapist_token') || ''
  return {
    'Content-Type': 'application/json',
    'x-therapist-token': token,
  }
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, options)
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: res.statusText }))
    throw new Error((err as any).error || res.statusText)
  }
  return res.json() as Promise<T>
}

// ─── Dashboard ────────────────────────────────────────────────────────────────

export const api = {
  dashboard: {
    stats: () => request<any>('/api/dashboard/stats', { headers: adminHeaders() }),
  },

  // ─── Terapeutas ─────────────────────────────────────────────────────────────

  therapists: {
    list: (params?: { search?: string; status?: string }) => {
      const qs = new URLSearchParams(params as any).toString()
      return request<any[]>(`/api/therapists${qs ? `?${qs}` : ''}`, { headers: adminHeaders() })
    },
    get: (id: number) =>
      request<any>(`/api/therapists/${id}`, { headers: adminHeaders() }),
    create: (data: any) =>
      request<any>('/api/therapists', {
        method: 'POST', headers: adminHeaders(), body: JSON.stringify(data),
      }),
    update: (id: number, data: any) =>
      request<any>(`/api/therapists/${id}`, {
        method: 'PUT', headers: adminHeaders(), body: JSON.stringify(data),
      }),
    authorize: (id: number, balance?: number) =>
      request<any>(`/api/therapists/${id}/authorize`, {
        method: 'PATCH', headers: adminHeaders(), body: JSON.stringify({ balance }),
      }),
    deactivate: (id: number) =>
      request<any>(`/api/therapists/${id}`, {
        method: 'DELETE', headers: adminHeaders(),
      }),
    // Cadastro público — sem auth
    register: (data: any) =>
      request<any>('/api/public/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      }),
  },

  // ─── Pacientes ───────────────────────────────────────────────────────────────

  patients: {
    list: (params?: { search?: string; status?: string }) => {
      const qs = new URLSearchParams(params as any).toString()
      return request<any[]>(`/api/patients${qs ? `?${qs}` : ''}`, { headers: adminHeaders() })
    },
    get: (id: number) =>
      request<any>(`/api/patients/${id}`, { headers: adminHeaders() }),
    update: (id: number, data: any) =>
      request<any>(`/api/patients/${id}`, {
        method: 'PUT', headers: adminHeaders(), body: JSON.stringify(data),
      }),
    create: (data: any) =>
      request<any>('/api/patients', {
        method: 'POST', headers: adminHeaders(), body: JSON.stringify(data),
      }),
    archive: (id: number) =>
      request<any>(`/api/patients/${id}/archive`, {
        method: 'PATCH', headers: adminHeaders(),
      }),
  },

  // ─── Atribuições ─────────────────────────────────────────────────────────────

  assignments: {
    list: () => request<any[]>('/api/assignments', { headers: adminHeaders() }),
    replenishmentList: () =>
      request<any[]>('/api/assignments/replenishment', { headers: adminHeaders() }),
    approveReplenishment: (id: number) =>
      request<any>(`/api/assignments/replenishment/${id}/approve`, {
        method: 'PATCH', headers: adminHeaders(),
      }),
  },

  // ─── Matching ────────────────────────────────────────────────────────────────

  matching: {
    getMode: () => request<any>('/api/matching/mode', { headers: adminHeaders() }),
    setMode: (mode: string) =>
      request<any>('/api/matching/mode', {
        method: 'PUT', headers: adminHeaders(), body: JSON.stringify({ mode }),
      }),
    run: () =>
      request<any>('/api/matching/run', {
        method: 'POST', headers: adminHeaders(),
      }),
    suggest: (patient_id: number) =>
      request<any>('/api/matching/suggest', {
        method: 'POST', headers: adminHeaders(), body: JSON.stringify({ patient_id }),
      }),
    assign: (patient_id: number, therapist_id: number, score?: number, reason?: string) =>
      request<any>('/api/matching/assign', {
        method: 'POST',
        headers: adminHeaders(),
        body: JSON.stringify({ patient_id, therapist_id, score, reason }),
      }),
    log: () => request<any[]>('/api/matching/log', { headers: adminHeaders() }),
  },

  // ─── Webhooks (P4, P5, P6) ───────────────────────────────────────────────────

  webhooks: {
    kiwify: {
      list: (params?: { status?: string }) => {
        const qs = new URLSearchParams(params as any).toString()
        return request<any[]>(`/api/webhooks/kiwify${qs ? `?${qs}` : ''}`, { headers: adminHeaders() })
      },
    },
    manychat: {
      received: (params?: { status?: string }) => {
        const qs = new URLSearchParams(params as any).toString()
        return request<any[]>(`/api/webhooks/manychat/received${qs ? `?${qs}` : ''}`, { headers: adminHeaders() })
      },
      sent: (params?: { type?: string }) => {
        const qs = new URLSearchParams(params as any).toString()
        return request<any[]>(`/api/webhooks/manychat/sent${qs ? `?${qs}` : ''}`, { headers: adminHeaders() })
      },
    },
  },

  // ─── Portal do Terapeuta ─────────────────────────────────────────────────────

  therapistPortal: {
    login: (credential: string) =>
      request<{ token: string; therapist: { id: number; name: string; status: string } }>('/api/therapist/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ credential }),
      }),
    getProfile: () =>
      request<any>('/api/therapist/me', { headers: therapistHeaders() }),
    updateProfile: (data: any) =>
      request<any>('/api/therapist/me', {
        method: 'PUT', headers: therapistHeaders(), body: JSON.stringify(data),
      }),
    getAssignments: () =>
      request<any[]>('/api/therapist/me/assignments', { headers: therapistHeaders() }),
    getBalance: () =>
      request<any>('/api/therapist/me/balance', { headers: therapistHeaders() }),
    requestReplenishment: (data: any) =>
      request<any>('/api/therapist/me/replenishment', {
        method: 'POST', headers: therapistHeaders(), body: JSON.stringify(data),
      }),
  },
}
