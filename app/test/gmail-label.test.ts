import { describe, it, expect } from 'vitest';
import { isDecisionEmail, isAutomatedSender, looksMarketingOrBot, isGmailHost } from '../src/ingestion/gmail-label.js';

describe('gmail decision classifier', () => {
  it('labels a genuine decision email (English)', () => {
    expect(isDecisionEmail({
      subject: 'Re: pricing model',
      from: 'Priya Nair <priya@northpeak.example>',
      body: 'After the review we decided to move to value-based pricing. Owner: head of sales.',
    })).toBe(true);
  });

  it('labels a genuine decision email (German)', () => {
    expect(isDecisionEmail({
      subject: 'Lieferanten-Freigabe',
      from: 'Tomás Herrera <tomas@northpeak.example>',
      body: 'Wir haben entschieden, den Backup-Lieferanten freizugeben. Verantwortlich: Betriebsleitung.',
    })).toBe(true);
  });

  it('does NOT label a deploy bot even though it says "deploy"/"ready"', () => {
    expect(isDecisionEmail({
      subject: 'Deploy Preview ready',
      from: 'netlify[bot] <bot@notifications.netlify.com>',
      body: 'Deploy Preview for adamas-project ready! Latest commit e863ae9.',
    })).toBe(false);
  });

  it('does NOT label a marketing send that merely contains "decision"', () => {
    expect(isDecisionEmail({
      subject: "Here's your copy of the Founder's Guide",
      from: 'Massimo Sahin <m@adamas-project.com>',
      body: 'The biggest decision a founder makes… Click here. Unsubscribe at any time.',
    })).toBe(false);
  });

  it('does NOT label a LinkedIn receipt', () => {
    expect(isDecisionEmail({
      subject: 'Your purchase is confirmed',
      from: 'LinkedIn <messages-noreply@linkedin.com>',
      body: 'Thank you for purchasing Premium Business. Your receipt is attached.',
    })).toBe(false);
  });

  it('does NOT label ordinary correspondence with no decision cue', () => {
    expect(isDecisionEmail({
      subject: 'Documents',
      from: 'Ulrich <ulrich@example.com>',
      body: 'Hallo, bitte sende mir die Unterlagen. Danke.',
    })).toBe(false);
  });

  it('recognizes automated senders and marketing/bot bodies', () => {
    expect(isAutomatedSender('no-reply@example.com')).toBe(true);
    expect(isAutomatedSender('jane@company.com')).toBe(false);
    expect(looksMarketingOrBot('… unsubscribe here')).toBe(true);
    expect(looksMarketingOrBot('we decided to ship it')).toBe(false);
  });

  it('detects Gmail / Workspace hosts', () => {
    expect(isGmailHost('imap.gmail.com')).toBe(true);
    expect(isGmailHost('imap.mail.me.com')).toBe(false);
  });
});
