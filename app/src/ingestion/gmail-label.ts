import { ImapFlow } from 'imapflow';
import { simpleParser } from 'mailparser';
import type { ImapConfig } from '../config/env.js';

// In-app "auto-label decision emails" for Gmail. Opt-in and write-limited: using
// the operator's own app password it ONLY adds a Gmail label to threads that look
// like business decisions — it never deletes, moves, marks read, or sends. This
// is the operator's own data on their own account over a local connection, so it
// does not cross the hard cloud boundary (which governs sending vault data out).

export interface EmailLike {
  subject: string;
  from: string;
  body: string;
}

// Decision cues in English + German (this operator's mail is bilingual).
const DECISION_CUE = new RegExp(
  [
    'we (?:have )?decided', 'decided (?:to|that|on|against)', '\\bdecision\\b', 'go/?no-?go',
    'sign-?off', 'signed off', "we'?ll go with", 'we will go with', 'going (?:to|with)',
    '\\bapprov(?:e|ed|al)\\b', 'agreed to', 'final (?:call|decision)', 'finali[sz]ed',
    // German
    'wir haben (?:uns )?entschieden', 'entschieden', '\\bentscheidung', 'beschlossen',
    '\\bbeschluss', 'freigabe', 'freigegeben', 'genehmig', 'zugestimmt', 'einigung', 'wir gehen mit',
  ].join('|'),
  'i',
);

// Automated / no-reply senders — never a human decision thread.
const AUTOMATED_SENDER =
  /(no-?reply|do-?not-?reply|don-?t-?reply|notifications?@|mailer-daemon|postmaster|bounce|newsletter|marketing@|automated|@.*\.?netlify|notifications@github|@github\.com|@linkedin\.com|noreply)/i;

// Marketing / transactional / bot bodies that merely mention a cue word.
const MARKETING_OR_BOT =
  /(unsubscribe|view (?:this email )?in (?:your )?browser|manage (?:your )?preferences|verify your email|deploy preview|latest commit|your receipt|purchase is confirmed|here'?s your copy)/i;

export function isAutomatedSender(from: string): boolean {
  return AUTOMATED_SENDER.test(from);
}

export function looksMarketingOrBot(text: string): boolean {
  return MARKETING_OR_BOT.test(text);
}

/**
 * Decide whether an email is a genuine business decision worth labeling. Pure +
 * unit-tested. Requires a decision cue, and rejects automated senders and
 * marketing/bot bodies so receipts and deploy bots never get mislabeled.
 */
export function isDecisionEmail(email: EmailLike): boolean {
  const from = email.from ?? '';
  const haystack = `${email.subject ?? ''}\n${email.body ?? ''}`;
  if (isAutomatedSender(from)) return false;
  if (looksMarketingOrBot(haystack)) return false;
  return DECISION_CUE.test(haystack);
}

export interface LabelResult {
  scanned: number;
  labeled: number;
  titles: string[];
}

/** True for Gmail / Google Workspace IMAP hosts. */
export function isGmailHost(host: string): boolean {
  return /(gmail|google)\.com$/i.test(host.trim());
}

export class GmailLabeler {
  constructor(
    private readonly cfg: ImapConfig,
    private readonly labelName = 'ADAMAS/Decisions',
  ) {}

  /** Verify the credentials actually work: connect and read the mailbox size. */
  async testConnection(): Promise<{ ok: true; mailbox: string; messages: number }> {
    const { host, port, user, pass, tls, mailbox } = this.cfg;
    const client = new ImapFlow({ host, port, secure: tls, auth: { user, pass }, logger: false });
    await client.connect();
    try {
      const lock = await client.getMailboxLock(mailbox, { readOnly: true });
      try {
        const mb = client.mailbox;
        const messages = mb && typeof mb !== 'boolean' ? mb.exists : 0;
        return { ok: true, mailbox, messages };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Drop a sample "decision" email into the mailbox (IMAP APPEND) so the operator
   * can verify labeling end-to-end without an external mail client. Self-test
   * only — clearly marked, and labeling it never deletes or sends anything.
   */
  async appendTestEmail(): Promise<{ subject: string }> {
    const { host, port, user, pass, tls, mailbox } = this.cfg;
    const subject = 'Test decision — ADAMAS self-test';
    const date = new Date().toUTCString();
    const raw = [
      `From: ADAMAS Self-Test <${user}>`,
      `To: ${user}`,
      `Subject: ${subject}`,
      `Date: ${date}`,
      'MIME-Version: 1.0',
      'Content-Type: text/plain; charset=utf-8',
      '',
      'This is an ADAMAS self-test message.',
      '',
      'We decided to go with the new supplier for the Nordics region. ' +
        'Owner: head of ops. Trade-off: slightly higher unit cost for a more reliable lead time.',
      '',
      'You can safely delete this email.',
    ].join('\r\n');
    const client = new ImapFlow({ host, port, secure: tls, auth: { user, pass }, logger: false });
    await client.connect();
    try {
      await client.append(mailbox, raw, undefined, new Date());
      return { subject };
    } finally {
      await client.logout().catch(() => {});
    }
  }

  /**
   * Scan recent mail and add the label to threads that look like decisions.
   * Read-mostly: opens the source READ-ONLY (no flags touched) and only COPYs
   * matches into the label — in Gmail a copy into a label folder *is* the label.
   */
  async labelDecisions(opts: { max?: number; sinceDays?: number } = {}): Promise<LabelResult> {
    const max = opts.max ?? 200;
    const sinceDays = opts.sinceDays ?? 365;
    const { host, port, user, pass, tls, mailbox } = this.cfg;
    const client = new ImapFlow({ host, port, secure: tls, auth: { user, pass }, logger: false });
    await client.connect();
    try {
      // Ensure the destination label exists (Gmail label == IMAP mailbox).
      try {
        await client.mailboxCreate(this.labelName);
      } catch {
        /* already exists — fine */
      }

      const lock = await client.getMailboxLock(mailbox, { readOnly: true });
      const titles: string[] = [];
      let scanned = 0;
      try {
        const since = new Date(Date.now() - sinceDays * 24 * 60 * 60 * 1000);
        const uids = ((await client.search({ since }, { uid: true })) || []).sort((a, b) => b - a).slice(0, max);
        scanned = uids.length;
        const toLabel: number[] = [];
        if (uids.length) {
          for await (const msg of client.fetch(uids.join(','), { source: true }, { uid: true })) {
            if (!msg.source) continue;
            const parsed = await simpleParser(msg.source);
            const email: EmailLike = {
              subject: parsed.subject ?? '',
              from: parsed.from?.text ?? '',
              body: (parsed.text ?? '').trim() || String(parsed.html ?? '').replace(/<[^>]+>/g, ' '),
            };
            if (isDecisionEmail(email)) {
              toLabel.push(msg.uid);
              if (titles.length < 50) titles.push(email.subject || '(no subject)');
            }
          }
        }
        if (toLabel.length) {
          await client.messageCopy(toLabel.join(','), this.labelName, { uid: true });
        }
        return { scanned, labeled: toLabel.length, titles };
      } finally {
        lock.release();
      }
    } finally {
      await client.logout().catch(() => {});
    }
  }
}
