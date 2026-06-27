import type { DecisionInput } from '../ledger/ledger.js';

// Seed ledger for a fictional industrial-automation company:
// "Helitech Automation" — builds robotic work cells, ~$3M revenue, 18 people.
// 14 decisions across hiring / sales / product / finance / ops.

export const SEED_DECISIONS: DecisionInput[] = [
  // --- Hiring & People ---
  {
    id: 'HIR-004',
    domain: 'hiring',
    date: '2024-09-12',
    title: 'Hire a dedicated controls engineer over a mechanical generalist',
    context:
      'Delivery was bottlenecked on PLC/controls work; mechanical capacity was adequate. Two finalists: a controls specialist and a strong generalist.',
    decision:
      'Hire the controls specialist and route mechanical overflow to a vetted contractor when needed.',
    owner: { role: 'head-of-engineering', name: 'A. Brandt' },
    tradeoffs: ['Higher salary band', 'Less flexible across disciplines than a generalist'],
    sources: ['meeting:2024-09-10#eng-staffing', 'email:2024-09-11#offer-thread'],
  },
  {
    id: 'HIR-007',
    domain: 'hiring',
    date: '2025-01-20',
    title: 'Run a 90-day paid trial project before any full-time engineering offer',
    context:
      'Two mis-hires in 18 months cost ~$60k each. Interviews over-weighted talk; under-weighted shop-floor judgement.',
    decision:
      'Every engineering candidate completes a scoped, paid 90-day trial on a real (non-critical) project before a full-time offer.',
    owner: { role: 'head-of-engineering', dissent: ['founder'] },
    tradeoffs: ['Slower time-to-hire', 'Some strong candidates decline trials'],
    links: ['HIR-004'],
    sources: ['meeting:2025-01-15#hiring-retro'],
  },
  // --- Sales & Revenue ---
  {
    id: 'SAL-011',
    domain: 'sales',
    date: '2024-06-03',
    title: 'Focus the ICP on mid-market food & beverage packaging lines',
    context:
      'Pipeline was scattered across automotive, pharma, and F&B. Win rate and margin were highest in F&B packaging; sales cycles there were shortest.',
    decision:
      'Concentrate outbound and marketing on mid-market F&B packaging integrators; deprioritize automotive tier-1 work.',
    owner: { role: 'head-of-sales' },
    tradeoffs: ['Forgoes large automotive logos', 'Narrower TAM'],
    sources: ['meeting:2024-05-30#pipeline-review'],
  },
  {
    id: 'SAL-017',
    domain: 'sales',
    date: '2024-11-08',
    title: 'Quote work as value-based cell packages, not hourly engineering',
    context:
      'Hourly quoting punished us for being fast and capped upside on high-value automation. Clients fixated on rate, not outcome.',
    decision:
      'Price builds as fixed-scope cell packages tied to throughput outcomes; stop publishing hourly rates.',
    owner: { role: 'head-of-sales', name: 'R. Okoye' },
    tradeoffs: ['Estimation risk shifts to us', 'Requires disciplined scoping'],
    links: ['SAL-011'],
    sources: ['meeting:2024-11-05#pricing-workshop', 'email:2024-11-07#rate-card'],
  },
  {
    id: 'SAL-019',
    domain: 'sales',
    date: '2025-02-14',
    title: 'Require a paid discovery phase before issuing a build quote',
    context:
      'Free scoping produced under-specified quotes and scope creep. ~30% of builds overran on misunderstood requirements.',
    decision:
      'No fixed build quote without a paid discovery engagement that produces a signed scope and throughput target.',
    owner: { role: 'head-of-sales' },
    tradeoffs: ['Adds friction early in the sale', 'Some prospects want a free number first'],
    links: ['SAL-017'],
    sources: ['meeting:2025-02-12#scope-creep-retro'],
  },
  {
    id: 'SAL-021',
    domain: 'sales',
    date: '2025-04-11',
    title: 'Decline the automotive OEM frame contract',
    context:
      'A large automotive OEM offered a high-volume welded-frame contract (~$900k/yr). It would consume two of three build slots for 14 months at an estimated 11% margin, off-ICP, with punitive change-order terms.',
    decision:
      'Decline the contract. Protect capacity for higher-margin F&B cell work and hold the margin floor.',
    owner: { role: 'founder', name: 'Steve Jobs', dissent: ['head-of-sales'] },
    tradeoffs: [
      'Forgoes ~$900k/yr of top-line revenue',
      'Strains the relationship with a marquee logo',
      'Head of sales dissented: wanted the revenue and the reference',
    ],
    links: ['FIN-016', 'SAL-017', 'OPS-020', 'PRD-019'],
    sources: ['meeting:2025-04-09#oem-go-no-go', 'email:2025-04-02#thread-114'],
  },
  // --- Product & Delivery ---
  {
    id: 'PRD-012',
    domain: 'product',
    date: '2024-07-22',
    title: 'Standardize the controls platform on Beckhoff TwinCAT',
    context:
      'Each build used whatever PLC the engineer preferred (Siemens, Rockwell, Beckhoff). Spares, training, and reuse suffered; nothing was portable between cells.',
    decision:
      'Standardize new builds on Beckhoff TwinCAT; support legacy platforms only for existing service contracts.',
    owner: { role: 'head-of-engineering' },
    tradeoffs: ['Retraining cost', 'Some clients have a Rockwell mandate we must decline or sub-contract'],
    links: ['HIR-004'],
    sources: ['meeting:2024-07-18#controls-adr', 'email:2024-07-20#platform-decision'],
  },
  {
    id: 'PRD-019',
    domain: 'product',
    date: '2025-03-05',
    title: 'Build cells on a modular fixture standard, not bespoke rigs',
    context:
      'Bespoke fixturing per project meant near-zero reuse and long lead times. ~40% of build hours were re-inventing mounting and tooling.',
    decision:
      'Adopt an internal modular fixture standard so cells are assembled from reusable, documented building blocks.',
    owner: { role: 'head-of-engineering', name: 'A. Brandt' },
    tradeoffs: ['Up-front standard-design investment', 'Slightly less optimal for edge-case geometries'],
    links: ['PRD-012'],
    sources: ['meeting:2025-03-01#delivery-efficiency'],
  },
  // --- Finance ---
  {
    id: 'FIN-016',
    domain: 'finance',
    date: '2024-10-30',
    title: 'Hold a 20% gross-margin floor and walk from sub-floor deals',
    context:
      'Several large but thin deals nearly committed the shop below break-even once rework was counted. No explicit floor existed.',
    decision:
      'Set a hard 20% gross-margin floor on builds; deals below it require founder sign-off or are declined.',
    owner: { role: 'cfo', name: 'L. Stein' },
    tradeoffs: ['Loses price-driven deals', 'Requires honest job costing'],
    sources: ['meeting:2024-10-28#margin-policy'],
  },
  {
    id: 'FIN-018',
    domain: 'finance',
    date: '2024-12-09',
    title: 'Switch to 50/40/10 milestone billing to protect the cash cycle',
    context:
      'Net-60 on delivery created cash crunches mid-build while paying for long-lead components up front.',
    decision:
      'Bill 50% on signed scope, 40% at factory acceptance, 10% on site sign-off; require deposits before ordering long-lead parts.',
    owner: { role: 'cfo' },
    tradeoffs: ['Higher friction for procurement-heavy clients', 'Some clients negotiate the split'],
    links: ['FIN-016'],
    sources: ['meeting:2024-12-05#cash-cycle'],
  },
  {
    id: 'FIN-022',
    domain: 'finance',
    date: '2025-05-02',
    title: 'Self-fund growth and decline outside equity for now',
    context:
      'An angel offered $750k for ~15%. Modeling showed organic margin could fund the next hire and a second bay without dilution.',
    decision:
      'Decline equity; fund growth from retained margin and milestone cash. Revisit only for a step-change opportunity.',
    owner: { role: 'founder', name: 'Steve Jobs' },
    tradeoffs: ['Slower expansion', 'Carries more single-shop risk without an outside balance sheet'],
    links: ['FIN-016'],
    sources: ['meeting:2025-04-28#funding-discussion', 'email:2025-04-25#angel-term-sheet'],
  },
  // --- Operations ---
  {
    id: 'OPS-014',
    domain: 'ops',
    date: '2024-08-19',
    title: 'Adopt a weekly Monday operating cadence with written commitments',
    context:
      'Status lived in hallway conversations; commitments slipped silently and the founder was the only integration point.',
    decision:
      'Run a 30-minute Monday commitments review; every project lead posts written status and the week’s committed outcomes.',
    owner: { role: 'head-of-ops', name: 'D. Vrang' },
    tradeoffs: ['Meeting overhead', 'Requires discipline to keep it to 30 minutes'],
    sources: ['meeting:2024-08-16#cadence-proposal'],
  },
  {
    id: 'OPS-020',
    domain: 'ops',
    date: '2025-03-21',
    title: 'Cap concurrent build projects at three to protect delivery quality',
    context:
      'At four to five concurrent builds, rework and overtime spiked and acceptance dates slipped across the board.',
    decision:
      'Hard cap of three concurrent builds; a fourth waits in a staged queue until a slot frees.',
    owner: { role: 'head-of-ops', dissent: ['head-of-sales'] },
    tradeoffs: ['Caps revenue throughput', 'Requires saying no or queuing eager clients'],
    links: ['OPS-014'],
    sources: ['meeting:2025-03-18#wip-limit'],
  },
  {
    id: 'OPS-023',
    domain: 'ops',
    date: '2025-05-27',
    title: 'Dual-source critical servo drives with a qualified backup vendor',
    context:
      'A single servo-drive supplier’s lead times blew out to 22 weeks, stalling two builds. Everything depended on one vendor.',
    decision:
      'Qualify a second servo-drive vendor and keep a minimum buffer stock of the critical drive on the constrained line.',
    owner: { role: 'head-of-ops', name: 'D. Vrang' },
    tradeoffs: ['Carrying cost of buffer stock', 'Second qualification takes engineering time'],
    links: ['OPS-020'],
    sources: ['meeting:2025-05-23#supply-risk'],
  },
];
