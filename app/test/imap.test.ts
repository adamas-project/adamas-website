import { describe, it, expect, afterEach } from 'vitest';
import { simpleParser } from 'mailparser';
import { mailToSourceDocument } from '../src/ingestion/imap.js';
import { imapConfig } from '../src/config/env.js';

const ENV = { ...process.env };
afterEach(() => {
  process.env = { ...ENV };
});

describe('imap connector — message mapping', () => {
  it('maps a parsed email to a read-only source document', async () => {
    const raw = [
      'From: Alex <alex@example.com>',
      'Subject: Pricing decision',
      'Date: Wed, 18 Jun 2026 10:00:00 +0000',
      '',
      'We decided to drop the hourly rate card. Owner: head of sales.',
    ].join('\r\n');
    const parsed = await simpleParser(Buffer.from(raw));
    const doc = mailToSourceDocument(parsed, 42, 'INBOX');

    expect(doc.kind).toBe('email');
    expect(doc.title).toBe('Pricing decision');
    expect(doc.ref).toBe('email:2026-06-18#INBOX/42');
    expect(doc.date).toBe('2026-06-18');
    expect(doc.text).toMatch(/drop the hourly rate card/);
    expect(doc.text).toMatch(/From:.*alex@example\.com/);
  });

  it('handles a missing subject gracefully', async () => {
    const parsed = await simpleParser(Buffer.from('From: x@y.com\r\n\r\nWe decided to do X.'));
    const doc = mailToSourceDocument(parsed, 7, 'INBOX');
    expect(doc.title).toBe('(no subject)');
    expect(doc.text).toMatch(/We decided to do X/);
  });
});

describe('imap config gating (opt-in)', () => {
  it('is null unless host + user + pass are all set', () => {
    delete process.env.ADAMAS_IMAP_HOST;
    delete process.env.ADAMAS_IMAP_USER;
    delete process.env.ADAMAS_IMAP_PASS;
    expect(imapConfig()).toBeNull();
  });

  it('reads config with sensible defaults', () => {
    process.env.ADAMAS_IMAP_HOST = 'imap.gmail.com';
    process.env.ADAMAS_IMAP_USER = 'me@gmail.com';
    process.env.ADAMAS_IMAP_PASS = 'app-password';
    const cfg = imapConfig();
    expect(cfg).toMatchObject({ host: 'imap.gmail.com', port: 993, tls: true, mailbox: 'INBOX', max: 25 });
  });
});
