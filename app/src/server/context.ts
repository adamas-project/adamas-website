import { Ledger } from '../ledger/ledger.js';

// The application context wires together the services each route handler needs.
// Services are added stage by stage; the ledger is the foundation.
export interface AppContext {
  root: string;
  ledger: Ledger;
}

export async function createContext(root: string): Promise<AppContext> {
  const ledger = await Ledger.open(root);
  return { root, ledger };
}
