import { GmailLabeler } from './gmail-label.js';
import { loadGmailSettings, resolveImapConfig } from '../server/gmail-settings.js';

// Background auto-labeler: when the operator has set an auto-label interval in the
// Gmail settings, this periodically runs the decision-labeler. It ticks once a
// minute and reads the saved interval fresh each time, so enabling/disabling from
// the UI takes effect without a restart. Only ADDS labels (never deletes/sends).
export class GmailAutoLabeler {
  private timer: ReturnType<typeof setInterval> | null = null;
  private last = 0;
  private running = false;

  constructor(private readonly root: string) {}

  start(): void {
    if (this.timer) return;
    this.timer = setInterval(() => void this.tick(), 60_000);
    if (typeof this.timer.unref === 'function') this.timer.unref();
  }

  stop(): void {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  private async tick(): Promise<void> {
    if (this.running) return;
    let settings;
    try {
      settings = await loadGmailSettings(this.root);
    } catch {
      return;
    }
    const minutes = settings?.autoLabelMinutes ?? 0;
    if (!minutes || minutes <= 0) return;
    if (Date.now() - this.last < minutes * 60_000) return;

    this.running = true;
    this.last = Date.now();
    try {
      const { cfg } = await resolveImapConfig(this.root);
      if (cfg) await new GmailLabeler(cfg).labelDecisions();
    } catch (err) {
      console.warn(`[gmail-auto] labeling failed: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }
}
