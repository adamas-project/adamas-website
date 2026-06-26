import type { LLMProvider } from '../evaluation/provider.js';

// AI auto-define for glossary terms. Local-first, same philosophy as the rest of
// Hermes: a curated on-device dictionary of common business / industrial / M&A
// terms answers instantly and offline; when a local model (Ollama) is configured
// it drafts definitions for anything not in the dictionary; otherwise we return a
// clean editable scaffold so the user is never stuck on a blank field.

export interface DraftedDefinition {
  definition: string;
  aliases: string[];
  tags: string[];
  /** Where the draft came from, so the UI can be honest about it. */
  source: 'builtin' | 'model' | 'draft';
}

interface BuiltinTerm {
  definition: string;
  tags: string[];
  aliases?: string[];
}

// Curated definitions for the terms an operator in this space actually types.
// Keyed by the lowercased term; aliases are matched too (see lookup()).
const BUILTIN: Record<string, BuiltinTerm> = {
  fat: { definition: 'Factory Acceptance Test — validating a machine or cell at the manufacturer’s facility before it ships to the customer.', tags: ['ops'], aliases: ['factory acceptance test'] },
  sat: { definition: 'Site Acceptance Test — validating a machine or cell at the customer’s site after installation.', tags: ['ops'], aliases: ['site acceptance test'] },
  plc: { definition: 'Programmable Logic Controller — the ruggedized industrial computer that runs the control logic of a machine or cell.', tags: ['product'], aliases: ['programmable logic controller'] },
  hmi: { definition: 'Human-Machine Interface — the operator-facing screen used to run and monitor a machine.', tags: ['product'], aliases: ['human-machine interface'] },
  oee: { definition: 'Overall Equipment Effectiveness — a productivity measure equal to availability × performance × quality.', tags: ['ops'], aliases: ['overall equipment effectiveness'] },
  'takt time': { definition: 'The pace of production needed to meet customer demand — available time divided by required output.', tags: ['ops'] },
  icp: { definition: 'Ideal Customer Profile — the well-defined segment a company concentrates its sales and marketing on.', tags: ['sales'], aliases: ['ideal customer profile'] },
  arr: { definition: 'Annual Recurring Revenue — the yearly value of subscription or service contracts that recur.', tags: ['finance'], aliases: ['annual recurring revenue'] },
  mrr: { definition: 'Monthly Recurring Revenue — the monthly value of recurring contracts.', tags: ['finance'], aliases: ['monthly recurring revenue'] },
  nrr: { definition: 'Net Revenue Retention — revenue from existing customers over a period including expansion, contraction and churn.', tags: ['finance'], aliases: ['net revenue retention'] },
  dso: { definition: 'Days Sales Outstanding — the average number of days it takes to collect payment after a sale.', tags: ['finance'], aliases: ['days sales outstanding'] },
  ebitda: { definition: 'Earnings Before Interest, Taxes, Depreciation and Amortization — a proxy for operating profitability.', tags: ['finance'] },
  meddicc: { definition: 'An enterprise sales qualification framework (Metrics, Economic buyer, Decision criteria, Decision process, Identify pain, Champion, Competition).', tags: ['sales'] },
  cmms: { definition: 'Computerized Maintenance Management System — software for scheduling and tracking equipment maintenance.', tags: ['ops'] },
  'opc-ua': { definition: 'A vendor-neutral industrial standard for secure machine-to-system data exchange.', tags: ['product'], aliases: ['opc ua'] },
  'iso 13849': { definition: 'A machinery-safety standard defining required performance levels for safety-related control systems.', tags: ['product'] },
  'ce marking': { definition: 'The EU conformity marking required to place machinery on the market in the European Economic Area.', tags: ['product'], aliases: ['ce mark'] },
  wip: { definition: 'Work In Progress — the number of jobs or builds running concurrently; capping it protects quality and throughput.', tags: ['ops'], aliases: ['work in progress'] },
  'lead time': { definition: 'The elapsed time from placing an order to delivery of the finished product.', tags: ['ops'] },
  'gross margin': { definition: 'Revenue minus the cost of goods sold, expressed as a percentage of revenue.', tags: ['finance'] },
  'dual sourcing': { definition: 'Qualifying two suppliers for a critical component to de-risk the supply chain.', tags: ['ops'] },
  'digital twin': { definition: 'A simulation model of a machine or cell used to validate control logic before building or commissioning it.', tags: ['product'] },
  'servo drive': { definition: 'The amplifier that controls the motion of a servo motor in a machine.', tags: ['product'] },
  commissioning: { definition: 'The process of bringing a machine or cell into full working order on site.', tags: ['ops'] },
  runway: { definition: 'The number of months a company can operate on its current cash before reserves run out.', tags: ['finance'] },
  backlog: { definition: 'Signed orders that have not yet been delivered or recognized as revenue.', tags: ['finance'] },
  churn: { definition: 'The rate at which customers stop buying or do not renew over a period.', tags: ['sales'] },
  'discovery phase': { definition: 'A paid scoping engagement run before a full build quote to define requirements and reduce risk.', tags: ['sales'] },
  'milestone billing': { definition: 'Invoicing a project in stages tied to delivery milestones (e.g. 50/40/10 at kickoff, FAT and SAT).', tags: ['finance'] },
  'bus factor': { definition: 'How many people would have to leave before critical knowledge is lost — a measure of key-person risk.', tags: ['people'], aliases: ['key-person risk', 'key person risk'] },
  'data room': { definition: 'The organized set of documents a buyer or investor reviews during diligence.', tags: ['m-and-a'] },
  'quality of earnings': { definition: 'A diligence analysis of how sustainable and accurate a company’s reported earnings are.', tags: ['m-and-a'], aliases: ['qoe'] },
  'earn-out': { definition: 'Deal consideration paid to sellers after closing, contingent on the business hitting agreed performance targets.', tags: ['m-and-a'], aliases: ['earnout'] },
  sla: { definition: 'Service Level Agreement — a contract guaranteeing response times, uptime or other service terms.', tags: ['sales'], aliases: ['service level agreement'] },
  'preventive maintenance': { definition: 'Maintenance performed on a schedule to prevent failures before they occur.', tags: ['ops'] },
  'predictive maintenance': { definition: 'Using machine telemetry to predict and prevent failures before they happen.', tags: ['product'] },
  'root-cause analysis': { definition: 'A structured investigation to find the underlying cause of a defect or failure, not just the symptom.', tags: ['ops'], aliases: ['rca', 'root cause analysis'] },
  'first-pass yield': { definition: 'The share of units that pass quality the first time, without rework.', tags: ['ops'], aliases: ['first pass yield'] },
  capex: { definition: 'Capital expenditure — spending on long-lived assets such as equipment or tooling.', tags: ['finance'], aliases: ['capital expenditure'] },
  opex: { definition: 'Operating expenditure — the day-to-day running costs of the business.', tags: ['finance'], aliases: ['operating expenditure'] },
  utilization: { definition: 'The share of available engineering or labor time that is billable to customers.', tags: ['finance'] },
  'pipeline coverage': { definition: 'The value of the sales pipeline relative to the quota for a period (e.g. 3× coverage).', tags: ['sales'] },
  telemetry: { definition: 'Machine and sensor data streamed from equipment for monitoring and analysis.', tags: ['product'] },
  'value-based pricing': { definition: 'Pricing based on the outcome or value delivered to the customer rather than on hours or cost.', tags: ['sales'] },
  'margin floor': { definition: 'The minimum acceptable gross margin on a deal, below which the company declines the work.', tags: ['finance'] },
  'risk register': { definition: 'A living list of risks with an owner, mitigation and review date for each.', tags: ['ops'] },
  kpi: { definition: 'Key Performance Indicator — a measurable value that shows how well a goal is being met.', tags: ['finance'], aliases: ['key performance indicator'] },
  cogs: { definition: 'Cost of Goods Sold — the direct costs of producing the goods or services sold.', tags: ['finance'], aliases: ['cost of goods sold'] },
  cac: { definition: 'Customer Acquisition Cost — the total sales and marketing cost to win one new customer.', tags: ['sales'], aliases: ['customer acquisition cost'] },
  ltv: { definition: 'Lifetime Value — the total margin a customer is expected to generate over the relationship.', tags: ['sales'], aliases: ['lifetime value', 'clv'] },
  mvp: { definition: 'Minimum Viable Product — the smallest version of a product that delivers value and can be tested with users.', tags: ['product'], aliases: ['minimum viable product'] },
  sku: { definition: 'Stock Keeping Unit — a unique identifier for a distinct product or part that can be stocked and sold.', tags: ['ops'], aliases: ['stock keeping unit'] },
  rfq: { definition: 'Request for Quote — a customer’s formal request for pricing on a defined scope of work.', tags: ['sales'], aliases: ['request for quote'] },
  'gross profit': { definition: 'Revenue minus the cost of goods sold, in absolute terms.', tags: ['finance'] },
  'working capital': { definition: 'Current assets minus current liabilities — the cash a business needs to fund day-to-day operations.', tags: ['finance'] },
  onboarding: { definition: 'The structured process of bringing a new hire (or customer) up to speed and productive.', tags: ['people'] },
};

// Lightweight tag inference from the term + any definition text, used when the
// dictionary has no entry and for enriching model output.
const TAG_KEYWORDS: Array<[string, RegExp]> = [
  ['finance', /\b(revenue|margin|cash|ebitda|capex|opex|cost|price|pricing|invoic|billing|arr|nrr|dso|runway|budget|forecast|debt|equity|earnings|profit|capital)\b/i],
  ['sales', /\b(sales|deal|pipeline|quota|customer|churn|crm|icp|discovery|sla|account|prospect|quote|win)\b/i],
  ['ops', /\b(maintenance|supplier|vendor|inventory|throughput|quality|safety|commission|process|yield|logistics|takt|wip|oee)\b/i],
  ['product', /\b(plc|hmi|control|firmware|telemetry|simulation|twin|servo|opc|architecture|platform|software|sensor|api)\b/i],
  ['people', /\b(hir|onboard|recruit|employee|staff|talent|payroll|bonus|culture|handbook|training|person)\b/i],
  ['m-and-a', /\b(diligence|acquisition|merger|earn-?out|data room|buyer|valuation|qoe|investor)\b/i],
];

export function inferGlossaryTags(text: string): string[] {
  const tags: string[] = [];
  for (const [tag, re] of TAG_KEYWORDS) if (re.test(text) && !tags.includes(tag)) tags.push(tag);
  return tags;
}

function lookup(term: string): (BuiltinTerm & { aliases: string[] }) | undefined {
  const key = term.trim().toLowerCase();
  const direct = BUILTIN[key];
  if (direct) return { ...direct, aliases: direct.aliases ?? [] };
  // Alias match: the typed term is listed as an alias of a canonical entry.
  for (const entry of Object.values(BUILTIN)) {
    if ((entry.aliases ?? []).some((a) => a.toLowerCase() === key)) {
      return { ...entry, aliases: entry.aliases ?? [] };
    }
  }
  return undefined;
}

/**
 * Draft a definition for a glossary term. Tries a local model first (if one is
 * configured), then the curated dictionary, then a clean scaffold. Always
 * resolves — drafting must never hard-fail the way capture never does offline.
 */
export async function defineTerm(provider: LLMProvider, term: string): Promise<DraftedDefinition> {
  const clean = term.trim();
  if (!clean) return { definition: '', aliases: [], tags: [], source: 'draft' };

  // 1) Local model, when available and it returns something usable.
  if (provider.defineGlossaryTerm) {
    try {
      const m = await provider.defineGlossaryTerm(clean);
      const definition = (m.definition ?? '').trim();
      if (definition) {
        const tags = (m.tags?.length ? m.tags : inferGlossaryTags(`${clean} ${definition}`))
          .map((t) => t.toLowerCase().replace(/\s+/g, '-'))
          .slice(0, 6);
        return { definition, aliases: (m.aliases ?? []).map((a) => a.trim()).filter(Boolean).slice(0, 6), tags, source: 'model' };
      }
    } catch {
      /* fall through to dictionary / scaffold */
    }
  }

  // 2) Curated on-device dictionary.
  const hit = lookup(clean);
  if (hit) {
    // Drop the typed term itself from the alias list (it may have matched one).
    const aliases = hit.aliases.filter((a) => a.toLowerCase() !== clean.toLowerCase());
    return { definition: hit.definition, aliases, tags: hit.tags, source: 'builtin' };
  }

  // 3) Scaffold — never a blank field. Tags are still inferred from the term.
  return {
    definition: `${clean}: `,
    aliases: [],
    tags: inferGlossaryTags(clean),
    source: 'draft',
  };
}
