import path from 'node:path';
import { promises as fs } from 'node:fs';

// Lightweight white-label branding so the dashboard / PDF / top bar can carry the
// operator's company identity. Stored locally next to the other settings.
export interface BrandSettings {
  companyName: string;
  tagline: string;
  /** Accent color (hex) applied as --accent; empty = the ADAMAS default gold. */
  accentColor: string;
}

const DEFAULTS: BrandSettings = { companyName: 'ADAMAS', tagline: '', accentColor: '' };

function brandFile(root: string): string {
  return path.join(root, 'brand-settings.json');
}

export async function loadBrand(root: string): Promise<BrandSettings> {
  try {
    const s = JSON.parse(await fs.readFile(brandFile(root), 'utf8')) as Partial<BrandSettings>;
    return { ...DEFAULTS, ...s };
  } catch {
    return { ...DEFAULTS };
  }
}

export async function saveBrand(root: string, patch: Partial<BrandSettings>): Promise<BrandSettings> {
  const next = { ...(await loadBrand(root)), ...patch };
  await fs.writeFile(brandFile(root), JSON.stringify(next, null, 2));
  return next;
}
