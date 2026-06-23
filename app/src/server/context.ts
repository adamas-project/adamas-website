import path from 'node:path';
import { Ledger } from '../ledger/ledger.js';
import { CaptureInbox } from '../evaluation/inbox.js';
import { LocalLLMProvider } from '../evaluation/local.js';
import { OllamaLLMProvider } from '../evaluation/ollama.js';
import { CloudLLMProvider } from '../evaluation/cloud.js';
import type { LLMProvider } from '../evaluation/provider.js';
import { AssetEngine } from '../assets/engine.js';
import { BoundaryService } from '../boundary/boundary.js';
import { ConnectorManager } from '../ingestion/manager.js';
import { FilesystemConnector } from '../ingestion/filesystem.js';
import { ImapConnector } from '../ingestion/imap.js';
import { CalendarConnector } from '../ingestion/calendar.js';
import type { Connector } from '../ingestion/connector.js';
import { CommandTranscriber, type Transcriber } from '../ingestion/transcribe.js';
import { ConnectorScheduler } from '../ingestion/scheduler.js';
import { KnowledgeStore } from '../knowledge/store.js';
import { ObsidianAutoExporter } from '../obsidian/auto.js';
import { ObsidianInboxWatcher } from '../obsidian/import.js';
import { vaultPaths } from '../ledger/storage.js';
import {
  connectorPullMinutes,
  hermesConfig,
  icsConfig,
  imapConfig,
  obsidianAutoEnabled,
  resolveObsidianDir,
  resolveSourcesDir,
  transcribeConfig,
  type HermesConfig,
} from '../config/env.js';

// The application context wires together the services each route handler needs.
export interface AppContext {
  root: string;
  ledger: Ledger;
  inbox: CaptureInbox;
  localProvider: LLMProvider;
  cloudProvider: CloudLLMProvider;
  assets: AssetEngine;
  boundary: BoundaryService;
  connectors: ConnectorManager;
  transcriber: Transcriber | null;
  knowledge: KnowledgeStore;
  obsidianAuto: ObsidianAutoExporter | null;
  obsidianInbox: ObsidianInboxWatcher | null;
  connectorScheduler: ConnectorScheduler | null;
  hermes: HermesConfig;
}

export async function createContext(root: string): Promise<AppContext> {
  const ledger = await Ledger.open(root);
  const paths = vaultPaths(root);
  const inbox = await CaptureInbox.open(path.join(root, 'candidates.json'), ledger);
  const assets = await AssetEngine.open(ledger, paths.assets);

  // Hermes (local evaluation) is pluggable: the deterministic built-in provider
  // by default, or a local Ollama model when configured. Both run on-device.
  const hermes = hermesConfig();
  const localProvider: LLMProvider =
    hermes.provider === 'ollama'
      ? new OllamaLLMProvider(hermes.ollamaUrl, hermes.ollamaModel)
      : new LocalLLMProvider();

  const cloudProvider = new CloudLLMProvider();
  const boundary = await BoundaryService.open(
    path.join(root, 'boundary-log.json'),
    inbox,
    localProvider,
    cloudProvider,
  );

  // Read-only ingestion connectors (inbound only). Local folder always on; the
  // IMAP email connector is opt-in (active only when IMAP env vars are set).
  const connectorList: Connector[] = [new FilesystemConnector(resolveSourcesDir(root))];
  const imap = imapConfig();
  if (imap) connectorList.push(new ImapConnector(imap));
  const ics = icsConfig();
  if (ics) connectorList.push(new CalendarConnector(ics.url, ics.name));
  const connectors = await ConnectorManager.open(path.join(root, 'connectors.json'), connectorList);

  const tcfg = transcribeConfig();
  const transcriber: Transcriber | null = tcfg ? new CommandTranscriber(tcfg.cmd, tcfg.timeoutMs) : null;
  const knowledge = await KnowledgeStore.open(path.join(root, 'knowledge'));

  // Keep the derived Obsidian data-room vault in sync with every change (opt-out
  // via ADAMAS_OBSIDIAN_AUTO=0). The manual Data Room → Generate still works.
  let obsidianAuto: ObsidianAutoExporter | null = null;
  let obsidianInbox: ObsidianInboxWatcher | null = null;
  if (obsidianAutoEnabled()) {
    const obsidianDir = resolveObsidianDir(root);
    obsidianAuto = new ObsidianAutoExporter({ ledger, knowledge, assets }, obsidianDir);
    obsidianAuto.start();
    // Write-back: import notes dropped into obsidian/_Inbox/ (two-way sync).
    obsidianInbox = new ObsidianInboxWatcher({ knowledge, provider: localProvider }, obsidianDir);
    obsidianInbox.start();
  }

  // Optional: periodically pull connectors so the inbox fills itself (opt-in via
  // ADAMAS_CONNECTOR_PULL_MINUTES). Read-only; nothing enters the ledger unreviewed.
  let connectorScheduler: ConnectorScheduler | null = null;
  const pullMinutes = connectorPullMinutes();
  if (pullMinutes > 0) {
    connectorScheduler = new ConnectorScheduler(connectors, inbox, localProvider, pullMinutes * 60_000);
    connectorScheduler.start();
  }

  return {
    root,
    ledger,
    inbox,
    localProvider,
    cloudProvider,
    assets,
    boundary,
    connectors,
    transcriber,
    knowledge,
    obsidianAuto,
    obsidianInbox,
    connectorScheduler,
    hermes,
  };
}
