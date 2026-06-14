import path from 'node:path';
import { Ledger } from '../ledger/ledger.js';
import { CaptureInbox } from '../evaluation/inbox.js';
import { LocalLLMProvider } from '../evaluation/local.js';
import { CloudLLMProvider } from '../evaluation/cloud.js';
import type { LLMProvider } from '../evaluation/provider.js';
import { AssetEngine } from '../assets/engine.js';
import { BoundaryService } from '../boundary/boundary.js';
import { vaultPaths } from '../ledger/storage.js';

// The application context wires together the services each route handler needs.
export interface AppContext {
  root: string;
  ledger: Ledger;
  inbox: CaptureInbox;
  localProvider: LLMProvider;
  cloudProvider: CloudLLMProvider;
  assets: AssetEngine;
  boundary: BoundaryService;
}

export async function createContext(root: string): Promise<AppContext> {
  const ledger = await Ledger.open(root);
  const paths = vaultPaths(root);
  const inbox = await CaptureInbox.open(path.join(root, 'candidates.json'), ledger);
  const assets = await AssetEngine.open(ledger, paths.assets);
  const localProvider = new LocalLLMProvider();
  const cloudProvider = new CloudLLMProvider();
  const boundary = await BoundaryService.open(
    path.join(root, 'boundary-log.json'),
    inbox,
    localProvider,
    cloudProvider,
  );
  return { root, ledger, inbox, localProvider, cloudProvider, assets, boundary };
}
