import { pathToFileURL } from 'node:url';
import type { LLMProvider } from '../src/evaluation/provider.js';
import { LocalLLMProvider } from '../src/evaluation/local.js';
import { OllamaLLMProvider } from '../src/evaluation/ollama.js';
import { hermesConfig } from '../src/config/env.js';
import { cases, type EvalCase } from './cases.js';

const norm = (s: string | undefined): string => (s ?? '').trim().toLowerCase().replace(/\s+/g, '-');

export interface EvalRow {
  name: string;
  domainOk: boolean;
  ownerOk: boolean;
  dissentOk: boolean;
  got: { domain?: string; ownerRole?: string; dissent: boolean; candidates: number };
}

export interface EvalResult {
  rows: EvalRow[];
  total: number;
  domainAcc: number;
  ownerAcc: number;
  dissentAcc: number;
  /** Overall = mean of the (applicable) per-field accuracies. */
  score: number;
}

async function scoreCase(provider: LLMProvider, c: EvalCase): Promise<EvalRow> {
  const candidates = await provider.extractCandidates(c.doc);
  const top = candidates[0]?.draft;
  const gotDomain = top?.domain;
  const gotOwner = norm(top?.owner.role);
  const gotDissent = (top?.owner.dissent ?? []).length > 0;

  const domainOk = gotDomain === c.expect.domain;
  const ownerOk = c.expect.ownerRole === undefined ? true : gotOwner === norm(c.expect.ownerRole);
  const dissentOk = c.expect.dissent === undefined ? true : gotDissent === c.expect.dissent;

  return {
    name: c.name,
    domainOk,
    ownerOk,
    dissentOk,
    got: { domain: gotDomain, ownerRole: gotOwner || undefined, dissent: gotDissent, candidates: candidates.length },
  };
}

export async function runEval(provider: LLMProvider, set: EvalCase[] = cases): Promise<EvalResult> {
  const rows: EvalRow[] = [];
  for (const c of set) rows.push(await scoreCase(provider, c));

  const total = rows.length;
  const pct = (n: number, d: number) => (d ? n / d : 1);
  const domainAcc = pct(rows.filter((r) => r.domainOk).length, total);
  const ownerCases = set.filter((c) => c.expect.ownerRole !== undefined).length;
  const ownerAcc = pct(rows.filter((r, i) => set[i]!.expect.ownerRole !== undefined && r.ownerOk).length, ownerCases);
  const dissentCases = set.filter((c) => c.expect.dissent !== undefined).length;
  const dissentAcc = pct(rows.filter((r, i) => set[i]!.expect.dissent !== undefined && r.dissentOk).length, dissentCases);

  const score = (domainAcc + ownerAcc + dissentAcc) / 3;
  return { rows, total, domainAcc, ownerAcc, dissentAcc, score };
}

function providerFromEnv(): { provider: LLMProvider; label: string } {
  const h = hermesConfig();
  if (h.provider === 'ollama') return { provider: new OllamaLLMProvider(h.ollamaUrl, h.ollamaModel), label: `ollama:${h.ollamaModel}` };
  return { provider: new LocalLLMProvider(), label: 'local-heuristic' };
}

// CLI: `npm run eval` (uses the configured Hermes provider).
if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const { provider, label } = providerFromEnv();
  const pct = (n: number) => `${Math.round(n * 100)}%`;
  runEval(provider)
    .then((res) => {
      console.log(`\nADAMAS extraction eval — provider: ${label}\n`);
      for (const r of res.rows) {
        const mark = r.domainOk && r.ownerOk && r.dissentOk ? '✓' : '✗';
        console.log(`  ${mark} ${r.name}  →  domain=${r.got.domain ?? '—'} owner=${r.got.ownerRole ?? '—'} dissent=${r.got.dissent}`);
      }
      console.log(
        `\n  domain ${pct(res.domainAcc)} · owner ${pct(res.ownerAcc)} · dissent ${pct(res.dissentAcc)} · OVERALL ${pct(res.score)}\n`,
      );
    })
    .catch((err) => {
      console.error(err);
      process.exit(1);
    });
}
