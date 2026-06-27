// Thin API client. All requests stay on the local machine.
import { qs } from './query';

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
  // Only declare a JSON content-type when there's actually a body. Sending it on
  // a bodyless DELETE makes the server reject an "empty JSON body" with a 400.
  const headers: Record<string, string> = { ...(opts.headers as Record<string, string> | undefined) };
  if (opts.body != null && headers['content-type'] == null) headers['content-type'] = 'application/json';
  const res = await fetch(url, { ...opts, headers });
  if (!res.ok) {
    let msg = res.statusText;
    try {
      msg = (await res.json()).error ?? msg;
    } catch {
      /* ignore */
    }
    const err = new Error(msg) as Error & { status?: number };
    err.status = res.status; // let callers distinguish 404 (already gone) from 5xx
    throw err;
  }
  return res.json() as Promise<T>;
}

export const api = {
  meta: () => req<{ count: number; version: number; domains: Domain[]; statuses: Status[] }>('/api/meta'),
  dashboard: () => req<{
    counts: { decisions: number; knowledge: number; people: number; records: number; glossary: number };
    decisions: { byDomain: Record<string, number>; active: number; superseded: number };
    people: { total: number; keyPeople: number; byKind: Record<string, number> };
    revenue: {
      currency: string; arr: number; oneOff: number; totalContractValue: number;
      customers: number; activeCustomers: number; atRiskCustomers: number; avgContract: number;
      topCustomers: Array<{ id: string; title: string; amount: number; recurring: boolean; status?: string }>;
      byYear: Array<{ year: string; amount: number }>;
    };
    keyMetrics: Array<{ metric: string; period?: string; amount?: number; currency?: string; status?: string }>;
    records: { total: number; byCategory: Record<string, number> };
    risks: { total: number; bySeverity: { low: number; medium: number; high: number } };
    readiness: { score: number; traceabilityPct: number };
  }>('/api/dashboard'),
  decisions: (params: { domain?: string; status?: string; role?: string } = {}) =>
    req<{ role: string; decisions: Decision[] }>(`/api/decisions${qs(params)}`),
  decision: (id: string, role?: string) =>
    req<{ decision: Decision; neighbors: string[] }>(`/api/decisions/${id}${role ? `?role=${role}` : ''}`),
  graph: () => req<{ nodes: any[]; edges: any[] }>('/api/graph'),
  graphMemory: (topics = false, limit?: number) =>
    req<{ nodes: any[]; edges: any[] }>(`/api/graph/memory${qs({ topics: topics ? '1' : undefined, limit: limit != null ? String(limit) : undefined })}`),
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
  autoConfirm: (threshold?: number) =>
    req<{ confirmedCount: number; skipped: number; pending: number; threshold: number }>('/api/inbox/auto-confirm', {
      method: 'POST',
      body: JSON.stringify(threshold != null ? { threshold } : {}),
    }),

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

  gmailStatus: () => req<{ configured: boolean; isGmail: boolean; user?: string; source: 'saved' | 'env' | null; label: string }>('/api/gmail/status'),
  gmailSaveSettings: (user: string, pass: string) =>
    req<{ ok: boolean; user: string }>('/api/gmail/settings', { method: 'POST', body: JSON.stringify({ user, pass }) }),
  gmailClearSettings: () => req<{ ok: boolean }>('/api/gmail/settings', { method: 'DELETE' }),
  gmailTestConnection: () =>
    req<{ ok: boolean; mailbox: string; messages: number }>('/api/gmail/test-connection', { method: 'POST', body: '{}' }),
  gmailTestEmail: () =>
    req<{ subject: string }>('/api/gmail/test-email', { method: 'POST', body: '{}' }),
  gmailLabelDecisions: () =>
    req<{ scanned: number; labeled: number; titles: string[] }>('/api/gmail/label-decisions', {
      method: 'POST',
      body: '{}',
    }),

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

  knowledge: (params: { q?: string; tag?: string; type?: string } = {}) =>
    req<{ entries: any[]; tags: string[]; count: number }>(`/api/knowledge${qs(params)}`),
  knowledgeGet: (id: string) => req<{ entry: any }>(`/api/knowledge/${id}`),

  glossary: (params: { q?: string; tag?: string } = {}) =>
    req<{ terms: any[]; tags: string[]; count: number }>(`/api/glossary${qs(params)}`),
  addGlossary: (payload: { term: string; definition: string; aliases?: string[]; tags?: string[]; source?: string }) =>
    req<{ entry: any }>('/api/glossary', { method: 'POST', body: JSON.stringify(payload) }),
  updateGlossary: (id: string, patch: { term?: string; definition?: string; aliases?: string[]; tags?: string[]; source?: string }) =>
    req<{ entry: any }>(`/api/glossary/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  defineGlossary: (term: string) =>
    req<{ term: string; definition: string; aliases: string[]; tags: string[]; source: 'builtin' | 'model' | 'draft' }>(
      '/api/glossary/define',
      { method: 'POST', body: JSON.stringify({ term }) },
    ),
  deleteGlossary: (id: string) => req(`/api/glossary/${id}`, { method: 'DELETE' }),
  addKnowledge: (payload: { url?: string; text?: string; title?: string; type?: string; tags?: string[] }) =>
    req<{ entry: any }>('/api/knowledge', { method: 'POST', body: JSON.stringify(payload) }),
  updateKnowledge: (id: string, patch: { title?: string; summary?: string; takeaways?: string[]; tags?: string[]; type?: string; source?: string }) =>
    req<{ entry: any }>(`/api/knowledge/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteKnowledge: (id: string) => req(`/api/knowledge/${id}`, { method: 'DELETE' }),

  people: (params: { q?: string; kind?: string } = {}) =>
    req<{ people: any[]; count: number; duplicates: number }>(`/api/people${qs(params)}`),
  mergePeople: () =>
    req<{ merged: number; names: string[] }>('/api/people/merge-duplicates', { method: 'POST', body: '{}' }),
  addPerson: (payload: {
    name: string;
    role: string;
    kind?: string;
    cv?: string;
    bio?: string;
    keyPerson?: boolean;
    startDate?: string;
    location?: string;
    email?: string;
  }) => req<{ entry: any }>('/api/people', { method: 'POST', body: JSON.stringify(payload) }),
  updatePerson: (id: string, patch: {
    name?: string;
    role?: string;
    kind?: string;
    summary?: string;
    skills?: string[];
    keyPerson?: boolean;
    startDate?: string;
    location?: string;
    email?: string;
  }) => req<{ entry: any }>(`/api/people/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deletePerson: (id: string) => req(`/api/people/${id}`, { method: 'DELETE' }),

  records: (params: { q?: string; category?: string } = {}) =>
    req<{ records: any[]; categories: string[]; count: number }>(`/api/records${qs(params)}`),
  addRecord: (payload: Record<string, unknown>) =>
    req<{ entry: any }>('/api/records', { method: 'POST', body: JSON.stringify(payload) }),
  updateRecord: (id: string, patch: Record<string, unknown>) =>
    req<{ entry: any }>(`/api/records/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),
  deleteRecord: (id: string) => req(`/api/records/${id}`, { method: 'DELETE' }),

  obsidian: () => req<{ dir: string; exists: boolean; readiness: any }>('/api/obsidian'),
  obsidianExport: () => req<{ path: string; decisions: number; knowledge: number; files: number; readiness: any }>('/api/obsidian/export', { method: 'POST', body: '{}' }),
  obsidianImport: () => req<{ imported: number; titles: string[] }>('/api/obsidian/import', { method: 'POST', body: '{}' }),

  security: () => req<any>('/api/security'),
  backup: (passphrase: string) => req<{ file: string }>('/api/backup', { method: 'POST', body: JSON.stringify({ passphrase }) }),
  pricing: (locale: string) => req<{ pricing: any }>(`/api/pricing?locale=${locale}`),
  demoSeed: () => req<{ decisions: number; knowledge: number; people: number; records: number; glossary: number; noop?: boolean }>('/api/demo', { method: 'POST', body: '{}' }),
  demoReset: () => req<{ reset: boolean; decisions: number; knowledge: number; people: number; records: number; glossary: number }>('/api/demo/reset', { method: 'POST', body: '{}' }),
};

// Domain colors live as CSS tokens; see tokens.ts (domainColor / domainVar).
