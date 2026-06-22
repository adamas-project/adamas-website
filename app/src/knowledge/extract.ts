import type { KnowledgeType } from './schema.js';

// Lightweight, dependency-free readable-text extraction. Not a full Readability
// implementation, but enough to summarize an article/post/video page locally.

function decodeEntities(s: string): string {
  return s
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)));
}

function meta(html: string, name: string): string | undefined {
  const patterns = [
    new RegExp(`<meta[^>]+(?:property|name)=["']${name}["'][^>]*content=["']([^"']+)["']`, 'i'),
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]*(?:property|name)=["']${name}["']`, 'i'),
  ];
  for (const re of patterns) {
    const m = re.exec(html);
    if (m && m[1]) return decodeEntities(m[1]).trim();
  }
  return undefined;
}

export function extractFromHtml(html: string): { title: string; text: string; author?: string } {
  const title =
    meta(html, 'og:title') ||
    decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim() ||
    'Untitled';
  const author = meta(html, 'author') || meta(html, 'article:author');
  const description = meta(html, 'og:description') || meta(html, 'description') || '';

  const body = html
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const text = decodeEntities(body).replace(/[ \t]+/g, ' ').replace(/\n\s*\n+/g, '\n\n').trim();

  const combined = [description, text].filter(Boolean).join('\n\n').slice(0, 20000);
  return { title, text: combined || description || title, ...(author ? { author } : {}) };
}

export function inferType(url: string): KnowledgeType {
  const u = url.toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com|\.mp4|\.mov/.test(u)) return 'video';
  if (/twitter\.com|x\.com|linkedin\.com|mastodon|threads\.net|facebook\.com|instagram\.com|reddit\.com/.test(u)) return 'post';
  if (/medium\.com|substack\.com|wordpress|\/blog\/|\.blog|dev\.to|hashnode/.test(u)) return 'article';
  return 'link';
}
