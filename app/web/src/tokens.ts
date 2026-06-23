import type { Domain } from './api';

// Design tokens. The CSS custom properties in styles.css are the single source
// of truth; this module reads them at runtime so non-CSS consumers (the Canvas
// decision graph) use the exact same brand colors. The fallback mirror is only
// used if the stylesheet has not been applied yet.

const DOMAIN_FALLBACK: Record<Domain, string> = {
  hiring: '#7aa2ff',
  sales: '#ffd479',
  product: '#7ee0c0',
  finance: '#ff9aa2',
  ops: '#c79bff',
};

const TOKEN_FALLBACK: Record<string, string> = {
  '--bg': '#000000',
  '--surface': '#161618',
  '--surface-2': '#1f1f22',
  '--border': 'rgba(255,255,255,0.11)',
  '--text': '#f5f5f7',
  '--text-muted': '#a1a1a6',
  '--accent': '#c9a84c',
  '--accent-lt': '#e3c977',
  '--ok': '#5ecc73',
  '--warn': '#e6b450',
  '--danger': '#ff6b5e',
};

let root: HTMLElement | null = null;
function styleRoot(): HTMLElement | null {
  if (typeof document === 'undefined') return null;
  root ??= document.documentElement;
  return root;
}

/** Read a CSS custom property (e.g. "--accent"), with a sensible fallback. */
export function token(name: string, fallback?: string): string {
  const el = styleRoot();
  if (el) {
    const v = getComputedStyle(el).getPropertyValue(name).trim();
    if (v) return v;
  }
  return fallback ?? TOKEN_FALLBACK[name] ?? '';
}

/** Resolved hex/rgb for a domain — for Canvas/WebGL consumers. */
export function domainColor(domain: Domain): string {
  return token(`--domain-${domain}`, DOMAIN_FALLBACK[domain]);
}

/** CSS `var()` reference for a domain — for inline DOM styles. */
export function domainVar(domain: Domain): string {
  return `var(--domain-${domain})`;
}

/** Color for a memory-graph node by kind (decision / knowledge / people / records / hub / tag). */
export function memoryNodeColor(node: { kind?: string; domain?: Domain }): string {
  if (node.kind === 'hub') return token('--text', '#f5f5f7');
  if (node.kind === 'knowledge') return token('--accent-lt', '#e3c977');
  if (node.kind === 'tag') return '#5fb8a8'; // teal — meta/topic nodes
  if (node.kind === 'person') return '#e0a3ff'; // lilac — team
  if (node.kind === 'record') return '#7aa2ff'; // blue — diligence records
  return node.domain ? domainColor(node.domain) : token('--accent', '#c9a84c');
}
