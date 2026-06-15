import type { SourceDocument } from './provider.js';

// Sample source material a read-only connector would pull onto the local machine.
// Hermes extracts candidate decisions from these; nothing enters the ledger
// until a reviewer confirms it in the Capture Inbox.
export const SAMPLE_SOURCES: SourceDocument[] = [
  {
    ref: 'meeting:2025-06-02#weekly-review',
    kind: 'meeting',
    date: '2025-06-02',
    title: 'Weekly review — second shift question',
    domainHint: 'ops',
    text:
      'Throughput on the constrained line is capping delivery dates. ' +
      'We discussed adding a second shift versus extending lead times. ' +
      'Owner: head-of-ops. ' +
      'We decided to pilot a partial second shift on the constrained line for eight weeks before committing. ' +
      'However, this raises overtime cost and supervision load in the short term. ' +
      'Dissent: cfo, who wants to see margin impact first.',
  },
  {
    ref: 'email:2025-06-05#reseller-inbound',
    kind: 'email',
    date: '2025-06-05',
    title: 'Inbound from a packaging reseller',
    domainHint: 'sales',
    text:
      'A regional reseller proposed selling our cells through their channel for a 20% margin share. ' +
      'It would broaden reach but dilute our margin and put a layer between us and the client. ' +
      'Owner: head-of-sales. ' +
      'We decided to decline the reseller channel for now and revisit once the discovery process is standardized. ' +
      'The trade-off is slower top-of-funnel growth.',
  },
  {
    ref: 'doc:2025-06-08#stack-note',
    kind: 'doc',
    date: '2025-06-08',
    title: 'Engineering note — vision library',
    domainHint: 'product',
    text:
      'Our machine-vision inspection has been bespoke per project. ' +
      'Owner: head-of-engineering. ' +
      'We will standardize on a single vision library across cells to make inspection reusable. ' +
      'The downside is migrating two legacy cells off their current vision code.',
  },
];
