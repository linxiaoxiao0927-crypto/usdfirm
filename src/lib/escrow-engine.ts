import type {
  LedgerEntryRecord,
  FourFlowEscrowRecord,
  LedgerSnapshot,
} from '@/types/ledger';
import type {
  EscrowCreateInput,
  EscrowSettleInput,
} from '@/lib/schemas/ledger-schemas';
import {
  getState,
  assertIdempotency,
  findOrCreateWallet,
  persistLedgerWal,
} from '@/lib/ledger-store';
import { getLedgerSnapshot } from '@/lib/ledger-engine';
import { computeChainedTxHash } from '@/lib/crypto-chain-engine';

export function executeEscrowCreate(input: EscrowCreateInput): {
  escrow: FourFlowEscrowRecord;
  snapshot: LedgerSnapshot;
} {
  const state = getState();
  assertIdempotency(state, input.idempotencyKey);

  if (state.escrows.some((e) => e.orderNo === input.orderNo)) {
    throw new Error(`ERR_ESCROW_DUPLICATE: ${input.orderNo}`);
  }

  const buyer = findOrCreateWallet(
    state,
    input.sourceSite,
    input.buyerEntity
  );
  const escrowVault = state.accounts.find(
    (a) => a.accountType === 'ESCROW_VAULT'
  );
  if (!escrowVault) {
    throw new Error('ERR_LEDGER_FATAL');
  }
  if (buyer.asdStableBal < input.totalAmountAsd) {
    throw new Error('ERR_INSUFFICIENT_USDF_BALANCE');
  }

  buyer.asdStableBal -= input.totalAmountAsd;
  escrowVault.asdStableBal += input.totalAmountAsd;

  const escrow: FourFlowEscrowRecord = {
    id: `ESC-${Date.now().toString(36).toUpperCase()}`,
    orderNo: input.orderNo,
    sourceSite: input.sourceSite,
    buyerEntity: input.buyerEntity,
    totalAmountAsd: input.totalAmountAsd,
    status: 'LOCKED_IN_TRANSIT',
    setupyesEntity: input.setupyesEntity,
    taxyesRouteId: input.taxyesRouteId,
    xpayesPayment: input.xpayesPayment,
    uptoyesWaybill: input.uptoyesWaybill ?? null,
    splitRules: [
      {
        recipientSite: input.sourceSite,
        roleLabel: '主商品/服务履约款',
        percentage: 78,
      },
      {
        recipientSite: 'uptoyes.com',
        roleLabel: '包税集运与末端无人机派送',
        percentage: 12,
      },
      {
        recipientSite: 'taxyesai.com',
        roleLabel: '跨国节税与1039合规托管',
        percentage: 8,
      },
      {
        recipientSite: 'itiscoin.com',
        roleLabel: '协议清算财资留存',
        percentage: 2,
      },
    ],
    settledAt: null,
    createdAt: new Date().toISOString(),
  };

  state.processedKeys.add(input.idempotencyKey);
  state.escrows.unshift(escrow);
  persistLedgerWal(state);
  return { escrow, snapshot: getLedgerSnapshot() };
}

export function executeEscrowSettlement(input: EscrowSettleInput): {
  escrow: FourFlowEscrowRecord;
  splitEntries: LedgerEntryRecord[];
  snapshot: LedgerSnapshot;
} {
  const state = getState();
  assertIdempotency(state, input.idempotencyKey);

  const escrow = state.escrows.find((e) => e.orderNo === input.orderNo);
  if (!escrow) {
    throw new Error(`ERR_ESCROW_NOT_FOUND: ${input.orderNo}`);
  }
  if (escrow.status === 'SETTLED_SPLIT') {
    throw new Error(`ERR_ESCROW_ALREADY_SETTLED: ${input.orderNo}`);
  }

  const escrowVault = state.accounts.find(
    (a) => a.accountType === 'ESCROW_VAULT'
  );
  const skillsPool = state.accounts.find(
    (a) => a.accountType === 'SKILL_GAS_POOL'
  );
  if (!escrowVault || !skillsPool) {
    throw new Error('ERR_LEDGER_FATAL');
  }

  escrow.setupyesEntity = input.setupyesEntity;
  escrow.taxyesRouteId = input.taxyesRouteId;
  escrow.xpayesPayment = input.xpayesPayment;
  escrow.uptoyesWaybill = input.uptoyesWaybill;
  escrow.status = 'SETTLED_SPLIT';
  escrow.settledAt = new Date().toISOString();

  escrowVault.asdStableBal -= escrow.totalAmountAsd;
  skillsPool.asdStableBal += escrow.totalAmountAsd;

  const prevHash = state.entries[0]?.txHash ?? '0x00';
  const splitEntries: LedgerEntryRecord[] = escrow.splitRules.map(
    (rule, idx) => {
      const splitAmt = Number(
        ((escrow.totalAmountAsd * rule.percentage) / 100).toFixed(2)
      );
      const idemKey = `${input.idempotencyKey}-${idx}`;
      return {
        id: `TX-SPLIT-${Date.now().toString(36).toUpperCase()}-${idx}`,
        idempotencyKey: idemKey,
        txHash: computeChainedTxHash(
          prevHash,
          idemKey,
          escrowVault.id,
          skillsPool.id,
          splitAmt
        ),
        debitAccId: escrowVault.id,
        creditAccId: skillsPool.id,
        amount: splitAmt,
        tokenType: 'USDF',
        skillCode: 'SKILL_03_UPTOYES',
        memo: `[四流合一分润] ${escrow.orderNo} -> ${rule.recipientSite} (${rule.roleLabel} ${rule.percentage}%)`,
        category: 'RETAIL_BRANDS',
        createdAt: new Date().toISOString(),
      };
    }
  );

  state.processedKeys.add(input.idempotencyKey);
  state.entries.unshift(...splitEntries);
  persistLedgerWal(state);

  return {
    escrow,
    splitEntries,
    snapshot: getLedgerSnapshot(),
  };
}
