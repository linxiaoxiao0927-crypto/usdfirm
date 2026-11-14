import type {
  LedgerEntryRecord,
  LedgerSnapshot,
} from '@/types/ledger';
import type {
  TokenSwapInput,
  FederationEventInput,
} from '@/lib/schemas/ledger-schemas';
import {
  getState,
  assertIdempotency,
  findOrCreateWallet,
  persistLedgerWal,
} from '@/lib/ledger-store';
import { getLedgerSnapshot } from '@/lib/ledger-engine';
import { computeChainedTxHash } from '@/lib/crypto-chain-engine';

const UUSDF_PER_USDF = 1_000_000;

export function executeTokenSwap(input: TokenSwapInput): {
  entry: LedgerEntryRecord;
  convertedAmount: number;
  snapshot: LedgerSnapshot;
} {
  const state = getState();
  assertIdempotency(state, input.idempotencyKey);

  const reserveAcc = state.accounts.find(
    (a) => a.accountType === 'ASSET_RESERVE'
  );
  if (!reserveAcc) {
    throw new Error('ERR_LEDGER_FATAL');
  }

  const wallet = findOrCreateWallet(
    state,
    input.ownerSite,
    input.ownerEntity
  );

  let convertedAmount = 0;

  if (input.direction === 'USDF_TO_UUSDF') {
    if (wallet.asdStableBal < input.amount) {
      throw new Error('ERR_INSUFFICIENT_USDF_BALANCE');
    }
    convertedAmount = Math.round(input.amount * UUSDF_PER_USDF);
    wallet.asdStableBal -= input.amount;
    wallet.asdGasBal += convertedAmount;
    reserveAcc.asdStableBal -= input.amount;
    reserveAcc.asdGasBal += convertedAmount;
  } else if (input.direction === 'UUSDF_TO_USDF') {
    if (wallet.asdGasBal < input.amount) {
      throw new Error('ERR_INSUFFICIENT_UUSDF_BALANCE');
    }
    convertedAmount = Number((input.amount / UUSDF_PER_USDF).toFixed(4));
    wallet.asdGasBal -= input.amount;
    wallet.asdStableBal += convertedAmount;
    reserveAcc.asdGasBal -= input.amount;
    reserveAcc.asdStableBal += convertedAmount;
  } else {
    throw new Error('ERR_VALIDATION_FAILED');
  }

  wallet.version += 1;
  wallet.updatedAt = new Date().toISOString();

  const prevHash = state.entries[0]?.txHash ?? '0x00';
  const entry: LedgerEntryRecord = {
    id: `TX-SWAP-${Date.now().toString(36).toUpperCase()}`,
    idempotencyKey: input.idempotencyKey,
    txHash: computeChainedTxHash(
      prevHash,
      input.idempotencyKey,
      wallet.id,
      reserveAcc.id,
      input.amount
    ),
    debitAccId: wallet.id,
    creditAccId: reserveAcc.id,
    amount: input.amount,
    tokenType: input.direction === 'USDF_TO_UUSDF' ? 'USDF' : 'UUSDF',
    skillCode: null,
    memo:
      input.direction === 'USDF_TO_UUSDF'
        ? `[Zero-Slippage Swap] ${input.ownerSite}: ${input.amount.toLocaleString()} USDF → ${convertedAmount.toLocaleString()} uUSDF`
        : `[Zero-Slippage Swap] ${input.ownerSite}: ${input.amount.toLocaleString()} uUSDF → ${convertedAmount.toLocaleString()} USDF`,
    category: 'FINTECH_RESERVE',
    createdAt: new Date().toISOString(),
  };

  state.processedKeys.add(input.idempotencyKey);
  state.entries.unshift(entry);
  persistLedgerWal(state);

  return {
    entry,
    convertedAmount,
    snapshot: getLedgerSnapshot(),
  };
}

export function executeFederationEvent(input: FederationEventInput): {
  entry: LedgerEntryRecord;
  snapshot: LedgerSnapshot;
} {
  const state = getState();
  assertIdempotency(state, input.idempotencyKey);

  if (
    !input.hmacSignature.startsWith('sha256=') ||
    input.hmacSignature.length < 20
  ) {
    throw new Error('ERR_INVALID_HMAC_SIGNATURE');
  }

  const sourceWallet = findOrCreateWallet(
    state,
    input.sourceSite,
    'ENT-SOFA-CORE'
  );
  const targetPool =
    state.accounts.find((a) => a.ownerSite === input.targetSite) ??
    state.accounts.find((a) => a.accountType === 'SKILL_GAS_POOL');

  if (!targetPool) {
    throw new Error('ERR_LEDGER_FATAL');
  }
  if (sourceWallet.asdStableBal < input.amountAsdS) {
    throw new Error('ERR_INSUFFICIENT_USDF_BALANCE');
  }

  sourceWallet.asdStableBal -= input.amountAsdS;
  targetPool.asdStableBal += input.amountAsdS;
  sourceWallet.version += 1;
  targetPool.version += 1;

  const nowIso = new Date().toISOString();
  state.federationNodes.forEach((node) => {
    if (
      node.domain === input.sourceSite ||
      node.domain === input.targetSite
    ) {
      node.volume24hAsdS += input.amountAsdS;
      node.lastSyncAt = nowIso;
    }
  });

  const prevHash = state.entries[0]?.txHash ?? '0x00';
  const entry: LedgerEntryRecord = {
    id: `TX-FED-${Date.now().toString(36).toUpperCase()}`,
    idempotencyKey: input.idempotencyKey,
    txHash: computeChainedTxHash(
      prevHash,
      input.idempotencyKey,
      sourceWallet.id,
      targetPool.id,
      input.amountAsdS
    ),
    debitAccId: sourceWallet.id,
    creditAccId: targetPool.id,
    amount: input.amountAsdS,
    tokenType: 'USDF',
    skillCode:
      input.eventType === 'COMPUTE_LEASE_PAYOUT'
        ? 'SKILL_06_IDLES'
        : input.eventType === 'TAX_ROUTE_REBATE'
          ? 'SKILL_02_TAXYES'
          : 'SKILL_03_UPTOYES',
    memo: `[跨站联邦总线 ${input.sourceSite} → ${input.targetSite}] ${input.payloadSummary}`,
    category:
      input.eventType === 'CROSS_MALL_ORDER_LOCK'
        ? 'RETAIL_BRANDS'
        : 'AI_COMPUTE',
    createdAt: nowIso,
  };

  state.processedKeys.add(input.idempotencyKey);
  state.entries.unshift(entry);
  persistLedgerWal(state);

  return {
    entry,
    snapshot: getLedgerSnapshot(),
  };
}
