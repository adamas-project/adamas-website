import { ImapFlow } from 'imapflow';
import { simpleParser, type ParsedMail } from 'mailparser';
import type { ImapConfig } from '../config/env.js';
import type { SourceDocument } from '../evaluation/provider.js';
import type { Connector, ConnectorInfo, Cursor, PullResult } from './connector.js';

// Flagship read-only email connector. Opens the mailbox READ-ONLY, never sets
// \Seen or any flag, and only pulls messages inbound onto the machine — no vault
// content is ever sent out. Incremental by UID (with UIDVALIDITY guard) so each
// pull only fetches new mail; works with a Gmail app password (no cloud OAuth).

/** Map a parsed message to a SourceDocument. Pure + unit-tested. */
export function mailToSourceDocument(parsed: ParsedMail, uid: number, mailbox: string): SourceDocument {
  const subject = (parsed.subject ?? '').trim() || '(no subject)';
  const date = (parsed.date ?? new Date()).toISOString().slice(0, 10);
  const fromText = parsed.from?.text ? `From: ${parsed.from.text}\n` : '';
  const body = (parsed.text ?? '').trim() || (parsed.html ? String(parsed.html).replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim() : '');
  return {
    ref: `email:${date}#${mailbox}/${uid}`,
    kind: 'email',
    date,
    title: subject.slice(0, 120),
    text: `${fromText}${body}`.trim() || subject,
  };
}

const uidValKey = (mailbox: string) => `${mailbox}:uidvalidity`;
const lastUidKey = (mailbox: string) => `${mailbox}:lastuid`;

export class ImapConnector implements Connector {
  readonly info: ConnectorInfo;

  constructor(private readonly cfg: ImapConfig) {
    this.info = {
      id: 'imap',
      label: `Email (IMAP · ${cfg.user})`,
      kind: 'imap',
      readOnly: true,
      network: true,
      location: `${cfg.host}:${cfg.port} · ${cfg.mailbox}`,
      configured: true,
    };
  }

  async pull(cursor: Cursor): Promise<{ result: PullResult; cursor: Cursor }> {
    const { host, port, user, pass, tls, mailbox, max } = this.cfg;
    const client = new ImapFlow({ host, port, secure: tls, auth: { user, pass }, logger: false });
    await client.connect();
    try {
      // readOnly lock guarantees no flags (incl. \Seen) are ever changed.
      const lock = await client.getMailboxLock(mailbox, { readOnly: true });
      try {
        const mb = client.mailbox;
        const uidValidity = mb && typeof mb !== 'boolean' ? String(mb.uidValidity) : '0';
        let lastUid = Number(cursor[lastUidKey(mailbox)] ?? 0);
        if (cursor[uidValKey(mailbox)] !== uidValidity) lastUid = 0; // mailbox reset

        // Choose UIDs: new ones since last pull, else recent (last 30 days).
        let uids: number[];
        if (lastUid > 0) {
          uids = (await client.search({ uid: `${lastUid + 1}:*` }, { uid: true })) || [];
        } else {
          const since = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
          uids = (await client.search({ since }, { uid: true })) || [];
        }
        uids = uids.filter((u) => u > lastUid).sort((a, b) => a - b);
        const scanned = uids.length;
        const take = uids.slice(-max); // most recent `max`

        const documents: SourceDocument[] = [];
        let maxUid = lastUid;
        if (take.length > 0) {
          for await (const msg of client.fetch(take.join(','), { source: true }, { uid: true })) {
            if (!msg.source) continue;
            const parsed = await simpleParser(msg.source);
            documents.push(mailToSourceDocument(parsed, msg.uid, mailbox));
            if (msg.uid > maxUid) maxUid = msg.uid;
          }
        }

        const nextCursor: Cursor = {
          ...cursor,
          [uidValKey(mailbox)]: uidValidity,
          [lastUidKey(mailbox)]: String(maxUid),
        };
        return { result: { documents, scanned, skipped: scanned - documents.length }, cursor: nextCursor };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }
}
