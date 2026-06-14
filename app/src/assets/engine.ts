import path from 'node:path';
import { promises as fs } from 'node:fs';
import { createHash } from 'node:crypto';
import type { Ledger } from '../ledger/ledger.js';
import type { Decision } from '../schema/decision.schema.js';
import { atomicWrite } from '../ledger/storage.js';
import { resolveQuery } from './query.js';
import { ASSET_TEMPLATES, getTemplate, type AssetTemplate } from './templates.js';
import { renderAsset } from './render.js';
import type {
  AssetRegistryEntry,
  GeneratedAsset,
  GeneratedSection,
} from './types.js';

function stableStringify(value: unknown): string {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(',')}]`;
  if (value && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    return `{${Object.keys(obj)
      .sort()
      .map((k) => `${JSON.stringify(k)}:${stableStringify(obj[k])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function hashDecision(d: Decision): string {
  return createHash('sha1').update(stableStringify(d)).digest('hex').slice(0, 12);
}

interface Built {
  sections: GeneratedSection[];
  bySection: Record<string, Decision[]>;
  snapshot: Record<string, string>;
}

/**
 * The Asset Engine assembles assets ONLY from existing ledger decisions, tags
 * every section with the source decision ids (SRC), and maintains a dependency
 * graph (section -> source ids). When any source decision changes, dependent
 * assets are flagged stale; one-click regenerate (or opt-in auto-regenerate)
 * refreshes them.
 */
export class AssetEngine {
  private assets = new Map<string, GeneratedAsset>();
  private autoRegenerate = false;
  private unsubscribe?: () => void;
  /** Serializes background (change-driven) persistence; awaited by close(). */
  private writeQueue: Promise<void> = Promise.resolve();

  private constructor(
    private readonly ledger: Ledger,
    private readonly dir: string,
  ) {}

  static async open(ledger: Ledger, dir: string, opts: { autoRegenerate?: boolean } = {}): Promise<AssetEngine> {
    const engine = new AssetEngine(ledger, dir);
    engine.autoRegenerate = opts.autoRegenerate ?? false;
    await fs.mkdir(dir, { recursive: true });
    await engine.load();
    engine.recomputeAllStale();
    await engine.persistAll();
    // React to ledger changes: flag (or auto-regenerate) dependents. The
    // recompute is synchronous so staleness is observable the moment a write
    // resolves; only persistence is deferred.
    engine.unsubscribe = ledger.onChange(() => {
      engine.recomputeAllStale();
      if (engine.autoRegenerate) {
        for (const asset of engine.assets.values()) {
          if (asset.stale) engine.generateInto(asset.assetId);
        }
      }
      // Best-effort background persist (errors here never crash the app).
      engine.writeQueue = engine.writeQueue.then(() => engine.persistAll()).catch(() => {});
    });
    return engine;
  }

  async close(): Promise<void> {
    this.unsubscribe?.();
    await this.writeQueue;
  }

  get autoRegenerateEnabled(): boolean {
    return this.autoRegenerate;
  }
  setAutoRegenerate(on: boolean): void {
    this.autoRegenerate = on;
  }

  private async load(): Promise<void> {
    let files: string[];
    try {
      files = (await fs.readdir(this.dir)).filter((f) => f.endsWith('.json'));
    } catch {
      files = [];
    }
    for (const f of files) {
      try {
        const raw = await fs.readFile(path.join(this.dir, f), 'utf8');
        const asset = JSON.parse(raw) as GeneratedAsset;
        if (getTemplate(asset.assetId)) this.assets.set(asset.assetId, asset);
      } catch {
        /* skip unreadable asset file */
      }
    }
  }

  private build(tpl: AssetTemplate): Built {
    const sections: GeneratedSection[] = [];
    const bySection: Record<string, Decision[]> = {};
    const snapshot: Record<string, string> = {};
    for (const s of tpl.sections) {
      const decisions = resolveQuery(this.ledger, s.query);
      if (decisions.length === 0) continue; // assembled only from existing decisions
      sections.push({ key: s.key, heading: s.heading, src: decisions.map((d) => d.id), ...(s.blurb ? { blurb: s.blurb } : {}) });
      bySection[s.key] = decisions;
      for (const d of decisions) snapshot[d.id] = hashDecision(d);
    }
    return { sections, bySection, snapshot };
  }

  /** Generate (or regenerate) an asset, clearing stale state. */
  generateInto(templateId: string): GeneratedAsset {
    const tpl = getTemplate(templateId);
    if (!tpl) throw new Error(`No asset template ${templateId}`);
    const { sections, bySection, snapshot } = this.build(tpl);
    const sourceDecisionCount = Object.keys(snapshot).length;

    const base: Omit<GeneratedAsset, 'markdown'> = {
      assetId: tpl.id,
      title: tpl.title,
      group: tpl.group,
      kind: tpl.kind,
      summary: tpl.summary,
      wholeLedger: Boolean(tpl.wholeLedger),
      header: {
        ledgerVersion: this.ledger.version,
        ledgerDecisionCount: this.ledger.count,
        sourceDecisionCount,
        generatedAt: new Date().toISOString(),
      },
      sections,
      stale: false,
      staleSections: [],
      snapshot,
    };
    const markdown = renderAsset(base, bySection);
    const asset: GeneratedAsset = { ...base, markdown };
    this.assets.set(tpl.id, asset);
    return asset;
  }

  async generate(templateId: string): Promise<GeneratedAsset> {
    const asset = this.generateInto(templateId);
    await this.persist(asset.assetId);
    return asset;
  }

  async regenerate(templateId: string): Promise<GeneratedAsset> {
    return this.generate(templateId);
  }

  /** Recompute staleness for one generated asset against the current ledger. */
  private recomputeStale(asset: GeneratedAsset): void {
    const tpl = getTemplate(asset.assetId);
    if (!tpl) return;
    const fresh = this.build(tpl);

    const staleSections: string[] = [];
    const keys = new Set<string>([...asset.sections.map((s) => s.key), ...fresh.sections.map((s) => s.key)]);
    for (const key of keys) {
      const prev = asset.sections.find((s) => s.key === key);
      const next = fresh.sections.find((s) => s.key === key);
      const prevSrc = prev?.src ?? [];
      const nextSrc = next?.src ?? [];
      const idsChanged = prevSrc.length !== nextSrc.length || prevSrc.some((id, i) => id !== nextSrc[i]);
      const hashChanged = nextSrc.some((id) => fresh.snapshot[id] !== asset.snapshot[id]);
      if (idsChanged || hashChanged) staleSections.push(key);
    }

    asset.stale = staleSections.length > 0;
    asset.staleSections = staleSections;
    asset.staleReason = asset.stale
      ? 'One or more source decisions changed (edited, superseded, reversed, or newly linked) since this asset was generated.'
      : undefined;
  }

  private recomputeAllStale(): void {
    for (const asset of this.assets.values()) this.recomputeStale(asset);
  }

  // --- reads ---
  registry(): AssetRegistryEntry[] {
    return ASSET_TEMPLATES.map((t) => {
      const generated = this.assets.get(t.id);
      return {
        id: t.id,
        title: t.title,
        group: t.group,
        kind: t.kind,
        summary: t.summary,
        wholeLedger: Boolean(t.wholeLedger),
        generated: Boolean(generated),
        stale: generated?.stale ?? false,
      };
    });
  }

  get(assetId: string): GeneratedAsset | undefined {
    return this.assets.get(assetId);
  }

  /** The dependency graph: asset/section -> source decision ids. */
  dependencyGraph(): Array<{ assetId: string; sections: Array<{ key: string; src: string[] }> }> {
    return [...this.assets.values()].map((a) => ({
      assetId: a.assetId,
      sections: a.sections.map((s) => ({ key: s.key, src: s.src })),
    }));
  }

  /** Assets that depend on a given decision id. */
  dependents(decisionId: string): string[] {
    return [...this.assets.values()]
      .filter((a) => a.sections.some((s) => s.src.includes(decisionId)))
      .map((a) => a.assetId);
  }

  // --- persistence ---
  private async persist(assetId: string): Promise<void> {
    const asset = this.assets.get(assetId);
    if (!asset) return;
    await atomicWrite(path.join(this.dir, `${assetId}.json`), JSON.stringify(asset, null, 2));
    await atomicWrite(path.join(this.dir, `${assetId}.md`), asset.markdown);
  }
  private async persistAll(): Promise<void> {
    for (const id of this.assets.keys()) await this.persist(id);
  }
}
