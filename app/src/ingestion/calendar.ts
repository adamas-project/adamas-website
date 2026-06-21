import type { SourceDocument } from '../evaluation/provider.js';
import type { Connector, ConnectorInfo, Cursor, PullResult } from './connector.js';

// Read-only Google Calendar connector via the calendar's private "Secret address
// in iCal format" (an .ics URL). No OAuth, no push — it only fetches the feed and
// turns meetings into source documents. Incremental by event UID + revision.

interface RawEvent {
  uid: string;
  summary: string;
  description: string;
  location: string;
  attendees: string[];
  date: string;
  ms: number;
  sig: string;
}

function unfold(ics: string): string[] {
  const raw = ics.replace(/\r\n/g, '\n').split('\n');
  const out: string[] = [];
  for (const line of raw) {
    if ((line.startsWith(' ') || line.startsWith('\t')) && out.length) out[out.length - 1] += line.slice(1);
    else out.push(line);
  }
  return out;
}

function unescapeText(v: string): string {
  return v.replace(/\\n/gi, '\n').replace(/\\,/g, ',').replace(/\\;/g, ';').replace(/\\\\/g, '\\');
}

function icsDate(v: string): { date: string; ms: number } {
  const m = /(\d{4})(\d{2})(\d{2})/.exec(v);
  if (!m) return { date: new Date().toISOString().slice(0, 10), ms: Date.now() };
  const date = `${m[1]}-${m[2]}-${m[3]}`;
  const t = /T(\d{2})(\d{2})(\d{2})/.exec(v);
  const iso = t ? `${date}T${t[1]}:${t[2]}:${t[3]}${v.trim().endsWith('Z') ? 'Z' : ''}` : `${date}T00:00:00`;
  return { date, ms: Date.parse(iso) || Date.now() };
}

export function parseIcsEvents(ics: string): RawEvent[] {
  const lines = unfold(ics);
  const events: RawEvent[] = [];
  let cur: Record<string, string[]> | null = null;
  for (const line of lines) {
    if (line === 'BEGIN:VEVENT') {
      cur = {};
      continue;
    }
    if (line === 'END:VEVENT') {
      if (cur) {
        const get = (k: string) => cur![k]?.[0] ?? '';
        const start = get('DTSTART');
        const { date, ms } = icsDate(start);
        const summary = unescapeText(get('SUMMARY')) || '(untitled meeting)';
        const uid = get('UID') || `${date}-${summary}`;
        const attendees = (cur['ATTENDEE'] ?? []).map((a) => a.replace(/^mailto:/i, '').trim()).filter(Boolean);
        events.push({
          uid,
          summary,
          description: unescapeText(get('DESCRIPTION')),
          location: unescapeText(get('LOCATION')),
          attendees,
          date,
          ms,
          sig: `${get('LAST-MODIFIED') || get('DTSTAMP') || ''}:${get('SEQUENCE') || ''}`,
        });
      }
      cur = null;
      continue;
    }
    if (!cur) continue;
    const idx = line.indexOf(':');
    if (idx < 0) continue;
    const key = line.slice(0, idx).split(';')[0]!.toUpperCase();
    (cur[key] ??= []).push(line.slice(idx + 1));
  }
  return events;
}

function toDocument(ev: RawEvent): SourceDocument {
  const text = [
    `Meeting: ${ev.summary}`,
    `When: ${ev.date}`,
    ev.attendees.length ? `Attendees: ${ev.attendees.join(', ')}` : '',
    ev.location ? `Location: ${ev.location}` : '',
    ev.description ? `\n${ev.description}` : '',
  ]
    .filter(Boolean)
    .join('\n');
  return {
    ref: `calendar:${ev.date}#${ev.uid.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 32)}`,
    kind: 'meeting',
    date: ev.date,
    title: ev.summary.slice(0, 120),
    text,
  };
}

export class CalendarConnector implements Connector {
  readonly info: ConnectorInfo;

  constructor(
    private readonly url: string,
    name: string,
    private readonly windowDays = 30,
  ) {
    this.info = {
      id: 'calendar',
      label: `Calendar (${name})`,
      kind: 'http',
      readOnly: true,
      network: true,
      location: 'iCal feed (read-only)',
      configured: true,
    };
  }

  async pull(cursor: Cursor): Promise<{ result: PullResult; cursor: Cursor }> {
    const res = await fetch(this.url);
    if (!res.ok) throw new Error(`Calendar feed responded ${res.status}`);
    const ics = await res.text();
    const events = parseIcsEvents(ics);

    const now = Date.now();
    const lo = now - this.windowDays * 24 * 60 * 60 * 1000;
    const hi = now + this.windowDays * 24 * 60 * 60 * 1000;

    const next: Cursor = { ...cursor };
    const documents: SourceDocument[] = [];
    let scanned = 0;
    let skipped = 0;
    for (const ev of events) {
      if (ev.ms < lo || ev.ms > hi) continue; // recent + upcoming window
      scanned++;
      if (cursor[ev.uid] === ev.sig) {
        skipped++;
        continue;
      }
      documents.push(toDocument(ev));
      next[ev.uid] = ev.sig;
    }
    return { result: { documents, scanned, skipped }, cursor: next };
  }
}
