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

// Strip CSS that leaks into the text of JS-heavy pages (e.g. inline web-component
// styles like `:host{display:inline-block}` from X/Twitter). Removes `selector
// { ... }` rule blocks; run twice to catch simple nested at-rules.
function stripCssNoise(s: string): string {
  let out = s;
  for (let i = 0; i < 2; i++) out = out.replace(/[^{}<>]*\{[^{}]*\}/g, ' ');
  return out;
}

export function extractFromHtml(html: string): { title: string; text: string; author?: string } {
  const title =
    meta(html, 'og:title') ||
    decodeEntities(/<title[^>]*>([\s\S]*?)<\/title>/i.exec(html)?.[1] ?? '').trim() ||
    'Untitled';
  const author = meta(html, 'author') || meta(html, 'article:author');
  const description = meta(html, 'og:description') || meta(html, 'description') || '';

  const body = html
    .replace(/<!--[\s\S]*?-->/g, ' ')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, ' ')
    // Declarative shadow DOM (`<template shadowrootmode>`) carries component
    // styles/markup that otherwise leak in as CSS text.
    .replace(/<template[\s\S]*?<\/template>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|br|section|article)>/gi, '\n')
    .replace(/<[^>]+>/g, ' ');
  const text = stripCssNoise(decodeEntities(body))
    .replace(/[ \t]+/g, ' ')
    .replace(/\n\s*\n+/g, '\n\n')
    .trim();

  // For JS-only pages the body is mostly chrome; the clean signal is the
  // og:description. Prefer it, and only append body text when it adds length.
  const combined = (text.length > description.length ? [description, text] : [description])
    .filter(Boolean)
    .join('\n\n')
    .slice(0, 20000);
  return { title, text: combined || description || title, ...(author ? { author } : {}) };
}

/** Extract a tweet/X status id from a URL, or null if it isn't one. */
export function extractTweetId(url: string): string | null {
  const m = /(?:^|[/.])(?:twitter|x)\.com\/[^/]+\/status(?:es)?\/(\d+)/i.exec(url);
  return m ? m[1]! : null;
}

/** Parse Twitter's public syndication (`tweet-result`) JSON into a resource. */
export function parseTweetResult(data: unknown): { title: string; text: string; author?: string } | null {
  const d = data as {
    text?: string;
    full_text?: string;
    // Long-form ("note") tweets carry their full body here.
    note_tweet?: { note_tweet_results?: { result?: { text?: string } } };
    user?: { name?: string; screen_name?: string };
  } | null;
  const longForm = d?.note_tweet?.note_tweet_results?.result?.text;
  const text = (longForm || d?.full_text || d?.text || '').trim();
  if (!d || !text) return null;
  const name = d.user?.name?.trim();
  const handle = d.user?.screen_name?.trim();
  const author = name ? (handle ? `${name} (@${handle})` : name) : handle ? `@${handle}` : undefined;
  const who = name || (handle ? `@${handle}` : '');

  // Build a readable title from the prose, ignoring a bare leading link (common
  // when a post is just a link to an article/thread).
  const prose = text.replace(/https?:\/\/\S+/g, ' ').replace(/\s+/g, ' ').trim();
  const firstLine = prose.split('\n').map((l) => l.trim()).find(Boolean) ?? '';
  const snippet = firstLine ? `${firstLine.slice(0, 80)}${firstLine.length > 80 ? '…' : ''}` : '';
  const title = snippet
    ? `${snippet}${who ? ` — ${who} on X` : ' — X post'}`
    : who
      ? `Post by ${who} on X`
      : 'X post';
  return { title, text, ...(author ? { author } : {}) };
}

export function inferType(url: string): KnowledgeType {
  const u = url.toLowerCase();
  if (/youtube\.com|youtu\.be|vimeo\.com|loom\.com|\.mp4|\.mov/.test(u)) return 'video';
  if (/twitter\.com|x\.com|linkedin\.com|mastodon|threads\.net|facebook\.com|instagram\.com|reddit\.com/.test(u)) return 'post';
  if (/medium\.com|substack\.com|wordpress|\/blog\/|\.blog|dev\.to|hashnode/.test(u)) return 'article';
  return 'link';
}
