import { promises as fs } from 'node:fs';
import path from 'node:path';
import type { Ledger, DecisionInput } from '../ledger/ledger.js';
import type { KnowledgeStore, KnowledgeInput } from '../knowledge/store.js';
import type { PeopleStore, PersonInput } from '../people/store.js';
import type { RecordStore, RecordInput } from '../records/store.js';

// Demo data — one coherent fictional company ("NorthPeak Robotics", a mid-market
// industrial-automation scale-up preparing for M&A) so a client demo shows a
// realistic, interconnected data room. 20+ entries in every category.

const DECISIONS: DecisionInput[] = [
  // hiring
  { domain: 'hiring', date: '2025-01-14', title: 'Run a 90-day paid trial before any full-time engineering offer', context: 'Interviews were poor predictors of on-the-floor performance.', decision: 'Every engineering hire does a paid 90-day trial project before a full-time offer.', owner: { role: 'head-of-people', name: 'Sofia Reinhardt', dissent: ['head-of-engineering'] }, tradeoffs: ['Slower time-to-hire', 'Some candidates decline a trial'], sources: ['meeting:2025-01-13#hiring-review'] },
  { domain: 'hiring', date: '2025-02-03', title: 'Hire a dedicated controls engineer over a mechanical generalist', context: 'Controls work was the delivery bottleneck on every cell.', decision: 'Prioritize a senior controls engineer for the next hire.', owner: { role: 'head-of-engineering', name: 'Daniel Okonkwo' }, tradeoffs: ['Higher comp band'], sources: ['email:2025-01-30#headcount'] },
  { domain: 'hiring', date: '2025-03-10', title: 'Adopt structured scorecards for every interview', context: 'Hiring decisions were inconsistent across panels.', decision: 'All interviews use a shared competency scorecard before a debrief.', owner: { role: 'head-of-people', name: 'Sofia Reinhardt' }, sources: ['meeting:2025-03-09#people-ops'] },
  { domain: 'hiring', date: '2025-04-22', title: 'Freeze senior hiring until utilization exceeds 75%', context: 'Bench cost was eroding margin during a slow quarter.', decision: 'No new senior hires until billable utilization is above 75% for two months.', owner: { role: 'founder', name: 'Massimo Sahin', dissent: ['head-of-sales'] }, tradeoffs: ['Risk of being short-staffed if pipeline rebounds'] },
  { domain: 'hiring', date: '2025-05-30', title: 'Standardize a four-day onboarding bootcamp', context: 'New hires took months to become productive on our stack.', decision: 'Every new hire completes a 4-day onboarding bootcamp in week one.', owner: { role: 'head-of-people', name: 'Sofia Reinhardt' }, tradeoffs: ['Upfront time cost'] },

  // sales
  { domain: 'sales', date: '2025-01-20', title: 'Decline the automotive OEM frame contract', context: 'A large OEM offered ~$900k/yr at ~11% margin, off-ICP, with punitive change-order terms.', decision: 'Decline the contract and protect capacity for higher-margin F&B work.', owner: { role: 'founder', name: 'Massimo Sahin', dissent: ['head-of-sales'] }, tradeoffs: ['Forgoes ~$900k/yr top line', 'Strains a marquee-logo relationship'], sources: ['meeting:2025-01-18#oem-go-no-go'] },
  { domain: 'sales', date: '2025-02-12', title: 'Focus the ICP on mid-market food & beverage packaging lines', context: 'Win rates and margins were far higher in F&B than in scattered verticals.', decision: 'Concentrate sales and marketing on mid-market F&B packaging integrators.', owner: { role: 'head-of-sales', name: 'Priya Nair' }, tradeoffs: ['Narrower funnel'] , sources: ['doc:2025-02#icp-analysis'] },
  { domain: 'sales', date: '2025-03-05', title: 'Quote value-based cell packages, not hourly engineering', context: 'Hourly quoting capped upside and invited scope haggling.', decision: 'Price work as fixed value-based cell packages.', owner: { role: 'head-of-sales', name: 'Priya Nair' }, tradeoffs: ['More estimation risk on us'] },
  { domain: 'sales', date: '2025-04-08', title: 'Require a paid discovery phase before any build quote', context: 'Unpaid scoping burned engineering hours on deals that never closed.', decision: 'A paid discovery phase precedes every build quote.', owner: { role: 'head-of-sales', name: 'Priya Nair' }, sources: ['meeting:2025-04-07#sales-process'] },
  { domain: 'sales', date: '2025-05-19', title: 'Drop the reseller channel and sell direct', context: 'Resellers wanted heavy discounts and owned the customer relationship.', decision: 'Wind down the reseller channel and sell direct.', owner: { role: 'head-of-sales', name: 'Priya Nair', dissent: ['founder'] }, tradeoffs: ['Lose some reach in the short term'] },

  // product
  { domain: 'product', date: '2025-01-28', title: 'Standardize the controls platform on Beckhoff TwinCAT', context: 'Bespoke stacks slowed delivery and made support hard.', decision: 'Standardize all new cells on Beckhoff TwinCAT.', owner: { role: 'head-of-engineering', name: 'Daniel Okonkwo' }, tradeoffs: ['Retraining cost'], sources: ['doc:2025-01#platform-adr'] },
  { domain: 'product', date: '2025-02-25', title: 'Build cells on a modular fixture standard, not bespoke rigs', context: 'Every project reinvented fixturing from scratch.', decision: 'Adopt a modular fixture standard reused across cells.', owner: { role: 'head-of-product', name: 'Lena Vasquez' }, tradeoffs: ['Up-front standardization effort'] },
  { domain: 'product', date: '2025-03-18', title: 'Sunset the legacy HMI toolkit', context: 'The old HMI toolkit was unsupported and fragile.', decision: 'Migrate all cells off the legacy HMI toolkit by year end.', owner: { role: 'head-of-product', name: 'Lena Vasquez' }, tradeoffs: ['Migration effort on active sites'] },
  { domain: 'product', date: '2025-04-14', title: 'Ship a remote-monitoring add-on for every cell', context: 'Customers wanted uptime visibility and it opened recurring revenue.', decision: 'Bundle a remote-monitoring add-on with every cell.', owner: { role: 'head-of-product', name: 'Lena Vasquez' }, tradeoffs: ['Ongoing support load'] },
  { domain: 'product', date: '2025-05-26', title: 'Adopt simulation-first commissioning', context: 'On-site commissioning overruns were the top schedule risk.', decision: 'Simulate and validate cells digitally before on-site commissioning.', owner: { role: 'head-of-engineering', name: 'Daniel Okonkwo' }, tradeoffs: ['Simulation licensing cost'] },

  // finance
  { domain: 'finance', date: '2025-01-31', title: 'Hold a 20% gross-margin floor and walk from sub-floor deals', context: 'Competitive bids were dragging margins below sustainable levels.', decision: 'Hold a 20% gross-margin floor; walk from deals below it.', owner: { role: 'cfo', name: 'Henrik Bauer' }, tradeoffs: ['Lose price-driven deals'], sources: ['meeting:2025-01-29#margin'] },
  { domain: 'finance', date: '2025-02-18', title: 'Switch to 50/40/10 milestone billing', context: 'Cash was tight between milestones on long builds.', decision: 'Bill 50/40/10 across kickoff, FAT, and SAT milestones.', owner: { role: 'cfo', name: 'Henrik Bauer' }, tradeoffs: ['Tougher negotiation on terms'] },
  { domain: 'finance', date: '2025-03-22', title: 'Self-fund growth and decline outside equity for now', context: 'Inbound term sheets undervalued the book of recurring revenue.', decision: 'Fund growth from operations; decline outside equity this year.', owner: { role: 'founder', name: 'Massimo Sahin', dissent: ['cfo'] }, tradeoffs: ['Slower growth than with capital'] },
  { domain: 'finance', date: '2025-04-29', title: 'Maintain a six-month cash runway buffer', context: 'A supplier delay nearly caused a cash crunch.', decision: 'Keep at least six months of operating cash in reserve.', owner: { role: 'cfo', name: 'Henrik Bauer' } },
  { domain: 'finance', date: '2025-05-12', title: 'Capitalize the simulation software as a tooling asset', context: 'Simulation tooling has multi-year useful life.', decision: 'Capitalize and amortize the simulation software over three years.', owner: { role: 'controller', name: 'Amara Diallo' } },

  // ops
  { domain: 'ops', date: '2025-02-07', title: 'Cap concurrent build projects at three', context: 'Quality slipped when running five builds at once.', decision: 'Cap concurrent builds at three; a fourth waits in queue.', owner: { role: 'head-of-ops', name: 'Tomás Herrera', dissent: ['head-of-sales'] }, tradeoffs: ['Lower throughput'], sources: ['meeting:2025-02-06#wip'] },
  { domain: 'ops', date: '2025-03-14', title: 'Dual-source critical servo drives with a qualified backup vendor', context: 'A single servo-drive vendor was a single point of failure.', decision: 'Qualify and dual-source critical servo drives.', owner: { role: 'head-of-ops', name: 'Tomás Herrera' }, tradeoffs: ['Qualification overhead'] },
  { domain: 'ops', date: '2025-04-02', title: 'Adopt a weekly Monday operating cadence with written commitments', context: 'Verbal commitments slipped without a record.', decision: 'Run a weekly Monday operating review with written commitments.', owner: { role: 'head-of-ops', name: 'Tomás Herrera' } },
  { domain: 'ops', date: '2025-05-05', title: 'Implement a formal risk register reviewed monthly', context: 'Risks were tracked ad hoc and fell through the cracks.', decision: 'Maintain a formal risk register reviewed every month.', owner: { role: 'head-of-ops', name: 'Tomás Herrera' }, sources: ['meeting:2025-05-04#risk'] },
];

const KNOWLEDGE: KnowledgeInput[] = [
  { title: 'Local-first software', source: 'https://www.inkandswitch.com/local-first/', type: 'article', summary: 'Seven ideals for software that keeps data on the user’s own devices while still enabling collaboration.', takeaways: ['Ownership and longevity beat cloud lock-in', 'Offline-first is a feature, not a fallback'], tags: ['architecture', 'local-first'] },
  { title: 'Building a Second Brain', source: 'https://fortelabs.com/blog/basboverview/', type: 'article', summary: 'A CODE methodology (Capture, Organize, Distill, Express) for turning information into reusable knowledge.', takeaways: ['Capture only what resonates', 'Organize by actionability'], tags: ['knowledge', 'pkm'] },
  { title: 'Value-based pricing for integrators', source: 'manual', type: 'note', summary: 'Why pricing automation cells as outcomes beats hourly billing for margin and trust.', takeaways: ['Anchor on the line’s output value', 'Avoid scope haggling'], tags: ['pricing', 'sales'] },
  { title: 'The cost of work-in-progress', source: 'https://example.com/wip-cost', type: 'article', summary: 'Too much WIP destroys throughput and quality; cap concurrent work.', takeaways: ['Limit WIP to protect quality', 'Queue beats overload'], tags: ['ops', 'wip'] },
  { title: 'Dual sourcing critical components', source: 'manual', type: 'note', summary: 'A second qualified vendor de-risks the supply chain for critical parts.', takeaways: ['Qualify backups before you need them'], tags: ['ops', 'supply-chain', 'risk'] },
  { title: 'Simulation-first commissioning', source: 'https://example.com/digital-twin', type: 'video', summary: 'Digital twins cut on-site commissioning time and schedule risk.', takeaways: ['Validate logic before the floor', 'Fewer overruns'], tags: ['product', 'simulation'] },
  { title: 'Recurring revenue for hardware firms', source: 'https://example.com/recurring-hw', type: 'article', summary: 'Monitoring and service add-ons turn one-off builds into recurring revenue.', takeaways: ['Attach a service layer', 'Smooths cash and lifts valuation'], tags: ['finance', 'recurring-revenue'] },
  { title: 'Margin discipline in a downturn', source: 'manual', type: 'note', summary: 'Holding a margin floor protects the business when competitors chase price.', takeaways: ['Walk from sub-floor deals'], tags: ['finance', 'margin'] },
  { title: 'Hiring with structured scorecards', source: 'https://example.com/scorecards', type: 'article', summary: 'Scorecards reduce bias and make hiring decisions consistent.', takeaways: ['Define competencies first', 'Debrief against the rubric'], tags: ['hiring', 'people'] },
  { title: 'The 90-day paid trial', source: 'manual', type: 'note', summary: 'A paid trial project predicts performance better than interviews.', takeaways: ['See real work before committing'], tags: ['hiring'] },
  { title: 'Founder continuity and key-person risk', source: 'https://example.com/key-person', type: 'article', summary: 'Buyers discount companies that depend on one person; document and delegate.', takeaways: ['Name successors', 'Write down how the business runs'], tags: ['m-and-a', 'risk', 'people'] },
  { title: 'Data rooms that raise valuation', source: 'https://example.com/data-room', type: 'article', summary: 'Completeness and traceability reduce perceived risk in diligence.', takeaways: ['Source every claim', 'Organize by buyer checklist'], tags: ['m-and-a', 'valuation'] },
  { title: 'TwinCAT platform standardization', source: 'manual', type: 'note', summary: 'Standardizing the controls platform speeds delivery and support.', takeaways: ['One platform, fewer surprises'], tags: ['product', 'controls'] },
  { title: 'Modular fixturing standards', source: 'manual', type: 'note', summary: 'Reusable fixtures cut per-project engineering time.', takeaways: ['Design for reuse'], tags: ['product', 'fixtures'] },
  { title: 'Milestone billing and cash cycles', source: 'https://example.com/milestone-billing', type: 'article', summary: 'Front-loaded milestone billing protects the cash cycle on long builds.', takeaways: ['Tie cash to FAT/SAT'], tags: ['finance', 'cash'] },
  { title: 'ICP focus beats spray-and-pray', source: 'https://example.com/icp', type: 'article', summary: 'A tight ideal-customer profile lifts win rates and margins.', takeaways: ['Say no to off-ICP deals'], tags: ['sales', 'icp'] },
  { title: 'Weekly operating cadence', source: 'manual', type: 'note', summary: 'A written weekly cadence keeps commitments from slipping.', takeaways: ['Write commitments down', 'Review every Monday'], tags: ['ops', 'cadence'] },
  { title: 'Article Loops: AI systems that scale', source: 'https://x.com/cyrilXBT/status/2068850474384609543', type: 'post', summary: 'Feedback loops, not bigger prompts, are what make AI systems scale in practice.', takeaways: ['Design the loop, not just the prompt'], tags: ['ai', 'systems'] },
  { title: 'On-device LLMs vs cloud cost', source: 'https://example.com/local-llm', type: 'article', summary: 'Local models cut per-call cost and keep data on the machine; route cheap-first.', takeaways: ['Escalate to big models only when unsure'], tags: ['ai', 'local-first', 'cost'] },
  { title: 'Risk registers that actually work', source: 'https://example.com/risk-register', type: 'article', summary: 'A living risk register with owners and mitigations beats ad-hoc tracking.', takeaways: ['Every risk needs an owner', 'Review monthly'], tags: ['ops', 'risk'] },
  { title: 'Selling outcomes in capital equipment', source: 'https://example.com/outcomes', type: 'video', summary: 'Frame proposals around the customer’s line output, not your hours.', takeaways: ['Quantify the outcome'], tags: ['sales', 'pricing'] },
  { title: 'Succession planning basics', source: 'manual', type: 'note', summary: 'Name a successor for every key role and document responsibilities.', takeaways: ['Reduce bus-factor risk'], tags: ['people', 'm-and-a'] },
];

const PEOPLE: PersonInput[] = [
  { name: 'Massimo Sahin', role: 'founder', kind: 'founder', summary: 'Founder and CEO; set the company’s margin discipline and ICP focus. Background in controls engineering and operations.', skills: ['strategy', 'controls', 'operations'], highlights: ['Founded NorthPeak in 2018', 'Grew to 60 staff profitably'], keyPerson: true, startDate: '2018-03', location: 'Stuttgart, DE', email: 'm@northpeak.example' },
  { name: 'Henrik Bauer', role: 'cfo', kind: 'employee', summary: 'CFO; owns margin floor, milestone billing, and the cash-runway policy.', skills: ['finance', 'fp&a', 'controlling'], keyPerson: true, startDate: '2020-06', location: 'Munich, DE' },
  { name: 'Priya Nair', role: 'head-of-sales', kind: 'employee', summary: 'Head of Sales; drove the F&B ICP focus and value-based pricing.', skills: ['enterprise-sales', 'pricing', 'negotiation'], keyPerson: true, startDate: '2019-09', location: 'Amsterdam, NL' },
  { name: 'Daniel Okonkwo', role: 'head-of-engineering', kind: 'employee', summary: 'Head of Engineering; standardized the controls platform and simulation-first commissioning.', skills: ['twincat', 'controls', 'simulation'], keyPerson: true, startDate: '2019-02', location: 'Stuttgart, DE' },
  { name: 'Lena Vasquez', role: 'head-of-product', kind: 'employee', summary: 'Head of Product; owns the modular fixture standard and remote-monitoring add-on.', skills: ['product', 'mechanical-design'], startDate: '2021-01', location: 'Barcelona, ES' },
  { name: 'Tomás Herrera', role: 'head-of-ops', kind: 'employee', summary: 'Head of Operations; runs WIP limits, dual sourcing, and the weekly cadence.', skills: ['operations', 'supply-chain', 'lean'], keyPerson: true, startDate: '2019-11', location: 'Stuttgart, DE' },
  { name: 'Sofia Reinhardt', role: 'head-of-people', kind: 'employee', summary: 'Head of People; built the scorecard hiring process and onboarding bootcamp.', skills: ['recruiting', 'people-ops'], startDate: '2021-05', location: 'Berlin, DE' },
  { name: 'Amara Diallo', role: 'controller', kind: 'employee', summary: 'Financial controller; manages capitalization, audits, and reporting.', skills: ['accounting', 'audit'], startDate: '2022-02', location: 'Munich, DE' },
  { name: 'Jonas Weber', role: 'controls-engineer', kind: 'employee', summary: 'Senior controls engineer specializing in TwinCAT and servo tuning.', skills: ['twincat', 'plc', 'servo'], startDate: '2022-08', location: 'Stuttgart, DE' },
  { name: 'Mei Lin', role: 'controls-engineer', kind: 'employee', summary: 'Controls engineer; vision systems and line integration.', skills: ['vision', 'plc'], startDate: '2023-03', location: 'Stuttgart, DE' },
  { name: 'Carlos Mendes', role: 'mechanical-engineer', kind: 'employee', summary: 'Mechanical engineer; fixture and cell design.', skills: ['cad', 'mechanical-design'], startDate: '2022-04', location: 'Barcelona, ES' },
  { name: 'Hannah Schmidt', role: 'project-manager', kind: 'employee', summary: 'Project manager; runs build schedules and customer comms.', skills: ['project-management'], startDate: '2021-10', location: 'Berlin, DE' },
  { name: 'Ravi Patel', role: 'account-executive', kind: 'employee', summary: 'Account executive for the F&B segment.', skills: ['sales', 'discovery'], startDate: '2022-06', location: 'London, UK' },
  { name: 'Elena Costa', role: 'account-executive', kind: 'employee', summary: 'Account executive; mid-market packaging accounts.', skills: ['sales'], startDate: '2023-01', location: 'Milan, IT' },
  { name: 'Marcus Lindqvist', role: 'service-technician', kind: 'employee', summary: 'Field service technician; commissioning and support.', skills: ['commissioning', 'support'], startDate: '2021-07', location: 'Gothenburg, SE' },
  { name: 'Aisha Khan', role: 'data-engineer', kind: 'employee', summary: 'Data engineer; built the remote-monitoring telemetry pipeline.', skills: ['python', 'telemetry', 'cloud'], startDate: '2023-05', location: 'Berlin, DE' },
  { name: 'Dr. Greta Hoffmann', role: 'advisor', kind: 'advisor', summary: 'Technical advisor; former VP Engineering at a packaging OEM.', skills: ['automation', 'strategy'], startDate: '2020-01', location: 'Hamburg, DE' },
  { name: 'Robert King', role: 'advisor', kind: 'advisor', summary: 'Go-to-market advisor; scaled two industrial SaaS companies.', skills: ['gtm', 'pricing'], startDate: '2021-03', location: 'Boston, US' },
  { name: 'Ingrid Larsen', role: 'board-member', kind: 'board', summary: 'Board member; chair of the audit committee.', skills: ['governance', 'finance'], startDate: '2020-09', location: 'Oslo, NO' },
  { name: 'Paolo Bianchi', role: 'board-member', kind: 'board', summary: 'Board member; industry operator and former CEO.', skills: ['governance', 'operations'], startDate: '2020-09', location: 'Milan, IT' },
  { name: 'Yuki Tanaka', role: 'contractor', kind: 'contractor', summary: 'Contract robotics integrator for peak project load.', skills: ['robotics', 'integration'], startDate: '2023-09', location: 'Remote' },
  { name: 'Sven Andersson', role: 'contractor', kind: 'contractor', summary: 'Contract safety/compliance consultant (CE, ISO 13849).', skills: ['safety', 'compliance'], startDate: '2022-11', location: 'Malmö, SE' },
];

const RECORDS: RecordInput[] = [
  // customers
  { category: 'customer', title: 'Alpine Foods', summary: 'Top account; three packaging lines under service contract.', owner: 'head-of-sales', status: 'active', amount: 420000, currency: '€', recurring: true, dueDate: '2026-03-31', tags: ['f&b', 'key-account'], source: 'crm:alpine' },
  { category: 'customer', title: 'Nordic Dairy Co', summary: 'Two cells plus remote monitoring.', owner: 'head-of-sales', status: 'active', amount: 260000, currency: '€', recurring: true, dueDate: '2026-06-30', tags: ['f&b'] },
  { category: 'customer', title: 'Bavaria Bottling', summary: 'One build, one-off, service attach pending.', owner: 'account-executive', status: 'active', amount: 180000, currency: '€', recurring: false, dueDate: '2026-01-15' },
  { category: 'customer', title: 'Iberia Snacks', summary: 'Discovery phase for a new packaging line.', owner: 'account-executive', status: 'at-risk', amount: 95000, currency: '€', recurring: false },
  { category: 'customer', title: 'GreenLeaf Beverages', summary: 'Renewed monitoring contract; expansion likely.', owner: 'head-of-sales', status: 'active', amount: 140000, currency: '€', recurring: true, dueDate: '2026-09-01', tags: ['f&b', 'expansion'] },
  // financial KPIs
  { category: 'financial', title: 'Gross margin', summary: 'Above the 20% floor and trending up.', metric: 'Gross margin', amount: 27, period: 'Q2 2025', status: 'on-track', source: 'finance:q2' },
  { category: 'financial', title: 'Recurring revenue %', summary: 'Service + monitoring share of revenue.', metric: 'Recurring revenue', amount: 31, period: 'Q2 2025', status: 'improving' },
  { category: 'financial', title: 'Cash runway (months)', summary: 'Operating cash reserve.', metric: 'Runway', amount: 7, period: 'Jun 2025', status: 'on-track' },
  { category: 'financial', title: 'Revenue (TTM)', summary: 'Trailing twelve months revenue.', metric: 'Revenue TTM', amount: 8600000, currency: '€', period: 'TTM Jun 2025' },
  { category: 'financial', title: 'Customer concentration (top account)', summary: 'Largest customer as a share of revenue.', metric: 'Top-account concentration', amount: 12, period: 'Q2 2025', status: 'watch' },
  // risk register
  { category: 'risk', title: 'Key-person dependence on the founder', summary: 'Founder holds key customer and technical relationships.', owner: 'board-member', severity: 'high', mitigation: 'Document playbooks; name successors per key role.', status: 'mitigating' },
  { category: 'risk', title: 'Single-source servo drives', summary: 'Critical drives historically single-sourced.', owner: 'head-of-ops', severity: 'medium', mitigation: 'Backup vendor qualified (see OPS decision).', status: 'mitigated' },
  { category: 'risk', title: 'Customer concentration', summary: 'Top three accounts are a meaningful share of revenue.', owner: 'cfo', severity: 'medium', mitigation: 'Diversify pipeline within the F&B ICP.', status: 'monitoring' },
  { category: 'risk', title: 'Commissioning schedule overruns', summary: 'On-site overruns hit margin and CSAT.', owner: 'head-of-engineering', severity: 'medium', mitigation: 'Simulation-first commissioning.', status: 'mitigating' },
  { category: 'risk', title: 'Cybersecurity of remote monitoring', summary: 'Connected cells expand the attack surface.', owner: 'data-engineer', severity: 'medium', mitigation: 'Segmented network, signed updates, pen-test annually.', status: 'open' },
  // IP & assets
  { category: 'ip', title: 'Modular fixture system (patent pending)', summary: 'Patent application for the modular fixturing standard.', owner: 'head-of-product', status: 'pending', dueDate: '2027-02-01', tags: ['patent'] },
  { category: 'ip', title: 'NorthPeak trademark (EU)', summary: 'Registered EU word mark.', owner: 'cfo', status: 'registered', dueDate: '2031-05-10', tags: ['trademark'] },
  { category: 'ip', title: 'Remote-monitoring software (owned IP)', summary: 'In-house telemetry platform; all contributor IP assigned.', owner: 'head-of-engineering', status: 'owned', tags: ['software', 'ip-assignment'] },
  { category: 'ip', title: 'TwinCAT runtime licenses', summary: 'Per-cell runtime licenses; transferable.', owner: 'controller', status: 'active', dueDate: '2026-12-31', tags: ['license'] },
  { category: 'ip', title: 'northpeak.example domain & brand assets', summary: 'Primary domain and brand assets under company control.', owner: 'head-of-people', status: 'owned', dueDate: '2027-01-20', tags: ['domain'] },
];

export interface DemoSeedDeps {
  ledger: Ledger;
  knowledge: KnowledgeStore;
  people: PeopleStore;
  records: RecordStore;
}

export interface DemoSeedResult {
  decisions: number;
  knowledge: number;
  people: number;
  records: number;
  alreadySeeded?: boolean;
}

/**
 * Populate every store with the demo company. Idempotent via a marker file in
 * the vault root (pass force to seed again anyway).
 */
export async function seedDemo(root: string, deps: DemoSeedDeps, force = false): Promise<DemoSeedResult> {
  const marker = path.join(root, '.demo-seeded');
  if (!force) {
    try {
      await fs.access(marker);
      return { decisions: 0, knowledge: 0, people: 0, records: 0, alreadySeeded: true };
    } catch {
      /* not seeded yet */
    }
  }

  const created = [];
  for (const d of DECISIONS) created.push(await deps.ledger.create(d));
  // A few bi-directional links + one supersede, to make the graph rich.
  const byId = Object.fromEntries(created.map((d) => [d.title, d.id]));
  const link = async (a: string, b: string) => {
    const ida = byId[a];
    const idb = byId[b];
    if (ida && idb) await deps.ledger.update(ida, { links: [idb] });
  };
  await link('Decline the automotive OEM frame contract', 'Hold a 20% gross-margin floor and walk from sub-floor deals');
  await link('Quote value-based cell packages, not hourly engineering', 'Require a paid discovery phase before any build quote');
  await link('Ship a remote-monitoring add-on for every cell', 'Standardize the controls platform on Beckhoff TwinCAT');
  await link('Cap concurrent build projects at three', 'Focus the ICP on mid-market food & beverage packaging lines');

  for (const k of KNOWLEDGE) await deps.knowledge.create(k);
  for (const p of PEOPLE) await deps.people.create(p);
  for (const r of RECORDS) await deps.records.create(r);

  await fs.writeFile(marker, new Date().toISOString());
  return { decisions: DECISIONS.length, knowledge: KNOWLEDGE.length, people: PEOPLE.length, records: RECORDS.length };
}
