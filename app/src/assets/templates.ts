import { DOMAINS, type Domain } from '../schema/decision.schema.js';
import type { DecisionQuery } from './query.js';

export type AssetGroup =
  | 'hiring'
  | 'sales'
  | 'product'
  | 'finance'
  | 'ops'
  | 'investor-board'
  | 'whole-ledger';

export type AssetKind = 'live' | 'generatable';

export interface SectionTemplate {
  key: string;
  heading: string;
  query: DecisionQuery;
  /** Static framing for the section (never invents content about decisions). */
  blurb?: string;
}

export interface AssetTemplate {
  id: string;
  title: string;
  group: AssetGroup;
  kind: AssetKind;
  summary: string;
  /** Whole-ledger assets assemble the entire ledger by domain. */
  wholeLedger?: boolean;
  sections: SectionTemplate[];
}

const DOMAIN_LABEL: Record<Domain, string> = {
  hiring: 'Hiring & People',
  sales: 'Sales & Revenue',
  product: 'Product & Delivery',
  finance: 'Finance',
  ops: 'Operations',
};

/** One section per domain, each assembled from that domain's decisions. */
function perDomainSections(): SectionTemplate[] {
  return DOMAINS.map((domain) => ({
    key: domain,
    heading: DOMAIN_LABEL[domain],
    query: { domains: [domain] },
  }));
}

export const ASSET_TEMPLATES: AssetTemplate[] = [
  // ===== Hiring & People =====
  {
    id: 'role-onboarding',
    title: 'Role onboarding document',
    group: 'hiring',
    kind: 'live',
    summary: 'What a new hire needs to understand about how the company decides, hires, sells, builds, and manages money.',
    sections: [
      { key: 'operate', heading: 'How we operate and make decisions', query: { domains: ['ops'] } },
      { key: 'hire', heading: 'How we hire', query: { domains: ['hiring'] } },
      { key: 'sell', heading: 'How we sell and price', query: { domains: ['sales'] } },
      { key: 'build', heading: 'How we build', query: { domains: ['product'] } },
      { key: 'money', heading: 'Money & margin discipline', query: { domains: ['finance'] } },
    ],
  },
  {
    id: 'hiring-decision-framework',
    title: 'Hiring decision framework',
    group: 'hiring',
    kind: 'live',
    summary: 'The standing rules and trade-offs behind how we hire.',
    sections: [
      { key: 'who', heading: 'Who we hire and how', query: { domains: ['hiring'] } },
      { key: 'process', heading: 'Process commitments', query: { domains: ['hiring'], match: ['trial', 'offer', 'interview'] } },
    ],
  },
  {
    id: 'promotion-comp-rationale',
    title: 'Promotion & comp-anchor rationale',
    group: 'hiring',
    kind: 'generatable',
    summary: 'Why comp bands and promotion anchors are set the way they are.',
    sections: [
      { key: 'comp', heading: 'Compensation & promotion rationale', query: { domains: ['hiring'], match: ['salary', 'comp', 'promot', 'band', 'offer'] } },
    ],
  },
  {
    id: 'org-design-memo',
    title: 'Org-design memo',
    group: 'hiring',
    kind: 'generatable',
    summary: 'How roles and structure were chosen.',
    sections: [{ key: 'org', heading: 'Org-design decisions', query: { domains: ['hiring'] } }],
  },
  {
    id: 'offer-rejection-log',
    title: 'Offer & rejection rationale log',
    group: 'hiring',
    kind: 'generatable',
    summary: 'Why offers were made and why opportunities were declined.',
    sections: [
      { key: 'log', heading: 'Offers made and declined', query: { match: ['offer', 'decline', 'declined', 'reject'] } },
    ],
  },

  // ===== Sales & Revenue =====
  {
    id: 'deal-qualification-playbook',
    title: 'Deal-qualification playbook',
    group: 'sales',
    kind: 'generatable',
    summary: 'Which deals we pursue, which we walk from, and why.',
    sections: [
      { key: 'icp', heading: 'Who we sell to', query: { domains: ['sales'], match: ['icp', 'focus', 'customer', 'client', 'packaging'] } },
      { key: 'walk', heading: 'Deals we decline', query: { domains: ['sales', 'finance'], match: ['decline', 'declined', 'floor', 'margin'] } },
    ],
  },
  {
    id: 'pricing-rate-card-rationale',
    title: 'Pricing & rate-card rationale',
    group: 'sales',
    kind: 'generatable',
    summary: 'How we price work and why.',
    sections: [
      { key: 'pricing', heading: 'How we price', query: { domains: ['sales'], match: ['price', 'pricing', 'quote', 'rate', 'value'] } },
    ],
  },
  {
    id: 'scope-discovery-sop',
    title: 'Scope & discovery SOP',
    group: 'sales',
    kind: 'generatable',
    summary: 'How scope is established before a build commitment.',
    sections: [
      { key: 'discovery', heading: 'Discovery & scoping', query: { domains: ['sales'], match: ['discovery', 'scope', 'quote'] } },
    ],
  },
  {
    id: 'win-loss-review',
    title: 'Win/loss decision review',
    group: 'sales',
    kind: 'generatable',
    summary: 'Notable deal decisions and what they taught us.',
    sections: [
      { key: 'reviews', heading: 'Deal decisions', query: { domains: ['sales'] } },
    ],
  },
  {
    id: 'channel-contract-policy',
    title: 'Channel & contract policy',
    group: 'sales',
    kind: 'generatable',
    summary: 'Standing policy on channels and contract terms.',
    sections: [
      { key: 'channel', heading: 'Channel & contract decisions', query: { match: ['channel', 'reseller', 'contract', 'terms'] } },
    ],
  },

  // ===== Product & Delivery =====
  {
    id: 'product-roadmap-rationale',
    title: 'Product & roadmap rationale',
    group: 'product',
    kind: 'generatable',
    summary: 'Why the product and delivery approach is shaped the way it is.',
    sections: [{ key: 'roadmap', heading: 'Product & delivery decisions', query: { domains: ['product'] } }],
  },
  {
    id: 'tech-stack-adr-log',
    title: 'Tech-stack decision (ADR) log',
    group: 'product',
    kind: 'generatable',
    summary: 'Architecture decisions of record for the technology stack.',
    sections: [
      { key: 'adr', heading: 'Architecture decisions', query: { domains: ['product'], match: ['platform', 'stack', 'standard', 'tech', 'twincat', 'library'] } },
    ],
  },
  {
    id: 'sunset-eol-policy',
    title: 'Sunset / end-of-life policy',
    group: 'product',
    kind: 'generatable',
    summary: 'How and when we retire or stop supporting things.',
    sections: [
      { key: 'eol', heading: 'Sunset & legacy support', query: { match: ['legacy', 'sunset', 'end-of-life', 'retire', 'migrat'] } },
    ],
  },
  {
    id: 'build-vs-buy-memo',
    title: 'Build-vs-buy memo',
    group: 'product',
    kind: 'generatable',
    summary: 'Where we built, where we bought, and why.',
    sections: [
      { key: 'bvsb', heading: 'Build-vs-buy decisions', query: { match: ['build', 'buy', 'bespoke', 'modular', 'in-house', 'contractor'] } },
    ],
  },

  // ===== Finance =====
  {
    id: 'capital-allocation-policy',
    title: 'Capital-allocation policy',
    group: 'finance',
    kind: 'generatable',
    summary: 'How capital is raised and allocated.',
    sections: [
      { key: 'capital', heading: 'Capital decisions', query: { domains: ['finance'], match: ['equity', 'fund', 'capital', 'invest', 'self-fund'] } },
    ],
  },
  {
    id: 'pricing-floor-contingency-model',
    title: 'Pricing-floor & contingency model',
    group: 'finance',
    kind: 'generatable',
    summary: 'Margin floors and the contingencies behind them.',
    sections: [
      { key: 'floor', heading: 'Margin floor & contingency', query: { match: ['margin', 'floor', 'contingency', 'risk'] } },
    ],
  },
  {
    id: 'billing-cash-cycle-sop',
    title: 'Billing & cash-cycle SOP',
    group: 'finance',
    kind: 'generatable',
    summary: 'How we bill and protect the cash cycle.',
    sections: [
      { key: 'billing', heading: 'Billing & cash cycle', query: { domains: ['finance'], match: ['billing', 'milestone', 'cash', 'invoice', 'deposit'] } },
    ],
  },
  {
    id: 'financial-decision-memo-pack',
    title: 'Financial decision memo pack',
    group: 'finance',
    kind: 'generatable',
    summary: 'All finance decisions assembled as a memo pack.',
    sections: [{ key: 'memos', heading: 'Financial decisions', query: { domains: ['finance'] } }],
  },

  // ===== Operations =====
  {
    id: 'operating-cadence-rituals',
    title: 'Operating cadence & rituals doc',
    group: 'ops',
    kind: 'generatable',
    summary: 'The operating rhythm and why it exists.',
    sections: [
      { key: 'cadence', heading: 'Operating cadence', query: { domains: ['ops'], match: ['cadence', 'ritual', 'review', 'commit', 'weekly'] } },
    ],
  },
  {
    id: 'handover-continuity-protocol',
    title: 'Handover & continuity protocol',
    group: 'ops',
    kind: 'generatable',
    summary: 'How work and knowledge transfer when people change.',
    sections: [
      { key: 'handover', heading: 'Continuity decisions', query: { domains: ['ops'], match: ['handover', 'continuity', 'backup', 'dual-source', 'supervisor'] } },
    ],
  },
  {
    id: 'safety-compliance-sops',
    title: 'Safety & compliance SOPs',
    group: 'ops',
    kind: 'generatable',
    summary: 'Safety and compliance decisions.',
    sections: [
      { key: 'safety', heading: 'Safety & compliance', query: { match: ['safety', 'compliance', 'risk', 'standard'] } },
    ],
  },
  {
    id: 'risk-register',
    title: 'Risk register',
    group: 'ops',
    kind: 'generatable',
    summary: 'Risks surfaced by decisions and how they were addressed.',
    sections: [
      { key: 'risks', heading: 'Risks & mitigations', query: { match: ['risk', 'supply', 'lead time', 'single', 'cap', 'wip'] } },
    ],
  },

  // ===== Investor & Board (cross-domain) =====
  {
    id: 'investor-one-pager',
    title: 'Investor one-pager',
    group: 'investor-board',
    kind: 'live',
    summary: 'The handful of decisions that define the business for an investor.',
    sections: [
      { key: 'strategy', heading: 'Strategy & focus', query: { match: ['icp', 'focus', 'decline', 'self-fund', 'value'] } },
      { key: 'discipline', heading: 'Financial discipline', query: { domains: ['finance'] } },
    ],
  },
  {
    id: 'board-decision-digest',
    title: 'Board decision digest',
    group: 'investor-board',
    kind: 'generatable',
    summary: 'A digest of the most consequential decisions for the board.',
    sections: [
      { key: 'consequential', heading: 'Consequential decisions', query: { match: ['decline', 'floor', 'cap', 'self-fund', 'standardize'] } },
    ],
  },
  {
    id: 'kpi-commitments-tracker',
    title: 'KPI & commitments tracker',
    group: 'investor-board',
    kind: 'generatable',
    summary: 'Operating commitments that translate into KPIs.',
    sections: [
      { key: 'commitments', heading: 'Commitments', query: { match: ['cadence', 'commit', 'cap', 'floor', 'milestone'] } },
    ],
  },
  {
    id: 'data-room-index',
    title: 'Data-room index',
    group: 'investor-board',
    kind: 'generatable',
    summary: 'An index of every reasoned decision, for diligence.',
    sections: [{ key: 'index', heading: 'Decision index', query: { all: true } }],
  },

  // ===== Whole-ledger assets =====
  {
    id: 'decision-diligence-binder',
    title: 'The Decision Diligence Binder',
    group: 'whole-ledger',
    kind: 'generatable',
    wholeLedger: true,
    summary: 'Every reasoned decision by department, with owners and trade-offs, exported as one document.',
    sections: perDomainSections(),
  },
  {
    id: 'founder-continuity-dossier',
    title: 'The Founder-Continuity Dossier',
    group: 'whole-ledger',
    kind: 'generatable',
    wholeLedger: true,
    summary: 'If the founder steps away tomorrow, here is every decision and why.',
    sections: perDomainSections(),
  },
];

export function getTemplate(id: string): AssetTemplate | undefined {
  return ASSET_TEMPLATES.find((t) => t.id === id);
}
