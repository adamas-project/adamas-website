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
  supersede: (id: string, successor: any) =>
    req(`/api/decisions/${id}/supersede`, { method: 'POST', body: JSON.stringify(typeof successor === 'string' ? { successorId: successor } : { successor }) }),
  update: (id: string, patch: any) => req(`/api/decisions/${id}`, { method: 'PATCH', body: JSON.stringify(patch) }),

  inbox: (status = 'pending') => req<{ candidates: any[]; pending: number }>(`/api/inbox?status=${status}`),
  ingest: () => req<{ added: number; pending: number }>('/api/inbox/ingest', { method: 'POST', body: '{}' }),
  confirm: (id: string, overrides: any = {}) => req(`/api/inbox/${id}/confirm`, { method: 'POST', body: JSON.stringify(overrides) }),
  dismiss: (id: string) => req(`/api/inbox/${id}/dismiss`, { method: 'POST', body: '{}' }),

  assets: () => req<{ assets: any[]; autoRegenerate: boolean }>('/api/assets'),
  asset: (id: string) => req<{ entry: any; asset: any }>(`/api/assets/${id}`),
  generate: (id: string) => req<{ asset: any }>(`/api/assets/${id}/generate`, { method: 'POST', body: '{}' }),
  regenerate: (id: string) => req<{ asset: any }>(`/api/assets/${id}/regenerate`, { method: 'POST', body: '{}' }),
  setAutoRegen: (on: boolean) => req('/api/assets/auto-regenerate', { method: 'POST', body: JSON.stringify({ on }) }),

  boundaryStatus: () => req<{ cloudTransmissions: number; log: any[] }>('/api/boundary/status'),
  prepare: (purpose: string) => req<{ preview: any }>('/api/boundary/prepare', { method: 'POST', body: JSON.stringify({ purpose }) }),
  approve: (taskId: string) => req<{ route: string; added: any[] }>(`/api/boundary/${taskId}/approve`, { method: 'POST', body: '{}' }),
  decline: (taskId: string) => req<{ route: string; added: any[] }>(`/api/boundary/${taskId}/decline`, { method: 'POST', body: '{}' }),

  security: () => req<any>('/api/security'),
  backup: (passphrase: string) => req<{ file: string }>('/api/backup', { method: 'POST', body: JSON.stringify({ passphrase }) }),
  pricing: (locale: string) => req<{ pricing: any }>(`/api/pricing?locale=${locale}`),
};

export const DOMAIN_COLOR: Record<Domain, string> = {
  hiring: '#7aa2ff',
  sales: '#ffd479',
  product: '#7ee0c0',
  finance: '#ff9aa2',
  ops: '#c79bff',
};
