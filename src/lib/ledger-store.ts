import fs from 'node:fs';
import path from 'node:path';
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

const WAL_FILE_PATH = path.join(process.cwd(), '.asdcoin-wal.json');

const globalForLedger = globalThis as unknown as {
  __asdLedgerState?: LedgerMemoryState;
};

function isTestRuntime(): boolean {
  return process.env.NODE_ENV === 'test' || Boolean(process.env.VITEST);
}

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

export function persistLedgerWal(state: LedgerMemoryState): void {
  if (isTestRuntime()) return;
  try {
    const serialized = JSON.stringify(
      {
        accounts: state.accounts,
        entries: state.entries,
        escrows: state.escrows,
        reserves: state.reserves,
        federationNodes: state.federationNodes,
        processedKeys: Array.from(state.processedKeys),
      },
      null,
      2
    );
    fs.writeFileSync(WAL_FILE_PATH, serialized, 'utf8');
  } catch (err) {
    console.warn('[WAL_PERSIST_WARN]', err);
  }
}

function loadFromWalOrFresh(): LedgerMemoryState {
  if (!isTestRuntime() && fs.existsSync(WAL_FILE_PATH)) {
    try {
      const raw = fs.readFileSync(WAL_FILE_PATH, 'utf8');
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed.accounts) && Array.isArray(parsed.entries)) {
        return {
          accounts: parsed.accounts,
          entries: parsed.entries,
          escrows: parsed.escrows ?? createInitialEscrows(),
          reserves: parsed.reserves ?? createInitialReserves(),
          federationNodes:
            parsed.federationNodes ?? createInitialFederationNodes(),
          processedKeys: new Set(parsed.processedKeys ?? []),
        };
      }
    } catch (err) {
      console.warn('[WAL_LOAD_WARN]', err);
    }
  }
  return createFreshState();
}

export function getState(): LedgerMemoryState {
  if (!globalForLedger.__asdLedgerState) {
    globalForLedger.__asdLedgerState = loadFromWalOrFresh();
  }
  return globalForLedger.__asdLedgerState;
}

export function resetLedgerStoreForTesting(): void {
  globalForLedger.__asdLedgerState = createFreshState();
}

export function assertIdempotency(
  state: LedgerMemoryState,
  key: string
): void {
  if (state.processedKeys.has(key)) {
    throw new Error(
      `IDEMPOTENCY_CONFLICT: 幂等键 ${key} 已处理，严禁重复清算`
    );
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
