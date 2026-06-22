import { extractFromHtml, inferType } from './extract.js';
import type { KnowledgeType } from './schema.js';

export interface FetchedResource {
  title: string;
  text: string;
  author?: string;
  type: KnowledgeType;
}

/**
 * Fetch a public URL and extract readable text for summarization. This is an
 * inbound pull of public content onto the machine — no vault data is sent out.
 * No JS rendering: paywalled/JS-only pages and video transcripts won't be
 * captured beyond their title/description (paste those manually).
 */
export async function fetchResource(url: string, timeoutMs = 20000): Promise<FetchedResource> {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    throw new Error('That is not a valid URL.');
  }
  if (!/^https?:$/.test(parsed.protocol)) throw new Error('Only http(s) URLs are supported.');

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: { 'user-agent': 'Mozilla/5.0 (compatible; ADAMAS/1.0; +local)', accept: 'text/html,*/*' },
    });
    if (!res.ok) throw new Error(`Could not fetch the URL (HTTP ${res.status}).`);
    const ct = res.headers.get('content-type') ?? '';
    const body = await res.text();
    const type = inferType(url);
    if (ct.includes('html') || /<html/i.test(body)) {
      const { title, text, author } = extractFromHtml(body);
      return { title, text, type, ...(author ? { author } : {}) };
    }
    // Plain text / markdown response.
    return { title: parsed.hostname + parsed.pathname, text: body.slice(0, 20000), type };
  } finally {
    clearTimeout(timer);
  }
}
