import type { SourceDocument } from '../src/evaluation/provider.js';

// Extraction eval fixtures: inputs with the decision we expect Hermes to find.
// These are the ground truth that lets us measure whether a change (a new prompt,
// a different model, the router, the learning loop) makes extraction *better* —
// "smarter over time" as a number, not a vibe.
export interface EvalCase {
  name: string;
  doc: SourceDocument;
  expect: { domain: string; ownerRole?: string; dissent?: boolean };
}

const doc = (ref: string, text: string, title = ''): SourceDocument => ({
  ref,
  kind: 'doc',
  date: '2026-01-01',
  title,
  text,
});

export const cases: EvalCase[] = [
  {
    name: 'finance — margin floor',
    doc: doc('eval:fin', 'Margins were slipping on competitive bids. We decided to hold a 20% gross-margin floor and walk from sub-floor deals. Owner: cfo.'),
    expect: { domain: 'finance', ownerRole: 'cfo' },
  },
  {
    name: 'ops — WIP cap with dissent',
    doc: doc('eval:ops', 'Quality slipped when we ran five builds at once. We decided to cap concurrent builds at three. Owner: head of ops. Dissent: head of sales, who wanted more throughput.'),
    expect: { domain: 'ops', ownerRole: 'head-of-ops', dissent: true },
  },
  {
    name: 'sales — decline reseller',
    doc: doc('eval:sales', 'The reseller wanted heavy discounts and owned the customer. We decided to decline the reseller channel and sell direct. Owner: head of sales.'),
    expect: { domain: 'sales', ownerRole: 'head-of-sales' },
  },
  {
    name: 'product — standardize platform',
    doc: doc('eval:prod', 'Bespoke stacks were slowing delivery. We decided to standardize the controls platform and product architecture on Beckhoff TwinCAT. Owner: head of engineering.'),
    expect: { domain: 'product' },
  },
  {
    name: 'hiring — paid trial',
    doc: doc('eval:hire', 'Interviews were poor predictors. We decided to run a 90-day paid trial project before any full-time engineering hire offer. Owner: founder.'),
    expect: { domain: 'hiring' },
  },
  {
    name: 'finance — milestone billing',
    doc: doc('eval:fin2', 'Cash was tight between milestones. We decided to switch to 50/40/10 milestone billing to protect the cash cycle. Owner: cfo.'),
    expect: { domain: 'finance', ownerRole: 'cfo' },
  },
];
