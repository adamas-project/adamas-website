import { DOMAINS, type Domain } from '../schema/decision.schema.js';
import type { Ledger, DecisionInput } from '../ledger/ledger.js';
import type { KnowledgeStore, KnowledgeInput } from '../knowledge/store.js';
import type { PeopleStore, PersonInput } from '../people/store.js';
import type { RecordStore, RecordInput } from '../records/store.js';
import type { GlossaryStore, GlossaryInput } from '../glossary/store.js';
import { FAMOUS_NAMES } from './famous-names.js';

// Demo data — one coherent fictional company ("NorthPeak Robotics", a mid-market
// industrial-automation scale-up preparing for M&A) so a client demo shows a
// realistic, interconnected data room. 20+ entries in every category.

const DECISIONS: DecisionInput[] = [
  // hiring
  { domain: 'hiring', date: '2025-01-14', title: 'Run a 90-day paid trial before any full-time engineering offer', context: 'Interviews were poor predictors of on-the-floor performance.', decision: 'Every engineering hire does a paid 90-day trial project before a full-time offer.', owner: { role: 'head-of-people', name: 'Delphine Astovar', dissent: ['head-of-engineering'] }, tradeoffs: ['Slower time-to-hire', 'Some candidates decline a trial'], sources: ['meeting:2025-01-13#hiring-review'] },
  { domain: 'hiring', date: '2025-02-03', title: 'Hire a dedicated controls engineer over a mechanical generalist', context: 'Controls work was the delivery bottleneck on every cell.', decision: 'Prioritize a senior controls engineer for the next hire.', owner: { role: 'head-of-engineering', name: 'Soraya Quillgate' }, tradeoffs: ['Higher comp band'], sources: ['email:2025-01-30#headcount'] },
  { domain: 'hiring', date: '2025-03-10', title: 'Adopt structured scorecards for every interview', context: 'Hiring decisions were inconsistent across panels.', decision: 'All interviews use a shared competency scorecard before a debrief.', owner: { role: 'head-of-people', name: 'Delphine Astovar' }, sources: ['meeting:2025-03-09#people-ops'] },
  { domain: 'hiring', date: '2025-04-22', title: 'Freeze senior hiring until utilization exceeds 75%', context: 'Bench cost was eroding margin during a slow quarter.', decision: 'No new senior hires until billable utilization is above 75% for two months.', owner: { role: 'founder', name: 'Marcus Halvorsen', dissent: ['head-of-sales'] }, tradeoffs: ['Risk of being short-staffed if pipeline rebounds'] },
  { domain: 'hiring', date: '2025-05-30', title: 'Standardize a four-day onboarding bootcamp', context: 'New hires took months to become productive on our stack.', decision: 'Every new hire completes a 4-day onboarding bootcamp in week one.', owner: { role: 'head-of-people', name: 'Delphine Astovar' }, tradeoffs: ['Upfront time cost'] },

  // sales
  { domain: 'sales', date: '2025-01-20', title: 'Decline the automotive OEM frame contract', context: 'A large OEM offered ~$900k/yr at ~11% margin, off-ICP, with punitive change-order terms.', decision: 'Decline the contract and protect capacity for higher-margin F&B work.', owner: { role: 'founder', name: 'Marcus Halvorsen', dissent: ['head-of-sales'] }, tradeoffs: ['Forgoes ~$900k/yr top line', 'Strains a marquee-logo relationship'], sources: ['meeting:2025-01-18#oem-go-no-go'] },
  { domain: 'sales', date: '2025-02-12', title: 'Focus the ICP on mid-market food & beverage packaging lines', context: 'Win rates and margins were far higher in F&B than in scattered verticals.', decision: 'Concentrate sales and marketing on mid-market F&B packaging integrators.', owner: { role: 'head-of-sales', name: 'Rovan Brashford' }, tradeoffs: ['Narrower funnel'] , sources: ['doc:2025-02#icp-analysis'] },
  { domain: 'sales', date: '2025-03-05', title: 'Quote value-based cell packages, not hourly engineering', context: 'Hourly quoting capped upside and invited scope haggling.', decision: 'Price work as fixed value-based cell packages.', owner: { role: 'head-of-sales', name: 'Rovan Brashford' }, tradeoffs: ['More estimation risk on us'] },
  { domain: 'sales', date: '2025-04-08', title: 'Require a paid discovery phase before any build quote', context: 'Unpaid scoping burned engineering hours on deals that never closed.', decision: 'A paid discovery phase precedes every build quote.', owner: { role: 'head-of-sales', name: 'Rovan Brashford' }, sources: ['meeting:2025-04-07#sales-process'] },
  { domain: 'sales', date: '2025-05-19', title: 'Drop the reseller channel and sell direct', context: 'Resellers wanted heavy discounts and owned the customer relationship.', decision: 'Wind down the reseller channel and sell direct.', owner: { role: 'head-of-sales', name: 'Rovan Brashford', dissent: ['founder'] }, tradeoffs: ['Lose some reach in the short term'] },

  // product
  { domain: 'product', date: '2025-01-28', title: 'Standardize the controls platform on Beckhoff TwinCAT', context: 'Bespoke stacks slowed delivery and made support hard.', decision: 'Standardize all new cells on Beckhoff TwinCAT.', owner: { role: 'head-of-engineering', name: 'Soraya Quillgate' }, tradeoffs: ['Retraining cost'], sources: ['doc:2025-01#platform-adr'] },
  { domain: 'product', date: '2025-02-25', title: 'Build cells on a modular fixture standard, not bespoke rigs', context: 'Every project reinvented fixturing from scratch.', decision: 'Adopt a modular fixture standard reused across cells.', owner: { role: 'head-of-product', name: 'Tobias Norrindale' }, tradeoffs: ['Up-front standardization effort'] },
  { domain: 'product', date: '2025-03-18', title: 'Sunset the legacy HMI toolkit', context: 'The old HMI toolkit was unsupported and fragile.', decision: 'Migrate all cells off the legacy HMI toolkit by year end.', owner: { role: 'head-of-product', name: 'Tobias Norrindale' }, tradeoffs: ['Migration effort on active sites'] },
  { domain: 'product', date: '2025-04-14', title: 'Ship a remote-monitoring add-on for every cell', context: 'Customers wanted uptime visibility and it opened recurring revenue.', decision: 'Bundle a remote-monitoring add-on with every cell.', owner: { role: 'head-of-product', name: 'Tobias Norrindale' }, tradeoffs: ['Ongoing support load'] },
  { domain: 'product', date: '2025-05-26', title: 'Adopt simulation-first commissioning', context: 'On-site commissioning overruns were the top schedule risk.', decision: 'Simulate and validate cells digitally before on-site commissioning.', owner: { role: 'head-of-engineering', name: 'Soraya Quillgate' }, tradeoffs: ['Simulation licensing cost'] },

  // finance
  { domain: 'finance', date: '2025-01-31', title: 'Hold a 20% gross-margin floor and walk from sub-floor deals', context: 'Competitive bids were dragging margins below sustainable levels.', decision: 'Hold a 20% gross-margin floor; walk from deals below it.', owner: { role: 'cfo', name: 'Eleni Castermount' }, tradeoffs: ['Lose price-driven deals'], sources: ['meeting:2025-01-29#margin'] },
  { domain: 'finance', date: '2025-02-18', title: 'Switch to 50/40/10 milestone billing', context: 'Cash was tight between milestones on long builds.', decision: 'Bill 50/40/10 across kickoff, FAT, and SAT milestones.', owner: { role: 'cfo', name: 'Eleni Castermount' }, tradeoffs: ['Tougher negotiation on terms'] },
  { domain: 'finance', date: '2025-03-22', title: 'Self-fund growth and decline outside equity for now', context: 'Inbound term sheets undervalued the book of recurring revenue.', decision: 'Fund growth from operations; decline outside equity this year.', owner: { role: 'founder', name: 'Marcus Halvorsen', dissent: ['cfo'] }, tradeoffs: ['Slower growth than with capital'] },
  { domain: 'finance', date: '2025-04-29', title: 'Maintain a six-month cash runway buffer', context: 'A supplier delay nearly caused a cash crunch.', decision: 'Keep at least six months of operating cash in reserve.', owner: { role: 'cfo', name: 'Eleni Castermount' } },
  { domain: 'finance', date: '2025-05-12', title: 'Capitalize the simulation software as a tooling asset', context: 'Simulation tooling has multi-year useful life.', decision: 'Capitalize and amortize the simulation software over three years.', owner: { role: 'controller', name: 'Ingrid Pellowin' } },

  // ops
  { domain: 'ops', date: '2025-02-07', title: 'Cap concurrent build projects at three', context: 'Quality slipped when running five builds at once.', decision: 'Cap concurrent builds at three; a fourth waits in queue.', owner: { role: 'head-of-ops', name: 'Priya Vandermoor', dissent: ['head-of-sales'] }, tradeoffs: ['Lower throughput'], sources: ['meeting:2025-02-06#wip'] },
  { domain: 'ops', date: '2025-03-14', title: 'Dual-source critical servo drives with a qualified backup vendor', context: 'A single servo-drive vendor was a single point of failure.', decision: 'Qualify and dual-source critical servo drives.', owner: { role: 'head-of-ops', name: 'Priya Vandermoor' }, tradeoffs: ['Qualification overhead'] },
  { domain: 'ops', date: '2025-04-02', title: 'Adopt a weekly Monday operating cadence with written commitments', context: 'Verbal commitments slipped without a record.', decision: 'Run a weekly Monday operating review with written commitments.', owner: { role: 'head-of-ops', name: 'Priya Vandermoor' } },
  { domain: 'ops', date: '2025-05-05', title: 'Implement a formal risk register reviewed monthly', context: 'Risks were tracked ad hoc and fell through the cracks.', decision: 'Maintain a formal risk register reviewed every month.', owner: { role: 'head-of-ops', name: 'Priya Vandermoor' }, sources: ['meeting:2025-05-04#risk'] },
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
  { name: 'Marcus Halvorsen', role: 'founder', kind: 'founder', keyPerson: true, summary: 'Founder and CEO; set the company’s margin discipline and ICP focus. Background in controls engineering and operations.', skills: ['strategy', 'controls', 'operations'], highlights: ['Founded NorthPeak in 2018', 'Grew to 60 staff profitably'], startDate: '2018-03', location: 'Stuttgart, DE', email: 'm@northpeak.example' },
  { name: 'Eleni Castermount', role: 'cfo', kind: 'employee', summary: 'CFO; owns margin floor, milestone billing, and the cash-runway policy.', skills: ['finance', 'fp&a', 'controlling'], startDate: '2020-06', location: 'Munich, DE' },
  { name: 'Rovan Brashford', role: 'head-of-sales', kind: 'employee', summary: 'Head of Sales; drove the F&B ICP focus and value-based pricing.', skills: ['enterprise-sales', 'pricing', 'negotiation'], startDate: '2019-09', location: 'Amsterdam, NL' },
  { name: 'Soraya Quillgate', role: 'head-of-engineering', kind: 'employee', summary: 'Head of Engineering; standardized the controls platform and simulation-first commissioning.', skills: ['twincat', 'controls', 'simulation'], startDate: '2019-02', location: 'Stuttgart, DE' },
  { name: 'Tobias Norrindale', role: 'head-of-product', kind: 'employee', summary: 'Head of Product; owns the modular fixture standard and remote-monitoring add-on.', skills: ['product', 'mechanical-design'], startDate: '2021-01', location: 'Barcelona, ES' },
  { name: 'Priya Vandermoor', role: 'head-of-ops', kind: 'employee', summary: 'Head of Operations; runs WIP limits, dual sourcing, and the weekly cadence.', skills: ['operations', 'supply-chain', 'lean'], startDate: '2019-11', location: 'Stuttgart, DE' },
  { name: 'Delphine Astovar', role: 'head-of-people', kind: 'employee', summary: 'Head of People; built the scorecard hiring process and onboarding bootcamp.', skills: ['recruiting', 'people-ops'], startDate: '2021-05', location: 'Berlin, DE' },
  { name: 'Ingrid Pellowin', role: 'controller', kind: 'employee', summary: 'Financial controller; manages capitalization, audits, and reporting.', skills: ['accounting', 'audit'], startDate: '2022-02', location: 'Munich, DE' },
  { name: 'Aldric Tavelholm', role: 'controls-engineer', kind: 'employee', summary: 'Senior controls engineer specializing in TwinCAT and servo tuning.', skills: ['twincat', 'plc', 'servo'], startDate: '2022-08', location: 'Stuttgart, DE' },
  { name: 'Nerys Larkmoor', role: 'controls-engineer', kind: 'employee', summary: 'Controls engineer; vision systems and line integration.', skills: ['vision', 'plc'], startDate: '2023-03', location: 'Stuttgart, DE' },
  { name: 'Esteban Calvecchio', role: 'mechanical-engineer', kind: 'employee', summary: 'Mechanical engineer; fixture and cell design.', skills: ['cad', 'mechanical-design'], startDate: '2022-04', location: 'Barcelona, ES' },
  { name: 'Carola Brindlecourt', role: 'project-manager', kind: 'employee', summary: 'Project manager; runs build schedules and customer comms.', skills: ['project-management'], startDate: '2021-10', location: 'Berlin, DE' },
  { name: 'Rahim Wexbury', role: 'account-executive', kind: 'employee', summary: 'Account executive for the F&B segment.', skills: ['sales', 'discovery'], startDate: '2022-06', location: 'London, UK' },
  { name: 'Liora Cresswold', role: 'account-executive', kind: 'employee', summary: 'Account executive; mid-market packaging accounts.', skills: ['sales'], startDate: '2023-01', location: 'Milan, IT' },
  { name: 'Sven Garnoff', role: 'service-technician', kind: 'employee', summary: 'Field service technician; commissioning and support.', skills: ['commissioning', 'support'], startDate: '2021-07', location: 'Gothenburg, SE' },
  { name: 'Amina Salvern', role: 'data-engineer', kind: 'employee', summary: 'Data engineer; built the remote-monitoring telemetry pipeline.', skills: ['python', 'telemetry', 'cloud'], startDate: '2023-05', location: 'Berlin, DE' },
  { name: 'Helene Mordancey', role: 'advisor', kind: 'advisor', summary: 'Technical advisor; former VP Engineering at a packaging OEM.', skills: ['automation', 'strategy'], startDate: '2020-01', location: 'Hamburg, DE' },
  { name: 'Gideon Tollard', role: 'advisor', kind: 'advisor', summary: 'Go-to-market advisor; scaled two industrial SaaS companies.', skills: ['gtm', 'pricing'], startDate: '2021-03', location: 'Boston, US' },
  { name: 'Annika Renquist', role: 'board-member', kind: 'board', summary: 'Board member; chair of the audit committee.', skills: ['governance', 'finance'], startDate: '2020-09', location: 'Oslo, NO' },
  { name: 'Matteo Yelloway', role: 'board-member', kind: 'board', summary: 'Board member; industry operator and former CEO.', skills: ['governance', 'operations'], startDate: '2020-09', location: 'Milan, IT' },
  { name: 'Kenji Avondreth', role: 'contractor', kind: 'contractor', summary: 'Contract robotics integrator for peak project load.', skills: ['robotics', 'integration'], startDate: '2023-09', location: 'Remote' },
  { name: 'Lasse Lindquay', role: 'contractor', kind: 'contractor', summary: 'Contract safety/compliance consultant (CE, ISO 13849).', skills: ['safety', 'compliance'], startDate: '2022-11', location: 'Malmö, SE' },
];

const RECORDS: RecordInput[] = [
  // customers
  { category: 'customer', title: 'Alpine Foods', summary: 'Top account; three packaging lines under service contract.', owner: 'head-of-sales', status: 'active', amount: 420000, currency: '$', recurring: true, dueDate: '2026-03-31', tags: ['f&b', 'key-account'], source: 'crm:alpine' },
  { category: 'customer', title: 'Nordic Dairy Co', summary: 'Two cells plus remote monitoring.', owner: 'head-of-sales', status: 'active', amount: 260000, currency: '$', recurring: true, dueDate: '2026-06-30', tags: ['f&b'] },
  { category: 'customer', title: 'Bavaria Bottling', summary: 'One build, one-off, service attach pending.', owner: 'account-executive', status: 'active', amount: 180000, currency: '$', recurring: false, dueDate: '2026-01-15' },
  { category: 'customer', title: 'Iberia Snacks', summary: 'Discovery phase for a new packaging line.', owner: 'account-executive', status: 'at-risk', amount: 95000, currency: '$', recurring: false },
  { category: 'customer', title: 'GreenLeaf Beverages', summary: 'Renewed monitoring contract; expansion likely.', owner: 'head-of-sales', status: 'active', amount: 140000, currency: '$', recurring: true, dueDate: '2026-09-01', tags: ['f&b', 'expansion'] },
  // financial KPIs
  { category: 'financial', title: 'Gross margin', summary: 'Above the 20% floor and trending up.', metric: 'Gross margin', amount: 27, period: 'Q2 2025', status: 'on-track', source: 'finance:q2' },
  { category: 'financial', title: 'Recurring revenue %', summary: 'Service + monitoring share of revenue.', metric: 'Recurring revenue', amount: 31, period: 'Q2 2025', status: 'improving' },
  { category: 'financial', title: 'Cash runway (months)', summary: 'Operating cash reserve.', metric: 'Runway', amount: 7, period: 'Jun 2025', status: 'on-track' },
  { category: 'financial', title: 'Revenue (TTM)', summary: 'Trailing twelve months revenue.', metric: 'Revenue TTM', amount: 8600000, currency: '$', period: 'TTM Jun 2025' },
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
  glossary: GlossaryStore;
}

// Glossary — company/industry terms (handbook & onboarding source).
const GLOSSARY: GlossaryInput[] = (
  [
    ['FAT', 'Factory Acceptance Test — validating a cell at our facility before shipment.', 'ops', 'Factory Acceptance Test'],
    ['SAT', 'Site Acceptance Test — validating a cell at the customer site after install.', 'ops', 'Site Acceptance Test'],
    ['PLC', 'Programmable Logic Controller — the industrial computer that runs a cell.', 'product', 'Programmable Logic Controller'],
    ['HMI', 'Human-Machine Interface — the operator screen on a cell.', 'product', 'Human-Machine Interface'],
    ['OEE', 'Overall Equipment Effectiveness — availability × performance × quality.', 'ops', 'Overall Equipment Effectiveness'],
    ['Takt time', 'The pace of production needed to meet customer demand.', 'ops', ''],
    ['ICP', 'Ideal Customer Profile — the segment we focus sales on (mid-market F&B).', 'sales', 'Ideal Customer Profile'],
    ['ARR', 'Annual Recurring Revenue — yearly value of recurring contracts.', 'finance', 'Annual Recurring Revenue'],
    ['NRR', 'Net Revenue Retention — expansion minus churn on existing accounts.', 'finance', 'Net Revenue Retention'],
    ['DSO', 'Days Sales Outstanding — average days to collect a receivable.', 'finance', 'Days Sales Outstanding'],
    ['EBITDA', 'Earnings Before Interest, Taxes, Depreciation and Amortization.', 'finance', ''],
    ['MEDDICC', 'An enterprise sales qualification framework.', 'sales', ''],
    ['CMMS', 'Computerized Maintenance Management System.', 'ops', ''],
    ['OPC-UA', 'A vendor-neutral standard for machine-to-system data exchange.', 'product', ''],
    ['ISO 13849', 'Machinery safety standard for control-system performance levels.', 'product', ''],
    ['CE marking', 'EU conformity marking required to sell machinery in the EEA.', 'product', ''],
    ['WIP', 'Work In Progress — the number of builds running concurrently.', 'ops', 'Work In Progress'],
    ['Lead time', 'Time from order to delivery of a cell.', 'ops', ''],
    ['Gross margin', 'Revenue minus cost of goods sold, as a percentage.', 'finance', ''],
    ['Dual sourcing', 'Qualifying two vendors for a critical component to de-risk supply.', 'ops', ''],
    ['Digital twin', 'A simulation model of a cell used to validate logic before the floor.', 'product', ''],
    ['Servo drive', 'The amplifier that controls a servo motor’s motion.', 'product', ''],
    ['Commissioning', 'Bringing a cell into full working order on site.', 'ops', ''],
    ['Runway', 'Months of operating cash before reserves run out.', 'finance', ''],
    ['Backlog', 'Signed orders not yet recognized as revenue.', 'finance', ''],
    ['Churn', 'The rate at which customers do not renew.', 'sales', ''],
    ['Discovery phase', 'A paid scoping engagement before a build quote.', 'sales', ''],
    ['Milestone billing', 'Invoicing in stages tied to project milestones (50/40/10).', 'finance', ''],
    ['Bus factor', 'How many people must leave before knowledge is lost — a key-person risk.', 'people', 'key-person risk'],
    ['Data room', 'The organized set of documents a buyer reviews in diligence.', 'm-and-a', ''],
    ['Quality of earnings', 'A diligence analysis of how sustainable reported earnings are.', 'm-and-a', 'QoE'],
    ['Earn-out', 'Deal consideration paid later, contingent on performance.', 'm-and-a', ''],
    ['SLA', 'Service Level Agreement — guaranteed response/uptime terms.', 'sales', 'Service Level Agreement'],
    ['Preventive maintenance', 'Scheduled maintenance to prevent failures.', 'ops', ''],
    ['Root-cause analysis', 'Structured investigation to find the underlying cause of a defect.', 'ops', 'RCA'],
    ['First-pass yield', 'Share of units that pass without rework.', 'ops', ''],
    ['Capex', 'Capital expenditure — spend on long-lived assets.', 'finance', ''],
    ['Opex', 'Operating expenditure — day-to-day running costs.', 'finance', ''],
    ['Utilization', 'Share of engineering time that is billable.', 'finance', ''],
    ['Pipeline coverage', 'Pipeline value relative to the quota for a period.', 'sales', ''],
    ['Telemetry', 'Machine data streamed from cells for monitoring.', 'product', ''],
    ['Predictive maintenance', 'Using telemetry to predict failures before they happen.', 'product', ''],
    ['Modular fixturing', 'A reusable fixture standard shared across cells.', 'product', ''],
    ['Value-based pricing', 'Pricing on the customer’s outcome, not our hours.', 'sales', ''],
    ['Margin floor', 'The minimum acceptable gross margin on a deal.', 'finance', ''],
    ['Onboarding bootcamp', 'A four-day program every new hire completes in week one.', 'people', ''],
    ['Scorecard hiring', 'Interviewing against a shared competency rubric.', 'people', ''],
    ['Risk register', 'A living list of risks with owners, mitigations, and status.', 'ops', ''],
  ] as const
).map(([term, definition, tag, alias]) => ({ term, definition, tags: [tag], ...(alias ? { aliases: [alias] } : {}) }));

// ── Second wave (doubles the data) ──────────────────────────
const EXTRA_DECISIONS: DecisionInput[] = [
  // hiring
  { domain: 'hiring', date: '2025-06-09', title: 'Introduce an employee referral bonus program', context: 'Best hires came from referrals but there was no incentive.', decision: 'Pay a referral bonus for hires that pass probation.', owner: { role: 'head-of-people', name: 'Delphine Astovar' } },
  { domain: 'hiring', date: '2025-06-23', title: 'Create a senior technical career track without forced management', context: 'Top engineers were leaving to avoid management roles.', decision: 'Add a senior IC track with equal pay bands to management.', owner: { role: 'head-of-engineering', name: 'Soraya Quillgate' } },
  { domain: 'hiring', date: '2025-07-07', title: 'Move to quarterly performance check-ins', context: 'Annual reviews gave feedback too late.', decision: 'Replace annual reviews with lightweight quarterly check-ins.', owner: { role: 'head-of-people', name: 'Delphine Astovar' } },
  { domain: 'hiring', date: '2025-07-21', title: 'Hire a regional service lead for the Nordics', context: 'Nordic accounts grew faster than local support coverage.', decision: 'Hire a Nordics-based service lead.', owner: { role: 'head-of-ops', name: 'Priya Vandermoor' }, tradeoffs: ['New regional overhead'] },
  // sales
  { domain: 'sales', date: '2025-06-11', title: 'Add a standard SLA tier for service contracts', context: 'Ad-hoc SLAs were hard to price and support.', decision: 'Offer three standard SLA tiers (Bronze/Silver/Gold).', owner: { role: 'head-of-sales', name: 'Rovan Brashford' } },
  { domain: 'sales', date: '2025-06-25', title: 'Enter the bakery sub-segment of F&B', context: 'Bakery lines share our packaging expertise.', decision: 'Expand the ICP to include bakery packaging.', owner: { role: 'head-of-sales', name: 'Rovan Brashford' }, tradeoffs: ['New application learning curve'] },
  { domain: 'sales', date: '2025-07-09', title: 'Set a minimum new-build deal size of €75k', context: 'Small builds consumed disproportionate overhead.', decision: 'Decline new builds under €75k.', owner: { role: 'head-of-sales', name: 'Rovan Brashford', dissent: ['founder'] } },
  { domain: 'sales', date: '2025-07-23', title: 'Publish reference case studies with named customers', context: 'Prospects wanted proof from peers.', decision: 'Publish named case studies (with customer consent).', owner: { role: 'head-of-sales', name: 'Rovan Brashford' } },
  // product
  { domain: 'product', date: '2025-06-13', title: 'Add OPC-UA connectivity to every cell', context: 'Customers needed standardized data integration.', decision: 'Expose OPC-UA on all new cells by default.', owner: { role: 'head-of-engineering', name: 'Soraya Quillgate' } },
  { domain: 'product', date: '2025-06-27', title: 'Offer a predictive-maintenance tier on monitoring', context: 'Telemetry data enabled failure prediction.', decision: 'Add a predictive-maintenance upgrade to the monitoring add-on.', owner: { role: 'head-of-product', name: 'Tobias Norrindale' } },
  { domain: 'product', date: '2025-07-11', title: 'Standardize safety architecture on ISO 13849 PLd', context: 'Inconsistent safety design slowed CE sign-off.', decision: 'Adopt a standard ISO 13849 PLd safety architecture.', owner: { role: 'head-of-engineering', name: 'Soraya Quillgate' } },
  { domain: 'product', date: '2025-07-25', title: 'Build a spare-parts kit catalog', context: 'Spares were quoted ad hoc, delaying repairs.', decision: 'Publish a standard spare-parts kit catalog per cell type.', owner: { role: 'head-of-product', name: 'Tobias Norrindale' } },
  // finance
  { domain: 'finance', date: '2025-06-16', title: 'Move to monthly rolling forecasts', context: 'Annual budgets drifted from reality.', decision: 'Adopt a 12-month rolling forecast updated monthly.', owner: { role: 'cfo', name: 'Eleni Castermount' } },
  { domain: 'finance', date: '2025-06-30', title: 'Hedge euro/USD exposure on imported drives', context: 'FX swings hit the cost of imported components.', decision: 'Hedge USD component exposure with forward contracts.', owner: { role: 'cfo', name: 'Eleni Castermount' } },
  { domain: 'finance', date: '2025-07-14', title: 'Set a DSO target of 45 days', context: 'Slow collections strained working capital.', decision: 'Target days-sales-outstanding of 45 days.', owner: { role: 'controller', name: 'Ingrid Pellowin' } },
  { domain: 'finance', date: '2025-07-28', title: 'Establish a €25k capex approval threshold', context: 'Capital spend lacked a consistent gate.', decision: 'Require CFO approval for capex above €25k.', owner: { role: 'cfo', name: 'Eleni Castermount' } },
  // ops
  { domain: 'ops', date: '2025-06-18', title: 'Adopt a CMMS for maintenance scheduling', context: 'Maintenance was tracked in spreadsheets.', decision: 'Roll out a CMMS for scheduled maintenance.', owner: { role: 'head-of-ops', name: 'Priya Vandermoor' } },
  { domain: 'ops', date: '2025-07-02', title: 'Require FAT sign-off before shipment', context: 'Defects slipped to site without a gate.', decision: 'No cell ships without a factory acceptance test sign-off.', owner: { role: 'head-of-ops', name: 'Priya Vandermoor' } },
  { domain: 'ops', date: '2025-07-16', title: 'Set a 48-hour critical support response SLA', context: 'Downtime needed a guaranteed response.', decision: 'Guarantee a 48-hour response on critical support tickets.', owner: { role: 'head-of-ops', name: 'Priya Vandermoor' } },
  { domain: 'ops', date: '2025-07-30', title: 'Run quarterly supplier scorecard reviews', context: 'Supplier quality varied without review.', decision: 'Review key suppliers on a quarterly scorecard.', owner: { role: 'head-of-ops', name: 'Priya Vandermoor' } },
];

const EXTRA_KNOWLEDGE: KnowledgeInput[] = (
  [
    ['Designing service SLAs that scale', 'article', 'Tiered SLAs make service pricing and staffing predictable.', 'ops', 'sales'],
    ['OPC-UA for industrial data', 'article', 'A vendor-neutral standard for machine-to-system data.', 'product', 'integration'],
    ['Predictive maintenance with telemetry', 'video', 'Using sensor data to predict failures before downtime.', 'product', 'ai'],
    ['ISO 13849 safety basics', 'article', 'Performance levels and safety architecture for machinery.', 'product', 'safety'],
    ['Rolling forecasts beat annual budgets', 'article', 'Continuous forecasting keeps finance close to reality.', 'finance'],
    ['FX hedging for importers', 'note', 'Forward contracts smooth currency risk on imported parts.', 'finance', 'risk'],
    ['Reducing days-sales-outstanding', 'note', 'Practical levers to collect cash faster.', 'finance', 'cash'],
    ['CMMS selection guide', 'article', 'What to look for in a maintenance management system.', 'ops'],
    ['Factory acceptance testing', 'note', 'A FAT gate catches defects before they reach the customer.', 'ops', 'quality'],
    ['Supplier scorecards', 'note', 'Score suppliers on quality, delivery, and responsiveness.', 'ops', 'supply-chain'],
    ['Reference selling in capital equipment', 'article', 'Named case studies shorten the sales cycle.', 'sales'],
    ['Career ladders for engineers', 'article', 'Dual IC/management tracks retain senior talent.', 'hiring', 'people'],
    ['Referral programs that work', 'note', 'Incentivize referrals without gaming.', 'hiring'],
    ['Quarterly check-ins vs annual reviews', 'article', 'Faster feedback loops improve performance.', 'hiring', 'people'],
    ['Spare-parts strategy', 'note', 'Kitting spares reduces repair lead time.', 'product', 'service'],
    ['Working-capital management', 'article', 'Balancing inventory, receivables, and payables.', 'finance'],
    ['Cybersecurity for connected machines', 'article', 'Segmentation and signed updates for OT networks.', 'risk', 'security'],
    ['Net revenue retention explained', 'article', 'Why NRR is a key valuation driver.', 'finance', 'valuation'],
    ['Build vs buy for monitoring software', 'note', 'When to own the telemetry stack.', 'product', 'build-vs-buy'],
    ['Customer concentration risk', 'article', 'How buyers view revenue concentration in diligence.', 'm-and-a', 'risk'],
    ['The diligence binder', 'note', 'What belongs in a buyer-ready diligence binder.', 'm-and-a'],
    ['Pricing experiments without churn', 'article', 'Test pricing on new logos, protect the base.', 'pricing', 'sales'],
  ] as const
).map(([title, type, summary, ...tags]) => ({ title, source: 'manual', type: type as KnowledgeInput['type'], summary, tags: [...tags] }));

const EXTRA_PEOPLE: PersonInput[] = (
  [
    ['Vesna Harrowgate', 'service-technician', 'employee', 'Field service technician for the DACH region.', 'Vienna, AT', 'commissioning'],
    ['Darian Stennfeld', 'controls-engineer', 'employee', 'Controls engineer; safety and motion.', 'Stuttgart, DE', 'plc'],
    ['Giulia Marchetwood', 'project-manager', 'employee', 'Project manager for F&B builds.', 'Milan, IT', 'project-management'],
    ['Florian Ondrasek', 'mechanical-engineer', 'employee', 'Mechanical engineer; fixturing.', 'Stuttgart, DE', 'cad'],
    ['Noemi Velbrook', 'account-executive', 'employee', 'Account executive; bakery segment.', 'Paris, FR', 'sales'],
    ['Bjorn Castermount', 'service-lead', 'employee', 'Regional service lead, Nordics.', 'Stockholm, SE', 'service'],
    ['Petra Drummerfield', 'quality-engineer', 'employee', 'Quality engineer; FAT/SAT and compliance.', 'Zagreb, HR', 'quality'],
    ['Hong Pellowin', 'data-engineer', 'employee', 'Data engineer; predictive-maintenance models.', 'Berlin, DE', 'python'],
    ['Eamon Cresswold', 'sales-engineer', 'employee', 'Sales engineer; discovery and solution design.', 'Dublin, IE', 'pre-sales'],
    ['Margaux Vandermoor', 'marketing-lead', 'employee', 'Marketing lead; case studies and demand gen.', 'Lyon, FR', 'marketing'],
    ['Klaus Brashford', 'procurement-manager', 'employee', 'Procurement; supplier scorecards and dual sourcing.', 'Munich, DE', 'procurement'],
    ['Aatos Norrindale', 'controls-engineer', 'employee', 'Controls engineer; OPC-UA integration.', 'Helsinki, FI', 'opc-ua'],
    ['Rui Thessaly', 'service-technician', 'employee', 'Service technician; Iberia.', 'Lisbon, PT', 'support'],
    ['Astrid Garnoff', 'people-ops', 'employee', 'People-ops specialist; onboarding.', 'Gothenburg, SE', 'people-ops'],
    ['Velin Astovar', 'software-engineer', 'employee', 'Software engineer; monitoring platform.', 'Sofia, BG', 'typescript'],
    ['Wojciech Salvern', 'fp&a-analyst', 'employee', 'FP&A analyst; rolling forecasts.', 'Warsaw, PL', 'fp&a'],
    ['Theron Calvecchio', 'advisor', 'advisor', 'Advisor; manufacturing operations.', 'Athens, GR', 'operations'],
    ['Marisedd Tollard', 'advisor', 'advisor', 'Advisor; M&A and corporate finance.', 'London, UK', 'm-and-a'],
    ['Konrad Larkmoor', 'board-member', 'board', 'Board member; industry veteran.', 'Frankfurt, DE', 'governance'],
    ['Branka Avondreth', 'contractor', 'contractor', 'Contract technical writer; documentation.', 'Ljubljana, SI', 'documentation'],
    ['Tiago Renquist', 'contractor', 'contractor', 'Contract electrical designer.', 'Porto, PT', 'electrical'],
    ['Ilvana Brindlecourt', 'controls-engineer', 'employee', 'Controls engineer; vision and robotics.', 'Berlin, DE', 'vision'],
  ] as const
).map(([name, role, kind, summary, location, skill]) => ({ name, role, kind: kind as PersonInput['kind'], summary, location, skills: [skill] }));

const EXTRA_RECORDS: RecordInput[] = [
  // customers
  { category: 'customer', title: 'Crisp & Co', summary: 'Bakery packaging line; new logo.', owner: 'account-executive', status: 'active', amount: 210000, currency: '$', recurring: false, dueDate: '2026-02-28', tags: ['bakery'] },
  { category: 'customer', title: 'PurePress Juices', summary: 'Two lines + Gold SLA.', owner: 'head-of-sales', status: 'active', amount: 320000, currency: '$', recurring: true, dueDate: '2026-07-15', tags: ['f&b'] },
  { category: 'customer', title: 'Tundra Frozen', summary: 'Monitoring + predictive-maintenance tier.', owner: 'head-of-sales', status: 'active', amount: 175000, currency: '$', recurring: true, dueDate: '2026-04-30' },
  { category: 'customer', title: 'Mediterraneo Olive', summary: 'Single cell; expansion in discussion.', owner: 'account-executive', status: 'active', amount: 120000, currency: '$', recurring: false },
  { category: 'customer', title: 'Highland Brewing', summary: 'Bottling line; Silver SLA.', owner: 'account-executive', status: 'at-risk', amount: 90000, currency: '$', recurring: true, dueDate: '2026-05-20' },
  // financial KPIs
  { category: 'financial', title: 'EBITDA margin', summary: 'Operating profitability.', metric: 'EBITDA margin', amount: 14, period: 'Q2 2025', status: 'on-track' },
  { category: 'financial', title: 'Net revenue retention', summary: 'Expansion minus churn on existing accounts.', metric: 'NRR', amount: 112, period: 'Q2 2025', status: 'improving' },
  { category: 'financial', title: 'Pipeline coverage', summary: 'Pipeline vs quota for next quarter.', metric: 'Pipeline coverage', amount: 3, period: 'Q3 2025', status: 'on-track' },
  { category: 'financial', title: 'Order backlog', summary: 'Signed but unrecognized revenue.', metric: 'Backlog', amount: 4200000, currency: '$', period: 'Jun 2025' },
  { category: 'financial', title: 'Billable utilization', summary: 'Engineering utilization rate.', metric: 'Utilization', amount: 78, period: 'Q2 2025', status: 'on-track' },
  // risk register
  { category: 'risk', title: 'FX exposure on imported components', summary: 'USD-priced drives expose margin to FX.', owner: 'cfo', severity: 'medium', mitigation: 'Forward contracts (see finance decision).', status: 'mitigating' },
  { category: 'risk', title: 'Senior talent retention', summary: 'Competition for senior controls engineers.', owner: 'head-of-people', severity: 'medium', mitigation: 'IC career track + referral program.', status: 'mitigating' },
  { category: 'risk', title: 'Warranty claims exposure', summary: 'Defects in early cells could drive claims.', owner: 'head-of-engineering', severity: 'low', mitigation: 'FAT gate + simulation-first commissioning.', status: 'monitoring' },
  { category: 'risk', title: 'CE / regulatory compliance', summary: 'Machinery must meet CE and ISO safety.', owner: 'quality-engineer', severity: 'medium', mitigation: 'Standard ISO 13849 PLd architecture.', status: 'mitigating' },
  { category: 'risk', title: 'Customer churn on renewals', summary: 'Service renewals are not guaranteed.', owner: 'head-of-sales', severity: 'low', mitigation: 'Proactive QBRs and SLA adherence.', status: 'monitoring' },
  // IP & assets
  { category: 'ip', title: 'Predictive-maintenance model (trade secret)', summary: 'In-house failure-prediction models.', owner: 'data-engineer', status: 'owned', tags: ['trade-secret', 'ai'] },
  { category: 'ip', title: 'NorthPeak trademark (US)', summary: 'US trademark application filed.', owner: 'cfo', status: 'pending', dueDate: '2027-08-01', tags: ['trademark'] },
  { category: 'ip', title: 'Cell design library (copyright)', summary: 'Reusable CAD and design library; owned.', owner: 'head-of-product', status: 'owned', tags: ['design'] },
  { category: 'ip', title: 'OPC-UA integration toolkit (owned IP)', summary: 'Internal connectivity toolkit; contributor IP assigned.', owner: 'head-of-engineering', status: 'owned', tags: ['software'] },
  { category: 'ip', title: 'Simulation software licenses', summary: 'Per-seat simulation licenses; renew annually.', owner: 'controller', status: 'active', dueDate: '2026-10-31', tags: ['license'] },
];

// ── Generated wave (tops every category up past 100) ────────
const DOMAIN_OWNER: Record<Domain, { role: string; name: string }> = {
  hiring: { role: 'head-of-people', name: 'Delphine Astovar' },
  sales: { role: 'head-of-sales', name: 'Rovan Brashford' },
  product: { role: 'head-of-product', name: 'Tobias Norrindale' },
  finance: { role: 'cfo', name: 'Eleni Castermount' },
  ops: { role: 'head-of-ops', name: 'Priya Vandermoor' },
};
const GEN_CONTEXT: Record<Domain, string> = {
  hiring: 'Part of building a durable, scalable team.',
  sales: 'Part of tightening go-to-market and protecting margin.',
  product: 'Part of standardizing and hardening the product platform.',
  finance: 'Part of strengthening financial discipline and reporting.',
  ops: 'Part of improving delivery quality and reliability.',
};
const GEN_DEC: Record<Domain, string[]> = {
  hiring: ['Define competency rubrics for every role', 'Run anonymized CV screening for first-round', 'Offer relocation support for senior hires', 'Set a 30-day ramp plan for every new hire', 'Adopt pair-interviewing for engineering roles', 'Publish internal salary bands', 'Introduce a sabbatical policy after five years', 'Hire an apprentice controls technician each year', 'Require a take-home exercise for product managers', 'Set diversity targets for the hiring funnel', 'Create a mentorship program for juniors', 'Adopt skills-based assessments over pedigree', 'Pilot a four-day workweek for operations', 'Establish an internal mobility policy', 'Run exit interviews and publish themes', 'Cap interview loops at four conversations'],
  sales: ['Adopt a mutual action plan for every deal', 'Qualify enterprise deals with MEDDICC', 'Set a 30% win-rate floor before discounting', 'Introduce annual maintenance contracts', 'Build a partner program for integrators', 'Standardize a demo environment for prospects', 'Require security questionnaires up front', 'Offer pilot installations for new logos', 'Set regional quotas for DACH and Nordics', 'Adopt usage-based pricing for monitoring', 'Create a win/loss review ritual', 'Tier customers into A/B/C service levels', 'Launch a customer referral incentive', 'Publish transparent list pricing online', 'Add an expansion playbook for accounts', 'Limit custom scope to 10% of any build'],
  product: ['Adopt a quarterly roadmap review', 'Standardize on one safety-PLC vendor', 'Add multilingual HMI support', 'Ship a self-service diagnostics dashboard', 'Introduce a hardware abstraction layer', 'Adopt semantic versioning for firmware', 'Build an offline simulation sandbox', 'Standardize cabling and panel layouts', 'Add energy monitoring to every cell', 'Create a reference architecture for F&B lines', 'Adopt automated regression tests for logic', 'Ship a mobile app for line operators', 'Introduce a parts-obsolescence review', 'Standardize on stainless for washdown zones', 'Add role-based access control to the HMI', 'Build a digital-twin library per cell type'],
  finance: ['Adopt activity-based costing for builds', 'Set a 15% EBITDA target', 'Introduce a project-margin dashboard', 'Require a business case for every capex', 'Adopt three-statement modeling', 'Set an inventory-turns target of six', 'Introduce milestone revenue recognition', 'Establish a bad-debt reserve policy', 'Adopt zero-based budgeting for overhead', 'Set a customer-acquisition-cost ceiling', 'Introduce quarterly board financial packs', 'Adopt a 13-week cash-flow forecast', 'Set a debtor-days alert at 60 days', 'Capitalize eligible R&D', 'Introduce expense-approval tiers', 'Adopt IFRS 15 for service contracts'],
  ops: ['Adopt 5S across the assembly floor', 'Introduce daily standups per build cell', 'Set an on-time-delivery target of 95%', 'Adopt kanban for spare-parts inventory', 'Introduce root-cause analysis for defects', 'Standardize commissioning checklists', 'Adopt a preventive-maintenance schedule', 'Set a safety-incident target of zero', 'Introduce a change-management process', 'Adopt barcode tracking for components', 'Run monthly business-continuity drills', 'Standardize shipping and crating', 'Introduce a vendor onboarding checklist', 'Set a first-pass-yield target of 90%', 'Adopt ISO 9001 quality processes', 'Introduce a lessons-learned database'],
};
// Scope qualifiers — combined with each base action to mint many unique,
// still-plausible decision titles (action × qualifier × domain).
const DEC_QUALIFIERS = [
  'for the Nordics region', 'in the F&B segment', 'across all build cells', 'for new builds',
  'for service contracts', 'in the Munich plant', 'for key accounts', 'on the packaging line',
  'for FY2025', 'company-wide', 'for the bakery segment', 'on critical components',
  'for the DACH market', 'in the pilot phase', 'for the Stuttgart site', 'for FY2026',
  'on the assembly floor', 'for enterprise deals', 'for the Iberia region', 'as a standard',
];
function genDecisions(count: number): DecisionInput[] {
  const out: DecisionInput[] = [];
  let i = 0;
  for (const qualifier of DEC_QUALIFIERS) {
    for (const domain of DOMAINS) {
      const o = DOMAIN_OWNER[domain];
      for (const base of GEN_DEC[domain]) {
        if (out.length >= count) return out;
        const title = `${base} ${qualifier}`;
        const y = 2018 + (i % 8);
        const m = String((i % 12) + 1).padStart(2, '0');
        const d = String((i % 27) + 1).padStart(2, '0');
        out.push({ domain, date: `${y}-${m}-${d}`, title, decision: `${title}.`, context: GEN_CONTEXT[domain], owner: { role: o.role, name: o.name } });
        i++;
      }
    }
  }
  return out;
}

const GEN_KN_TOPICS: string[] = ['Overall equipment effectiveness (OEE)', 'Takt time fundamentals', 'SMED quick changeovers', 'Statistical process control', 'Theory of constraints', 'Kaizen events', 'Andon systems', 'Poka-yoke error proofing', 'Value-stream mapping', 'Total productive maintenance', 'Just-in-time inventory', 'Heijunka leveling', 'Gemba walks', 'A3 problem solving', 'Servo motion tuning', 'PID control basics', 'Machine vision inspection', 'Robotics path planning', 'PLC programming standards', 'HMI design patterns', 'Edge computing for OT', 'Time-series databases', 'MQTT for telemetry', 'Unit economics for hardware', 'Gross-margin bridges', 'Cohort revenue analysis', 'Cash-conversion cycle', 'Scenario planning', 'Bottoms-up forecasting', 'Channel partnerships', 'Account-based marketing', 'Discovery question frameworks', 'Negotiation tactics', 'Customer success playbooks', 'Churn early-warning signals', 'Pricing power', 'Competitive moats', 'Org design for scale-ups', 'Performance management', 'Compensation design', 'Remote onboarding', 'Knowledge management', 'Decision journals', 'Pre-mortems', 'Second-order thinking', 'Risk-adjusted returns', 'Vendor risk management', 'Business continuity planning', 'Incident postmortems', 'Data-room preparation', 'Quality of earnings', 'Working-capital adjustments', 'Earn-out structures', 'Integration playbooks', 'Founder transitions', 'Retention bonuses', 'IP assignment hygiene', 'GDPR for industrial data', 'Cyber-physical security', 'Local-first architecture'];
// Framing lenses — each topic × lens is a distinct, retrievable knowledge note.
const KN_LENSES = [
  'a primer', 'the fundamentals', 'for operators', 'a checklist', 'common pitfalls',
  'a case study', 'best practices', 'metrics that matter', 'a 5-minute overview',
  'lessons learned', 'a decision framework', 'what buyers look for', 'for new joiners',
  'a deep dive', 'key trade-offs', 'a field guide', 'an implementation guide',
];
function genKnowledge(count: number): KnowledgeInput[] {
  const types: KnowledgeInput['type'][] = ['article', 'note', 'post', 'video'];
  const tagPool = ['ops', 'finance', 'sales', 'product', 'people', 'ai', 'm-and-a'];
  const out: KnowledgeInput[] = [];
  let i = 0;
  for (const lens of KN_LENSES) {
    for (const topic of GEN_KN_TOPICS) {
      if (out.length >= count) return out;
      out.push({
        title: `${topic} — ${lens}`,
        source: 'manual',
        type: types[i % types.length]!,
        summary: `${lens[0]!.toUpperCase()}${lens.slice(1)} on ${topic.toLowerCase()} for the NorthPeak team.`,
        tags: [tagPool[i % tagPool.length]!],
      });
      i++;
    }
  }
  return out;
}

const GEN_ROLES = ['controls-engineer', 'mechanical-engineer', 'project-manager', 'service-technician', 'account-executive', 'software-engineer', 'quality-engineer', 'data-engineer', 'procurement-manager', 'sales-engineer', 'people-ops', 'fp&a-analyst'];
const GEN_CITIES = ['Stuttgart, DE', 'Berlin, DE', 'Munich, DE', 'Milan, IT', 'Barcelona, ES', 'Amsterdam, NL', 'Stockholm, SE', 'Paris, FR', 'Vienna, AT', 'Copenhagen, DK'];
const GEN_SKILLS = ['plc', 'cad', 'project-management', 'commissioning', 'sales', 'typescript', 'quality', 'python', 'procurement', 'pre-sales', 'people-ops', 'fp&a'];

// Fictional name pools — invented, non-real first/last names so the generated
// demo "team" can't be mistaken for, or implicate, any real person. Unique
// first×last combinations give well over a thousand distinct names. The real
// FAMOUS_NAMES roster is only used as a dev-only opt-in (ADAMAS_DEMO_FAMOUS=1).
const FICTIONAL_FIRST = [
  'Maren', 'Tovan', 'Lirael', 'Quillon', 'Saphine', 'Drevan', 'Yelina', 'Korrin',
  'Brannoch', 'Velda', 'Therin', 'Oswen', 'Calyra', 'Fenwick', 'Marwen', 'Ilvana',
  'Daskel', 'Norabeth', 'Pellan', 'Surek', 'Tamsel', 'Veylin', 'Orrin', 'Halvard',
  'Mireska', 'Ondric', 'Sylwen', 'Garvin', 'Lunara', 'Bexley', 'Cassoval', 'Renwick',
  'Tessoria', 'Andrel', 'Velora', 'Joskin', 'Marisedd', 'Doverin', 'Selwyn', 'Cantrel',
];
const FICTIONAL_LAST = [
  'Vandermoor', 'Quillgate', 'Brashford', 'Thessaly', 'Norrindale', 'Calvecchio',
  'Drummerfield', 'Astovar', 'Pellowin', 'Marchetwood', 'Velbrook', 'Harrowgate',
  'Stennfeld', 'Larkmoor', 'Ondrasek', 'Tavelholm', 'Wexbury', 'Cresswold',
  'Garnoff', 'Brindlecourt', 'Salvern', 'Mordancey', 'Tollard', 'Renquist',
  'Yelloway', 'Castermount', 'Avondreth', 'Lindquay',
];

// Exactly one generated person is flagged as the key person (departure = material
// risk). The hand-authored founder also carries keyPerson:true, so the generated
// roster intentionally adds none — keeping a single key person across the dataset.
function genPeople(count: number): PersonInput[] {
  const out: PersonInput[] = [];
  const famous = process.env.ADAMAS_DEMO_FAMOUS === '1';
  if (famous) {
    const max = Math.min(count, FAMOUS_NAMES.length); // one record per unique famous name
    for (let i = 0; i < max; i++) {
      const name = FAMOUS_NAMES[i]!;
      const role = GEN_ROLES[i % GEN_ROLES.length]!;
      out.push({ name, role, kind: 'employee', summary: `${role.replace(/-/g, ' ')} at NorthPeak Robotics.`, skills: [GEN_SKILLS[i % GEN_SKILLS.length]!], location: GEN_CITIES[i % GEN_CITIES.length], startDate: `${2015 + (i % 11)}-01` });
    }
    return out;
  }
  // Default: fictional first×last combinations, each unique.
  const seen = new Set<string>();
  let i = 0;
  for (const last of FICTIONAL_LAST) {
    for (const first of FICTIONAL_FIRST) {
      if (out.length >= count) return out;
      const name = `${first} ${last}`;
      if (seen.has(name)) continue;
      seen.add(name);
      const role = GEN_ROLES[i % GEN_ROLES.length]!;
      out.push({ name, role, kind: 'employee', summary: `${role.replace(/-/g, ' ')} at NorthPeak Robotics.`, skills: [GEN_SKILLS[i % GEN_SKILLS.length]!], location: GEN_CITIES[i % GEN_CITIES.length], startDate: `${2015 + (i % 11)}-01` });
      i++;
    }
  }
  return out;
}

const GEN_COMPANIES = ['Sunrise Cereals', 'Verde Organics', 'Coastal Seafoods', 'Alpenmilch', 'Golden Grain Mills', 'Fresca Beverages', 'Nordfisk', 'Bella Pasta Co', 'Pure Harvest', 'Crisp Valley', 'Lago Dairy', 'Borealis Brewing', 'Sole Mio Foods', 'Frostline Frozen', 'Maple & Oak', 'Terra Snacks', 'Aqua Pura', 'Hansa Bakeries', 'Olivar Foods', 'Vital Juices', 'Stein Confectionery', 'Riviera Canning', 'Polar Foods', 'Estate Wines', 'Garden Fresh', 'Meridian Meats', 'Saffron Spices', 'Brava Coffee', 'Nimbus Waters', 'Heritage Cheese', 'Sol Y Mar', 'Tundra Bakery', 'Lumen Dairy', 'Capri Foods', 'Drift Beverages', 'Edelweiss Foods', 'Marea Seafood', 'Prairie Mills', 'Vesta Foods', 'Lyra Snacks'];
const GEN_RISKS = ['Lead-time volatility on long-lead parts', 'Talent gap in machine vision', 'Energy-price exposure', 'Customer payment delays', 'Obsolescence of legacy components', 'Reliance on a single freight partner', 'Quality drift on a new supplier', 'Knowledge loss on bus-factor roles', 'Scope creep on fixed-price builds', 'Downtime during platform migration', 'Regulatory change in food safety', 'Warranty cost on early installs', 'Data privacy in remote monitoring', 'Currency risk on US sales', 'Capacity crunch in peak season', 'Cyber risk on connected cells'];
const GEN_IP = ['Vision-inspection algorithm (trade secret)', 'Cell-controller firmware (owned)', 'Brand style guide (copyright)', 'Fixturing CAD library (owned)', 'Monitoring dashboard UI (copyright)', 'Safety-architecture template (owned)', 'Commissioning toolkit (owned)', 'Training materials (copyright)', 'API specification (owned)', 'Test-bench designs (owned)', 'Domain portfolio (owned)', 'Robot-calibration method (trade secret)', 'Recipe-management module (owned)', 'Telemetry schema (owned)', 'Installation manuals (copyright)', 'Partner integration kit (owned)'];
const REC_REGIONS = ['DACH', 'Nordics', 'Iberia', 'Benelux', 'Italy', 'France', 'UK & Ireland', 'CEE', 'Alpine', 'Baltics', 'Iberia North', 'Adriatic', 'Rhine', 'Bavaria', 'Catalonia', 'Lombardy', 'Scandinavia', 'Central EU', 'Mediterranean', 'Atlantic'];
const REC_QUALIFIERS = ['build cells', 'service contracts', 'monitoring', 'spare parts', 'commissioning', 'training', 'warranty', 'integration', 'retrofits', 'upgrades', 'pilots', 'expansion'];
// Generate this many customers (company × region × division) with billion-dollar
// contracts so the demo book of business runs into the tens of trillions.
const CUSTOMER_TARGET = 2000;
function genRecords(count: number): RecordInput[] {
  void count;
  const out: RecordInput[] = [];
  // Customers: company × region × division — unique titles, billions each.
  let ci = 0;
  for (let div = 1; ci < CUSTOMER_TARGET; div++) {
    for (const region of REC_REGIONS) {
      for (const company of GEN_COMPANIES) {
        if (ci >= CUSTOMER_TARGET) break;
        const title = div === 1 ? `${company} — ${region}` : `${company} — ${region} (Division ${div})`;
        const year = 2025 + (ci % 5); // spread renewals across 2025–2029
        out.push({ category: 'customer', title, summary: `${ci % 3 === 0 ? 'Service + monitoring account' : 'Build customer'} in the F&B segment (${region}).`, owner: 'head-of-sales', status: ci % 5 === 0 ? 'at-risk' : 'active', amount: 3_000_000_000 + (ci % 25) * 400_000_000, currency: '$', recurring: ci % 2 === 0, dueDate: `${year}-${String((ci % 12) + 1).padStart(2, '0')}-15`, tags: ['f&b'] });
        ci++;
      }
    }
  }
  // Financial KPIs: metric × quarter × year.
  const metrics = ['Gross margin', 'EBITDA margin', 'Recurring revenue', 'NRR', 'Backlog', 'Utilization'];
  let fi = 0;
  for (let y = 2018; y <= 2025; y++) {
    for (const q of ['Q1', 'Q2', 'Q3', 'Q4']) {
      for (const metric of metrics) {
        const period = `${q} ${y}`;
        out.push({ category: 'financial', title: `${metric} — ${period}`, summary: `${metric} for ${period}.`, metric, period, amount: 10 + (fi % 90), status: 'on-track' });
        fi++;
      }
    }
  }
  // Risks: base risk × qualifier.
  GEN_RISKS.forEach((title, i) => REC_QUALIFIERS.forEach((q, j) => {
    out.push({ category: 'risk', title: `${title} (${q})`, summary: `${title} — ${q}.`, owner: 'head-of-ops', severity: (['low', 'medium', 'high'] as const)[(i + j) % 3], mitigation: 'Tracked on the risk register with an owner and review date.', status: 'monitoring' });
  }));
  // IP & assets: base asset × qualifier.
  GEN_IP.forEach((title, i) => REC_QUALIFIERS.forEach((q, j) => {
    out.push({ category: 'ip', title: `${title} — ${q}`, summary: `${title} (${q}).`, owner: 'cfo', status: (i + j) % 2 === 0 ? 'owned' : 'registered', tags: ['ip'] });
  }));
  return out;
}

// Additional real business/industrial terms (distinct from the curated GLOSSARY).
const GLO_REAL: Array<[string, string, string]> = [
  ['MRR', 'Monthly Recurring Revenue — the monthly value of recurring contracts.', 'finance'],
  ['LTV', 'Customer Lifetime Value — the total margin a customer generates over the relationship.', 'sales'],
  ['CAC', 'Customer Acquisition Cost — the sales and marketing cost to win one new customer.', 'sales'],
  ['COGS', 'Cost of Goods Sold — the direct cost of producing what is sold.', 'finance'],
  ['KPI', 'Key Performance Indicator — a measurable value tracking progress to a goal.', 'finance'],
  ['SKU', 'Stock Keeping Unit — a unique identifier for a stockable product or part.', 'ops'],
  ['RFQ', 'Request for Quote — a customer’s request for pricing on a defined scope.', 'sales'],
  ['RFP', 'Request for Proposal — a formal solicitation for a solution and bid.', 'sales'],
  ['BOM', 'Bill of Materials — the full parts list required to build a cell.', 'ops'],
  ['MTBF', 'Mean Time Between Failures — average uptime between equipment failures.', 'ops'],
  ['MTTR', 'Mean Time To Repair — average time to restore a failed machine.', 'ops'],
  ['FMEA', 'Failure Mode and Effects Analysis — a structured method to anticipate failures.', 'ops'],
  ['SPC', 'Statistical Process Control — using statistics to keep a process in control.', 'ops'],
  ['SMED', 'Single-Minute Exchange of Die — techniques to slash changeover time.', 'ops'],
  ['5S', 'A workplace organization method: Sort, Set, Shine, Standardize, Sustain.', 'ops'],
  ['Kanban', 'A pull-based system that limits work in progress with visual signals.', 'ops'],
  ['Kaizen', 'Continuous, incremental improvement driven by the people doing the work.', 'ops'],
  ['Poka-yoke', 'Error-proofing a process so mistakes cannot happen or are caught instantly.', 'ops'],
  ['ERP', 'Enterprise Resource Planning — software unifying finance, inventory and operations.', 'ops'],
  ['MES', 'Manufacturing Execution System — software that tracks production on the floor.', 'product'],
  ['SCADA', 'Supervisory Control and Data Acquisition — system for monitoring industrial processes.', 'product'],
  ['IIoT', 'Industrial Internet of Things — connected sensors and machines on the plant floor.', 'product'],
  ['API', 'Application Programming Interface — a defined way for software to talk to software.', 'product'],
  ['SaaS', 'Software as a Service — software delivered and billed as an ongoing subscription.', 'finance'],
  ['NDA', 'Non-Disclosure Agreement — a contract protecting confidential information.', 'm-and-a'],
  ['GDPR', 'EU General Data Protection Regulation governing personal-data handling.', 'ops'],
  ['SOC 2', 'A security/compliance audit standard for service organizations.', 'ops'],
  ['ISO 9001', 'The international standard for quality-management systems.', 'ops'],
  ['EBIT', 'Earnings Before Interest and Taxes — operating profit.', 'finance'],
  ['Gross profit', 'Revenue minus cost of goods sold, in absolute terms.', 'finance'],
  ['Working capital', 'Current assets minus current liabilities — cash for day-to-day operations.', 'finance'],
  ['Cash conversion cycle', 'Days to turn inventory and receivables back into cash.', 'finance'],
  ['DPO', 'Days Payable Outstanding — average days taken to pay suppliers.', 'finance'],
  ['Inventory turns', 'How many times inventory is sold and replaced in a period.', 'ops'],
  ['CAGR', 'Compound Annual Growth Rate — the smoothed annual growth over several years.', 'finance'],
  ['TAM', 'Total Addressable Market — total demand for a product or service.', 'sales'],
  ['SAM', 'Serviceable Addressable Market — the part of the TAM you can reach.', 'sales'],
  ['SOM', 'Serviceable Obtainable Market — the share you can realistically win.', 'sales'],
  ['ARPU', 'Average Revenue Per User/account — revenue divided by accounts.', 'finance'],
  ['Payback period', 'Time for a customer’s margin to repay the cost of acquiring them.', 'finance'],
  ['Burn rate', 'The rate at which a company spends its cash reserves.', 'finance'],
  ['Quota', 'A salesperson’s revenue target for a period.', 'sales'],
  ['Win rate', 'The share of qualified opportunities that close won.', 'sales'],
  ['Sales cycle', 'The average time from first contact to a closed deal.', 'sales'],
  ['QBR', 'Quarterly Business Review — a recurring account review with a customer.', 'sales'],
  ['Upsell', 'Selling a higher tier or more of a product to an existing customer.', 'sales'],
  ['Cross-sell', 'Selling an additional, complementary product to an existing customer.', 'sales'],
  ['Cohort analysis', 'Tracking groups of customers over time to see behavior and retention.', 'finance'],
  ['Unit economics', 'The direct revenues and costs of a single unit (a customer or a cell).', 'finance'],
  ['Due diligence', 'A buyer’s investigation of a business before a transaction.', 'm-and-a'],
  ['LOI', 'Letter of Intent — a non-binding outline of proposed deal terms.', 'm-and-a'],
  ['Term sheet', 'A summary of the key terms of an investment or acquisition.', 'm-and-a'],
  ['Escrow', 'Funds held by a third party to secure post-closing obligations.', 'm-and-a'],
  ['Cap table', 'A record of who owns what equity, options and convertibles in a company.', 'm-and-a'],
  ['ESOP', 'Employee Stock Option Plan — equity set aside to incentivize staff.', 'people'],
  ['Vesting', 'The schedule over which granted equity is actually earned.', 'people'],
  ['Cliff', 'An initial period before any granted equity begins to vest.', 'people'],
  ['NPS', 'Net Promoter Score — a measure of customer willingness to recommend.', 'sales'],
  ['CSAT', 'Customer Satisfaction score — a survey measure of satisfaction.', 'sales'],
  ['RCA', 'Root-Cause Analysis — finding the underlying cause of a problem.', 'ops'],
  ['PoC', 'Proof of Concept — a small build to validate feasibility before committing.', 'product'],
  ['MVP', 'Minimum Viable Product — the smallest version that delivers and tests value.', 'product'],
  ['Runbook', 'A documented procedure for carrying out a specific operational task.', 'ops'],
  ['Changeover', 'Switching a line from producing one product to another.', 'ops'],
  ['Yield', 'The proportion of output that meets quality requirements.', 'ops'],
  ['Throughput', 'The rate at which a system produces finished output.', 'ops'],
  ['Backflush', 'Deducting component stock automatically when a build is completed.', 'ops'],
  ['Hedging', 'Using financial instruments to offset a price or currency risk.', 'finance'],
  ['Accrual', 'Recognizing revenue or expense when earned/incurred, not when paid.', 'finance'],
  ['Amortization', 'Spreading the cost of an intangible asset over its useful life.', 'finance'],
  ['Depreciation', 'Spreading the cost of a physical asset over its useful life.', 'finance'],
];
const GLO_AREAS: Array<[string, string]> = [
  ['Commissioning', 'ops'], ['Maintenance', 'ops'], ['Quality', 'ops'], ['Safety', 'ops'],
  ['Supplier', 'ops'], ['Logistics', 'ops'], ['Inventory', 'ops'], ['Warranty', 'ops'],
  ['Telemetry', 'product'], ['Change', 'ops'], ['Escalation', 'ops'], ['Billing', 'finance'],
  ['Forecasting', 'finance'], ['Pricing', 'finance'], ['Hiring', 'people'], ['Onboarding', 'people'],
  ['Sales', 'sales'], ['Procurement', 'ops'], ['Security', 'ops'], ['Compliance', 'ops'],
];
const GLO_ARTIFACTS = ['Playbook', 'Protocol', 'Standard', 'Checklist', 'Gate', 'Review', 'Cadence', 'Scorecard', 'Runbook', 'SOP', 'Policy', 'Framework', 'Charter', 'Matrix', 'Register', 'Guideline', 'Workflow', 'Template'];
function genGlossary(count: number): GlossaryInput[] {
  const out: GlossaryInput[] = GLO_REAL.map(([term, definition, tag]) => ({ term, definition, tags: [tag] }));
  // Company-specific internal terms (legitimate "single source of company knowledge").
  for (const artifact of GLO_ARTIFACTS) {
    for (const [area, tag] of GLO_AREAS) {
      if (out.length >= count) return out;
      out.push({
        term: `${area} ${artifact}`,
        definition: `NorthPeak’s internal ${artifact.toLowerCase()} governing ${area.toLowerCase()} — part of the company handbook.`,
        tags: [tag, 'handbook'],
      });
    }
  }
  return out;
}

const ALL_DECISIONS = [...DECISIONS, ...EXTRA_DECISIONS, ...genDecisions(1195)];
const ALL_KNOWLEDGE = [...KNOWLEDGE, ...EXTRA_KNOWLEDGE, ...genKnowledge(995)];
const ALL_PEOPLE = [...PEOPLE, ...EXTRA_PEOPLE, ...genPeople(1100)];
const ALL_RECORDS = [...RECORDS, ...EXTRA_RECORDS, ...genRecords(1320)];
const ALL_GLOSSARY = [...GLOSSARY, ...genGlossary(432)];

export interface DemoSeedResult {
  decisions: number;
  knowledge: number;
  people: number;
  records: number;
  glossary: number;
  /** True when nothing new was added (everything already present). */
  noop?: boolean;
}

/**
 * Populate every store with the demo company. Entry-level idempotent: an entry
 * is skipped if one with the same title/name already exists, so calling it again
 * (e.g. after the dataset grows) adds only what's new — never duplicates.
 */
export async function seedDemo(root: string, deps: DemoSeedDeps): Promise<DemoSeedResult> {
  void root; // kept for signature stability; no marker file needed anymore.
  const decTitles = new Set(deps.ledger.list().map((d) => d.title));
  const knTitles = new Set(deps.knowledge.list().map((e) => e.title));
  const peopleNames = new Set(deps.people.list().map((p) => p.name.trim().toLowerCase()));
  const recKeys = new Set(deps.records.list().map((r) => `${r.category}:${r.title}`));

  let decisions = 0;
  for (const d of ALL_DECISIONS) {
    if (decTitles.has(d.title)) continue;
    await deps.ledger.create(d);
    decTitles.add(d.title);
    decisions++;
  }

  // Bi-directional links so the graph is rich (idempotent: update overwrites).
  const idByTitle = Object.fromEntries(deps.ledger.list().map((d) => [d.title, d.id]));
  const link = async (a: string, b: string) => {
    const ida = idByTitle[a];
    const idb = idByTitle[b];
    if (ida && idb) await deps.ledger.update(ida, { links: [idb] });
  };
  await link('Decline the automotive OEM frame contract', 'Hold a 20% gross-margin floor and walk from sub-floor deals');
  await link('Quote value-based cell packages, not hourly engineering', 'Require a paid discovery phase before any build quote');
  await link('Ship a remote-monitoring add-on for every cell', 'Standardize the controls platform on Beckhoff TwinCAT');
  await link('Cap concurrent build projects at three', 'Focus the ICP on mid-market food & beverage packaging lines');
  await link('Offer a predictive-maintenance tier on monitoring', 'Ship a remote-monitoring add-on for every cell');

  let knowledge = 0;
  for (const k of ALL_KNOWLEDGE) {
    if (knTitles.has(k.title)) continue;
    await deps.knowledge.create(k);
    knTitles.add(k.title);
    knowledge++;
  }

  let people = 0;
  for (const p of ALL_PEOPLE) {
    if (peopleNames.has(p.name.trim().toLowerCase())) continue;
    await deps.people.create(p);
    peopleNames.add(p.name.trim().toLowerCase());
    people++;
  }

  let records = 0;
  for (const r of ALL_RECORDS) {
    const key = `${r.category}:${r.title}`;
    if (recKeys.has(key)) continue;
    await deps.records.create(r);
    recKeys.add(key);
    records++;
  }

  const gloTerms = new Set(deps.glossary.list().map((g) => g.term.toLowerCase()));
  let glossary = 0;
  for (const g of ALL_GLOSSARY) {
    if (gloTerms.has(g.term.toLowerCase())) continue;
    await deps.glossary.create(g);
    gloTerms.add(g.term.toLowerCase());
    glossary++;
  }

  const total = decisions + knowledge + people + records + glossary;
  return { decisions, knowledge, people, records, glossary, ...(total === 0 ? { noop: true } : {}) };
}
