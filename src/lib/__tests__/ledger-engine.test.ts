import { describe, expect, it, beforeEach } from 'vitest';
import {
  resetLedgerStoreForTesting,
  getLedgerSnapshot,
  executeMintOrRedeem,
  executeSkillGasBurn,
  executeEscrowSettlement,
  executeEscrowCreate,
} from '@/lib/ledger-engine';

describe('USDFirm Double-Entry & 4-Flow Ledger Engine', () => {
  beforeEach(() => {
    resetLedgerStoreForTesting();
  });

  it('maintains 100%+ reserve ratio and balanced trial ledger on init', () => {
    const snap = getLedgerSnapshot();
    expect(snap.trialBalanceOk).toBe(true);
    expect(snap.reserveRatioPct).toBeGreaterThanOrEqual(100);
    expect(snap.circulatingAsdS).toBeGreaterThan(0);
    expect(snap.skills.length).toBe(6);
  });

  it('mints and redeems USDF 1:1 with USD reserve and enforces idempotency', () => {
    const before = getLedgerSnapshot();
    const res = executeMintOrRedeem({
      action: 'MINT',
      ownerSite: 'sofayes.com',
      ownerEntity: 'ENT-SOFA-CORE',
      amountUsd: 50000,
      channel: 'XPAYES_VIBAN',
      idempotencyKey: 'idem-mint-test-001',
    });

    expect(res.entry.amount).toBe(50000);
    expect(res.snapshot.circulatingAsdS).toBe(
      before.circulatingAsdS + 50000
    );
    expect(res.snapshot.totalReserveUsd).toBe(
      before.totalReserveUsd + 50000
    );
    expect(res.snapshot.trialBalanceOk).toBe(true);

    expect(() =>
      executeMintOrRedeem({
        action: 'MINT',
        ownerSite: 'sofayes.com',
        ownerEntity: 'ENT-SOFA-CORE',
        amountUsd: 50000,
        channel: 'XPAYES_VIBAN',
        idempotencyKey: 'idem-mint-test-001',
      })
    ).toThrow(/IDEMPOTENCY_CONFLICT/);
  });

  it('burns uUSDF for AI Business Skills and splits provider & treasury burn', () => {
    const before = getLedgerSnapshot();
    const burnRes = executeSkillGasBurn({
      callerSite: 'sofayes.com',
      callerEntity: 'ENT-SOFA-CORE',
      skillCode: 'SKILL_06_IDLES',
      units: 100,
      idempotencyKey: 'idem-gas-test-001',
    });

    expect(burnRes.totalGasConsumed).toBeGreaterThan(0);
    expect(burnRes.burnedGas).toBeGreaterThan(0);
    expect(burnRes.providerGas).toBeGreaterThan(0);
    expect(burnRes.burnedGas + burnRes.providerGas).toBe(
      burnRes.totalGasConsumed
    );
    expect(burnRes.snapshot.totalBurnedAsdG).toBe(
      before.totalBurnedAsdG + burnRes.burnedGas
    );
    expect(burnRes.snapshot.trialBalanceOk).toBe(true);
  });

  it('creates and settles 4-Flow Escrow orders with atomic multi-party split', () => {
    const created = executeEscrowCreate({
      orderNo: 'ORD-HMM-20261030-99',
      sourceSite: 'hmm.sale',
      buyerEntity: 'ENT-SOFA-CORE',
      totalAmountAsd: 10000,
      setupyesEntity: 'DID-HK-99281',
      taxyesRouteId: 'TAX-1039-GZ-08',
      xpayesPayment: 'XPAY-TX-778899',
      idempotencyKey: 'idem-escrow-create-01',
    });

    expect(created.escrow.status).toBe('LOCKED_IN_TRANSIT');

    const settled = executeEscrowSettlement({
      orderNo: 'ORD-HMM-20261030-99',
      setupyesEntity: 'DID-HK-99281',
      taxyesRouteId: 'TAX-1039-GZ-08',
      xpayesPayment: 'XPAY-TX-778899',
      uptoyesWaybill: 'UPTO-DRONE-UWB-8821',
      idempotencyKey: 'idem-escrow-settle-01',
    });

    expect(settled.escrow.status).toBe('SETTLED_SPLIT');
    expect(settled.escrow.uptoyesWaybill).toBe('UPTO-DRONE-UWB-8821');
    expect(settled.splitEntries.length).toBe(4);
    expect(settled.snapshot.trialBalanceOk).toBe(true);
  });
});
