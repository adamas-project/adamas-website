// Thin API client. All requests stay on the local machine.

export type Domain = 'hiring' | 'sales' | 'product' | 'finance' | 'ops';
export type Status = 'active' | 'superseded' | 'reversed';

export interface Decision {
  id: string;
  domain: Domain;
  date: string;
  title: string;
  context: string;
  decision: string;
  owner: { role: string; name?: string; dissent?: string[] };
  tradeoffs?: string[];
  links?: string[];
  sources?: string[];
  status?: Status;
  superseded_by?: string;
}

async function req<T>(url: string, opts: RequestInit = {}): Promise<T> {
  const res = await fetch(url, {
    headers: { 'content-type': 'application/json', ...(opts.headers ?? {}) },
    ...opts,
  });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {
      /* ignore */
    }
    throw new Error(msg);
  }
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => req<{ count: number; version: number; domains: Domain[]; statuses: Status[] }>('/api/meta'),
  decisions: (params: { domain?: string; status?: string; role?: string } = {}) => {
    const q = new URLSearchParams(params as Record<string, string>).toString();
    return req<{ role: string; decisions: Decision[] }>(`/api/decisions${q ? `?${q}` : ''}`);
  },
  decision: (id: string, role?: string) =>
    req<{ decision: Decision; neighbors: string[] }>(`/api/decisions/${id}${role ? `?role=${role}` : ''}`),
  graph: () => req<{ nodes: any[]; edges: any[] }>('/api/graph'),
  graphMemory: (topics = false) => req<{ nodes: any[]; edges: any[] }>(`/api/graph/memory${topics ? '?topics=1' : ''}`),
  supersede: (id: string, successor: any) =>
    req(`/api/decisions/${id}/supersede`, { method: 'POST', body: JSON.stringify(typeof successor === 'string' ? { successorId: successor } : { successor }) }),
  update: (id: string, patch: any) => req(`/api/decisions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  createDecision: (payload: any) =>
    req<{ decision: Decision }>('/api/decisions', { method: 'POST', body: JSON.stringify(payload) }),

  inbox: (status = 'pending') => req<{ candidates: any[]; pending: number }>(`/api/inbox?status=${status}`),
  ingest: () => req<{ added: number; pending: number }>('/api/inbox/ingest', { method: 'POST', body: '{}' }),
  ingestSources: (sources: any[]) =>
    req<{ added: number; candidates: any[]; pending: number }>('/api/inbox/ingest', {
      method: 'POST',
      body: JSON.stringify({ sources }),
    }),
  confirm: (id: string, overrides: any = {}) => req(`/api/inbox/${id}/confirm`, { method: 'POST', body: JSON.stringify(overrides) }),
  dismiss: (id: string) => req(`/api/inbox/${id}/dismiss`, { method: 'POST', body: '{}' }),

  transcript: (payload: { text: string; filename?: string; title?: string; date?: string; summarize?: boolean }) =>
    req<{ summarized: boolean; summary: string; added: number; candidates: any[]; pending: number }>(
      '/api/inbox/transcript',
      { method: 'POST', body: JSON.stringify(payload) },
    ),

  uploadAudio: async (file: File, fields: { title?: string; date?: string } = {}) => {
    const fd = new FormData();
    if (fields.title) fd.append('title', fields.title);
    if (fields.date) fd.append('date', fields.date);
    fd.append('file', file);
    const res = await fetch('/api/inbox/audio', { method: 'POST', body: fd });
    if (!res.ok) {
      let msg = res.statusText;
      try {
        msg = (await res.json()).error ?? msg;
      } catch {
        /* ignore */
      }
      throw new Error(msg);
    }
    return res.json() as Promise<{ transcript: string; summarized: boolean; summary: string; added: number; pending: number }>;
  },

  connectors: () => req<{ connectors: any[] }>('/api/connectors'),
  pullConnector: (id: string) =>
    req<{ scanned: number; skipped: number; newDocuments: number; added: number; pending: number }>(
      `/api/connectors/${id}/pull`,
      { method: 'POST', body: '{}' },
    ),

  assets: () => req<{ assets: any[]; autoRegenerate: boolean }>('/api/assets'),
  asset: (id: string) => req<{ entry: any; asset: any }>(`/api/assets/${id}`),
  generate: (id: string) => req<{ asset: any }>(`/api/assets/${id}/generate`, { method: 'POST', body: '{}' }),
  regenerate: (id: string) => req<{ asset: any }>(`/api/assets/${id}/regenerate`, { method: 'POST', body: '{}' }),
  setAutoRegen: (on: boolean) => req('/api/assets/auto-regenerate', { method: 'POST', body: JSON.stringify({ on }) }),

  boundaryStatus: () => req<{ cloudTransmissions: number; log: any[] }>('/api/boundary/status'),
  prepare: (purpose: string) => req<{ preview: any }>('/api/boundary/prepare', { method: 'POST', body: JSON.stringify({ purpose }) }),
  approve: (taskId: string) => req<{ route: string; added: any[] }>(`/api/boundary/${taskId}/approve`, { method: 'POST', body: '{}' }),
  decline: (taskId: string) => req<{ route: string; added: any[] }>(`/api/boundary/${taskId}/decline`, { method: 'POST', body: '{}' }),

  knowledge: (params: { q?: string; tag?: string; type?: string } = {}) => {
    const qs = new URLSearchParams(params as Record<string, string>).toString();
    return req<{ entries: any[]; tags: string[]; count: number }>(`/api/knowledge${qs ? `?${qs}` : ''}`);
  },
  knowledgeGet: (id: string) => req<{ entry: any }>(`/api/knowledge/${id}`),
  addKnowledge: (payload: { url?: string; text?: string; title?: string; type?: string; tags?: string[] }) =>
    req<{ entry: any }>('/api/knowledge', { method: 'POST', body: JSON.stringify(payload) }),
  deleteKnowledge: (id: string) => req(`/api/knowledge/${id}`, { method: 'DELETE' }),

  obsidian: () => req<{ dir: string; exists: boolean; readiness: any }>('/api/obsidian'),
  obsidianExport: () => req<{ path: string; decisions: number; knowledge: number; files: number; readiness: any }>('/api/obsidian/export', { method: 'POST', body: '{}' }),
  obsidianImport: () => req<{ imported: number; titles: string[] }>('/api/obsidian/import', { method: 'POST', body: '{}' }),

  security: () => req<any>('/api/security'),
  backup: (passphrase: string) => req<{ file: string }>('/api/backup', { method: 'POST', body: JSON.stringify({ passphrase }) }),
  pricing: (locale: string) => req<{ pricing: any }>(`/api/pricing?locale=${locale}`),
};

// Domain colors live as CSS tokens; see tokens.ts (domainColor / domainVar).
