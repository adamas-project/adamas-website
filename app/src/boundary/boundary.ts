import { randomUUID } from 'node:crypto';
import { atomicWrite, readText } from '../ledger/storage.js';
import type { CaptureInbox, StoredCandidate } from '../evaluation/inbox.js';
import type { LLMProvider, SourceDocument } from '../evaluation/provider.js';
import type { CloudLLMProvider } from '../evaluation/cloud.js';

export type BoundaryRoute = 'local' | 'cloud';

export interface TransmissionPreview {
  taskId: string;
  purpose: string;
  targetProvider: 'cloud';
  documents: Array<{ ref: string; kind: string; date: string; title: string; chars: number }>;
  /** The EXACT content that would be transmitted if approved. */
  exactContent: string[];
  totalChars: number;
  createdAt: string;
}

export interface BoundaryTask extends TransmissionPreview {
  status: 'pending' | 'completed';
  route?: BoundaryRoute;
  resolvedAt?: string;
}

export interface RouteLogEntry {
  taskId: string;
  purpose: string;
  route: BoundaryRoute;
  provider: string;
  approved: boolean;
  documentRefs: string[];
  transmittedChars: number;
  resultCount: number;
  at: string;
}

/**
 * The hard data boundary. By default ADAMAS runs everything locally. A hybrid-
 * cloud task is opt-in PER TASK: prepare() shows exactly what would be sent;
 * approve() transmits via the cloud provider and returns results to the local
 * vault; decline() runs locally instead. Either way the route is logged.
 */
export class BoundaryService {
  private tasks = new Map<string, BoundaryTask & { _docs: SourceDocument[] }>();
  private log: RouteLogEntry[] = [];

  private constructor(
    private readonly logPath: string,
    private readonly inbox: CaptureInbox,
    private readonly local: LLMProvider,
    private readonly cloud: CloudLLMProvider,
  ) {}

  static async open(
    logPath: string,
    inbox: CaptureInbox,
    local: LLMProvider,
    cloud: CloudLLMProvider,
  ): Promise<BoundaryService> {
    const svc = new BoundaryService(logPath, inbox, local, cloud);
    try {
      const raw = await readText(logPath);
      svc.log = (JSON.parse(raw) as { entries?: RouteLogEntry[] }).entries ?? [];
    } catch {
      svc.log = [];
    }
    return svc;
  }

  /** Step 1: prepare a hybrid task. NOTHING is transmitted here. */
  prepare(purpose: string, docs: SourceDocument[]): TransmissionPreview {
    const taskId = randomUUID();
    const exactContent = docs.map((d) => `# ${d.title} (${d.ref})\n${d.text}`);
    const totalChars = exactContent.reduce((n, c) => n + c.length, 0);
    const task: BoundaryTask & { _docs: SourceDocument[] } = {
      taskId,
      purpose,
      targetProvider: 'cloud',
      documents: docs.map((d) => ({ ref: d.ref, kind: d.kind, date: d.date, title: d.title, chars: d.text.length })),
      exactContent,
      totalChars,
      createdAt: new Date().toISOString(),
      status: 'pending',
      _docs: docs,
    };
    this.tasks.set(taskId, task);
    return stripDocs(task);
  }

  getTask(taskId: string): BoundaryTask | undefined {
    const t = this.tasks.get(taskId);
    return t ? stripDocs(t) : undefined;
  }

  /** Step 2a: approve — run the CLOUD route (content leaves the machine). */
  async approve(taskId: string): Promise<{ route: BoundaryRoute; added: StoredCandidate[]; entry: RouteLogEntry }> {
    const task = this.requirePending(taskId);
    this.cloud.authorize(task._docs.length);
    const added = await this.inbox.ingest(this.cloud, task._docs);
    return this.complete(task, 'cloud', this.cloud.id, true, task.totalChars, added);
  }

  /** Step 2b: decline — run LOCALLY. No content leaves the machine. */
  async decline(taskId: string): Promise<{ route: BoundaryRoute; added: StoredCandidate[]; entry: RouteLogEntry }> {
    const task = this.requirePending(taskId);
    const added = await this.inbox.ingest(this.local, task._docs);
    return this.complete(task, 'local', this.local.id, false, 0, added);
  }

  private requirePending(taskId: string): BoundaryTask & { _docs: SourceDocument[] } {
    const task = this.tasks.get(taskId);
    if (!task) throw new Error(`No boundary task ${taskId}`);
    if (task.status !== 'pending') throw new Error(`Task ${taskId} already resolved (${task.route}).`);
    return task;
  }

  private async complete(
    task: BoundaryTask & { _docs: SourceDocument[] },
    route: BoundaryRoute,
    provider: string,
    approved: boolean,
    transmittedChars: number,
    added: StoredCandidate[],
  ): Promise<{ route: BoundaryRoute; added: StoredCandidate[]; entry: RouteLogEntry }> {
    task.status = 'completed';
    task.route = route;
    task.resolvedAt = new Date().toISOString();
    const entry: RouteLogEntry = {
      taskId: task.taskId,
      purpose: task.purpose,
      route,
      provider,
      approved,
      documentRefs: task._docs.map((d) => d.ref),
      transmittedChars,
      resultCount: added.length,
      at: task.resolvedAt,
    };
    this.log.push(entry);
    await this.persist();
    return { route, added, entry };
  }

  getLog(): RouteLogEntry[] {
    return [...this.log];
  }

  private async persist(): Promise<void> {
    await atomicWrite(this.logPath, JSON.stringify({ version: 1, entries: this.log }, null, 2));
  }
}

function stripDocs(task: BoundaryTask & { _docs?: SourceDocument[] }): BoundaryTask {
  const { _docs, ...rest } = task as BoundaryTask & { _docs?: SourceDocument[] };
  void _docs;
  return rest;
}
