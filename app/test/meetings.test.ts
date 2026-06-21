import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import type { FastifyInstance } from 'fastify';
import { parseIcsEvents, CalendarConnector } from '../src/ingestion/calendar.js';
import { heuristicSummarize } from '../src/evaluation/extract.js';
import { createContext } from '../src/server/context.js';
import { buildApp } from '../src/server/app.js';
import { tempVault } from './helpers.js';

const SAMPLE_ICS = [
  'BEGIN:VCALENDAR',
  'BEGIN:VEVENT',
  'UID:abc-123@google.com',
  'SUMMARY:Q3 pricing review',
  'DTSTART:20260618T100000Z',
  'DESCRIPTION:Agenda: pricing.\\nWe decided to raise the floor.',
  'ATTENDEE;CN=Alex:mailto:alex@example.com',
  'LAST-MODIFIED:20260618T090000Z',
  'END:VEVENT',
  'END:VCALENDAR',
].join('\r\n');

describe('calendar ICS parsing', () => {
  it('parses VEVENTs into structured events', () => {
    const events = parseIcsEvents(SAMPLE_ICS);
    expect(events).toHaveLength(1);
    const ev = events[0]!;
    expect(ev.summary).toBe('Q3 pricing review');
    expect(ev.date).toBe('2026-06-18');
    expect(ev.attendees).toContain('alex@example.com');
    expect(ev.description).toMatch(/raise the floor/);
    expect(ev.description).toContain('\n'); // \\n unescaped
  });

  it('connector advertises read-only network metadata', () => {
    const c = new CalendarConnector('https://calendar.example/ical/secret.ics', 'Work');
    expect(c.info.id).toBe('calendar');
    expect(c.info.readOnly).toBe(true);
    expect(c.info.network).toBe(true);
    expect(c.info.label).toContain('Work');
  });
});

describe('heuristic summarize', () => {
  it('condenses long text, keeping decision/trade-off lines', () => {
    const long =
      'Welcome everyone. ' +
      'We chatted about the weather for a while. '.repeat(8) +
      'We decided to cap concurrent builds at three. ' +
      'Lots of small talk here. '.repeat(8) +
      'The trade-off is we sometimes make clients wait.';
    const summary = heuristicSummarize(long);
    expect(summary.length).toBeLessThan(long.length);
    expect(summary).toMatch(/cap concurrent builds at three/);
    expect(summary).toMatch(/trade-off/);
  });

  it('returns short text unchanged', () => {
    expect(heuristicSummarize('We decided to ship weekly.')).toBe('We decided to ship weekly.');
  });
});

describe('transcript endpoint (summarize then extract)', () => {
  let app: FastifyInstance;
  let cleanup: () => void;

  beforeAll(async () => {
    const v = tempVault();
    cleanup = v.cleanup;
    const ctx = await createContext(v.root);
    app = buildApp(ctx);
    await app.ready();
  });
  afterAll(async () => {
    await app.close();
    cleanup();
  });

  it('summarizes a long transcript and surfaces candidates without touching the ledger', async () => {
    const transcript =
      'Project sync transcript. ' +
      'Team chatted about logistics and schedules for a bit. '.repeat(10) +
      'We decided to dual-source the servo drives. Owner: head of ops. ' +
      'More back-and-forth about timelines. '.repeat(10) +
      'The trade-off is carrying extra buffer stock.';

    const res = await app.inject({
      method: 'POST',
      url: '/api/inbox/transcript',
      payload: { text: transcript, title: 'Project sync', date: '2026-06-18' },
    });
    expect(res.statusCode).toBe(200);
    const body = res.json();
    expect(body.summarized).toBe(true);
    expect(body.summary.length).toBeLessThan(transcript.length);
    expect(body.added).toBeGreaterThan(0);

    const meta = (await app.inject({ method: 'GET', url: '/api/meta' })).json();
    expect(meta.count).toBe(0); // nothing entered the ledger unreviewed

    const inbox = (await app.inject({ method: 'GET', url: '/api/inbox' })).json();
    expect(inbox.candidates.length).toBeGreaterThan(0);
  });

  it('rejects an empty transcript', async () => {
    const res = await app.inject({ method: 'POST', url: '/api/inbox/transcript', payload: { text: '   ' } });
    expect(res.statusCode).toBe(400);
  });
});
