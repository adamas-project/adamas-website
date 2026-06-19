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
import { vaultPaths } from '../ledger/storage.js';
import { hermesConfig, resolveSourcesDir, type HermesConfig } from '../config/env.js';

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

  // Read-only ingestion connectors (inbound only). Local folder by default.
  const connectors = await ConnectorManager.open(path.join(root, 'connectors.json'), [
    new FilesystemConnector(resolveSourcesDir(root)),
  ]);

  return { root, ledger, inbox, localProvider, cloudProvider, assets, boundary, connectors, hermes };
}
