import type {
  LedgerAccountRecord,
  LedgerEntryRecord,
  FourFlowEscrowRecord,
  ReserveAssetItem,
  FederationNodeItem,
} from '@/types/ledger';
import {
  createInitialAccounts,
  createInitialEntries,
  createInitialEscrows,
  createInitialReserves,
} from '@/lib/ledger-seed';
import { createInitialFederationNodes } from '@/lib/federation-seed';

export interface LedgerMemoryState {
  accounts: LedgerAccountRecord[];
  entries: LedgerEntryRecord[];
  escrows: FourFlowEscrowRecord[];
  reserves: ReserveAssetItem[];
  federationNodes: FederationNodeItem[];
  processedKeys: Set<string>;
}

const globalForLedger = globalThis as unknown as {
  __usdfLedgerState?: LedgerMemoryState;
};

export function createFreshState(): LedgerMemoryState {
  const entries = createInitialEntries();
  return {
    accounts: createInitialAccounts(),
    entries,
    escrows: createInitialEscrows(),
    reserves: createInitialReserves(),
    federationNodes: createInitialFederationNodes(),
    processedKeys: new Set(entries.map((e) => e.idempotencyKey)),
  };
}

export function persistLedgerWal(_state: LedgerMemoryState): void {
  // Authoritative clearing state persists on the Cloudflare Durable Object Worker
  // (usdfirm-rt-protocol). Serverless runtime keeps in-memory state only without
  // writing local disk JSON WAL files.
}

export function getState(): LedgerMemoryState {
  if (!globalForLedger.__usdfLedgerState) {
    globalForLedger.__usdfLedgerState = createFreshState();
  }
  return globalForLedger.__usdfLedgerState;
}

export function resetLedgerStoreForTesting(): void {
  globalForLedger.__usdfLedgerState = createFreshState();
}

export function assertIdempotency(
  state: LedgerMemoryState,
  key: string
): void {
  if (state.processedKeys.has(key)) {
    throw new Error(`ERR_IDEMPOTENCY_CONFLICT: ${key}`);
  }
}

export function findOrCreateWallet(
  state: LedgerMemoryState,
  ownerSite: string,
  ownerEntity: string
): LedgerAccountRecord {
  const exact = state.accounts.find(
    (a) => a.ownerSite === ownerSite && a.ownerEntity === ownerEntity
  );
  if (exact) return exact;

  const bySite = state.accounts.find(
    (a) => a.ownerSite === ownerSite && a.accountType === 'USER_WALLET'
  );
  if (bySite) return bySite;

  const byEntity = state.accounts.find(
    (a) => a.ownerEntity === ownerEntity && a.accountType === 'USER_WALLET'
  );
  if (byEntity) return byEntity;

  const created: LedgerAccountRecord = {
    id: `ACC-${Date.now().toString(36).toUpperCase()}`,
    ownerSite,
    ownerEntity,
    accountType: 'USER_WALLET',
    asdStableBal: 0,
    asdGasBal: 0,
    version: 1,
    updatedAt: new Date().toISOString(),
  };
  state.accounts.push(created);
  return created;
}
