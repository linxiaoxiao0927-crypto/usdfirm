import type {
  LedgerEntryRecord,
  LedgerSnapshot,
} from '@/types/ledger';
import type {
  MintOrRedeemInput,
  SkillGasBurnInput,
} from '@/lib/schemas/ledger-schemas';
import { SHINEMIGHT_SKILLS } from '@/lib/ledger-seed';
import {
  getState,
  resetLedgerStoreForTesting,
  assertIdempotency,
  findOrCreateWallet,
  persistLedgerWal,
} from '@/lib/ledger-store';
import {
  executeEscrowCreate,
  executeEscrowSettlement,
} from '@/lib/escrow-engine';
import { computeChainedTxHash } from '@/lib/crypto-chain-engine';

export {
  resetLedgerStoreForTesting,
  executeEscrowCreate,
  executeEscrowSettlement,
};

export function getLedgerSnapshot(): LedgerSnapshot {
  const state = getState();
  const reserveAssetAcc = state.accounts.find(
    (a) => a.accountType === 'ASSET_RESERVE'
  );
  const nonReserveAccounts = state.accounts.filter(
    (a) => a.accountType !== 'ASSET_RESERVE'
  );

  const circulatingAsdS = nonReserveAccounts.reduce(
    (sum, a) => sum + a.asdStableBal,
    0
  );
  const circulatingAsdG = nonReserveAccounts.reduce(
    (sum, a) => sum + a.asdGasBal,
    0
  );
  const totalReserveUsd = state.reserves.reduce(
    (sum, r) => sum + r.usdValue,
    0
  );
  const reserveRatioPct =
    circulatingAsdS > 0
      ? Number(((totalReserveUsd / circulatingAsdS) * 100).toFixed(2))
      : 100;

  const treasuryAcc = state.accounts.find(
    (a) => a.accountType === 'TREASURY_BURN'
  );
  const totalBurnedAsdG = treasuryAcc ? treasuryAcc.asdGasBal : 0;

  const trialBalanceOk = reserveAssetAcc
    ? reserveAssetAcc.asdStableBal === circulatingAsdS &&
      reserveAssetAcc.asdGasBal === circulatingAsdG
    : false;

  const settledCount = state.escrows.filter(
    (e) => e.status === 'SETTLED_SPLIT'
  ).length;
  const fourFlowAlignmentPct =
    state.escrows.length > 0
      ? Number(
          (
            ((settledCount +
              state.escrows.filter((e) => e.xpayesPayment !== null).length) /
              (state.escrows.length * 2)) *
            100
          ).toFixed(1)
        )
      : 100;

  return {
    circulatingAsdS,
    circulatingAsdG,
    totalReserveUsd,
    reserveRatioPct,
    totalBurnedAsdG,
    fourFlowAlignmentPct,
    tpsPulse: 1420 + state.entries.length * 17,
    trialBalanceOk,
    accounts: state.accounts.map((a) => ({ ...a })),
    recentEntries: state.entries.slice(0, 20).map((e) => ({ ...e })),
    escrowOrders: state.escrows.map((e) => ({
      ...e,
      splitRules: e.splitRules.map((r) => ({ ...r })),
    })),
    reserves: state.reserves.map((r) => ({ ...r })),
    skills: SHINEMIGHT_SKILLS,
    federationNodes: state.federationNodes.map((n) => ({ ...n })),
  };
}

export function executeMintOrRedeem(input: MintOrRedeemInput): {
  entry: LedgerEntryRecord;
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
  const reservePool = state.reserves.find((r) =>
    input.channel === 'XPAYES_VIBAN'
      ? r.channelDomain === 'xpayes.com'
      : r.channelDomain === 'itiscoin.com'
  );

  if (input.action === 'REDEEM' && wallet.asdStableBal < input.amountUsd) {
    throw new Error('ERR_INSUFFICIENT_USDF_BALANCE');
  }

  const delta = input.action === 'MINT' ? input.amountUsd : -input.amountUsd;
  reserveAcc.asdStableBal += delta;
  wallet.asdStableBal += delta;
  wallet.version += 1;
  wallet.updatedAt = new Date().toISOString();

  if (reservePool) {
    reservePool.usdValue += delta;
    reservePool.lastAuditedAt = new Date().toISOString();
  }

  const prevHash = state.entries[0]?.txHash ?? '0x00';
  const debitAccId = input.action === 'MINT' ? reserveAcc.id : wallet.id;
  const creditAccId = input.action === 'MINT' ? wallet.id : reserveAcc.id;

  const entry: LedgerEntryRecord = {
    id: `TX-${Date.now().toString(36).toUpperCase()}`,
    idempotencyKey: input.idempotencyKey,
    txHash: computeChainedTxHash(
      prevHash,
      input.idempotencyKey,
      debitAccId,
      creditAccId,
      input.amountUsd
    ),
    debitAccId,
    creditAccId,
    amount: input.amountUsd,
    tokenType: 'USDF',
    skillCode: null,
    memo: `${input.action === 'MINT' ? '1:1 USDF Mint' : '1:1 USDF Redeem'} (${input.channel})`,
    category: 'FINTECH_RESERVE',
    createdAt: new Date().toISOString(),
  };

  state.processedKeys.add(input.idempotencyKey);
  state.entries.unshift(entry);
  persistLedgerWal(state);
  return { entry, snapshot: getLedgerSnapshot() };
}

export function executeSkillGasBurn(input: SkillGasBurnInput): {
  totalGasConsumed: number;
  burnedGas: number;
  providerGas: number;
  snapshot: LedgerSnapshot;
} {
  const state = getState();
  assertIdempotency(state, input.idempotencyKey);

  const skill = SHINEMIGHT_SKILLS.find((s) => s.code === input.skillCode);
  if (!skill) {
    throw new Error(`ERR_SKILL_NOT_FOUND: ${input.skillCode}`);
  }

  const caller = findOrCreateWallet(
    state,
    input.callerSite,
    input.callerEntity
  );
  const skillsPool = state.accounts.find(
    (a) => a.accountType === 'SKILL_GAS_POOL'
  );
  const burnVault = state.accounts.find(
    (a) => a.accountType === 'TREASURY_BURN'
  );
  if (!skillsPool || !burnVault) {
    throw new Error('ERR_LEDGER_FATAL');
  }

  const totalGasConsumed = Math.round(skill.gasPerUnit * input.units);
  if (caller.asdGasBal < totalGasConsumed) {
    throw new Error('ERR_INSUFFICIENT_UUSDF_BALANCE');
  }

  const burnedGas = Math.round(totalGasConsumed * skill.burnRatio);
  const providerGas = totalGasConsumed - burnedGas;

  caller.asdGasBal -= totalGasConsumed;
  skillsPool.asdGasBal += providerGas;
  burnVault.asdGasBal += burnedGas;
  caller.version += 1;

  const prevHash = state.entries[0]?.txHash ?? '0x00';
  const entry: LedgerEntryRecord = {
    id: `TX-${Date.now().toString(36).toUpperCase()}`,
    idempotencyKey: input.idempotencyKey,
    txHash: computeChainedTxHash(
      prevHash,
      input.idempotencyKey,
      caller.id,
      burnVault.id,
      totalGasConsumed
    ),
    debitAccId: caller.id,
    creditAccId: burnVault.id,
    amount: totalGasConsumed,
    tokenType: 'UUSDF',
    skillCode: skill.code,
    memo: `[${skill.domain}] ${input.units} ${skill.unitLabel} (-${burnedGas} uUSDF burned)`,
    category: skill.category,
    createdAt: new Date().toISOString(),
  };

  state.processedKeys.add(input.idempotencyKey);
  state.entries.unshift(entry);
  persistLedgerWal(state);
  return {
    totalGasConsumed,
    burnedGas,
    providerGas,
    snapshot: getLedgerSnapshot(),
  };
}
