import path from 'node:path';
import { Ledger } from '../ledger/ledger.js';
import { CaptureInbox } from '../evaluation/inbox.js';
import { LocalLLMProvider } from '../evaluation/local.js';
import type { LLMProvider } from '../evaluation/provider.js';
import { AssetEngine } from '../assets/engine.js';
import { vaultPaths } from '../ledger/storage.js';

// The application context wires together the services each route handler needs.
export interface AppContext {
  root: string;
  ledger: Ledger;
  inbox: CaptureInbox;
  localProvider: LLMProvider;
  assets: AssetEngine;
}

export async function createContext(root: string): Promise<AppContext> {
  const ledger = await Ledger.open(root);
  const paths = vaultPaths(root);
  const inbox = await CaptureInbox.open(path.join(root, 'candidates.json'), ledger);
  const assets = await AssetEngine.open(ledger, paths.assets);
  return { root, ledger, inbox, localProvider: new LocalLLMProvider(), assets };
}
