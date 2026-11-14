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

const GAS_PER_ASD_S = 1_000_000;

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
    throw new Error('LEDGER_FATAL: 核心储备总账账户缺失');
  }

  const wallet = findOrCreateWallet(
    state,
    input.ownerSite,
    input.ownerEntity
  );

  let convertedAmount = 0;

  if (input.direction === 'ASD_S_TO_G') {
    if (wallet.asdStableBal < input.amount) {
      throw new Error(
        'INSUFFICIENT_ASD_BALANCE: 可用 ASD-S 余额不足以闪兑 ASD-G'
      );
    }
    convertedAmount = Math.round(input.amount * GAS_PER_ASD_S);
    wallet.asdStableBal -= input.amount;
    wallet.asdGasBal += convertedAmount;
    reserveAcc.asdStableBal -= input.amount;
    reserveAcc.asdGasBal += convertedAmount;
  } else {
    if (wallet.asdGasBal < input.amount) {
      throw new Error(
        'INSUFFICIENT_GAS_BALANCE: 可用 ASD-G 余额不足以反向闪兑 ASD-S'
      );
    }
    convertedAmount = Number((input.amount / GAS_PER_ASD_S).toFixed(4));
    wallet.asdGasBal -= input.amount;
    wallet.asdStableBal += convertedAmount;
    reserveAcc.asdGasBal -= input.amount;
    reserveAcc.asdStableBal += convertedAmount;
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
    tokenType: input.direction === 'ASD_S_TO_G' ? 'ASD_S' : 'ASD_G',
    skillCode: null,
    memo:
      input.direction === 'ASD_S_TO_G'
        ? `[零滑点闪兑] ${input.ownerSite}: ${input.amount.toLocaleString()} ASD-S → ${convertedAmount.toLocaleString()} ASD-G`
        : `[零滑点闪兑] ${input.ownerSite}: ${input.amount.toLocaleString()} ASD-G → ${convertedAmount.toLocaleString()} ASD-S`,
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
    throw new Error(
      'INVALID_HMAC_SIGNATURE: 跨站联邦报文 HMAC-SHA256 签名验签失败，拒绝入账'
    );
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
    throw new Error('LEDGER_FATAL: 目标跨站接收清算池缺失');
  }
  if (sourceWallet.asdStableBal < input.amountAsdS) {
    throw new Error(
      `INSUFFICIENT_ASD_BALANCE: 发起站点 ${input.sourceSite} 可用 ASD-S 余额不足`
    );
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
    tokenType: 'ASD_S',
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
