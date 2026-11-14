import { describe, expect, it, beforeEach } from 'vitest';
import {
  resetLedgerStoreForTesting,
  getLedgerSnapshot,
} from '@/lib/ledger-engine';
import {
  executeTokenSwap,
  executeFederationEvent,
} from '@/lib/federation-engine';

describe('ASDCoin Cross-Site Federation Bus & Atomic Flash Swap', () => {
  beforeEach(() => {
    resetLedgerStoreForTesting();
  });

  it('exposes the ShineMight OS cross-site federation node matrix', () => {
    const snap = getLedgerSnapshot();
    expect(snap.federationNodes.length).toBeGreaterThanOrEqual(16);
    const domains = snap.federationNodes.map((n) => n.domain);
    expect(domains).toContain('sofayes.com');
    expect(domains).toContain('xpayes.com');
    expect(domains).toContain('itiscoin.com');
    expect(domains).toContain('setupyes.com');
    expect(domains).toContain('taxyesai.com');
    expect(domains).toContain('uptoyes.com');
    expect(domains).toContain('hmm.sale');
    expect(domains).toContain('dezi.life');
  });

  it('atomically swaps ASD-S to ASD-G (1:1,000,000) and preserves trial balance', () => {
    const before = getLedgerSnapshot();
    const sofaBefore = before.accounts.find(
      (a) => a.ownerSite === 'sofayes.com'
    )!;

    const swapRes = executeTokenSwap({
      ownerSite: 'sofayes.com',
      ownerEntity: 'ENT-SOFA-CORE',
      direction: 'ASD_S_TO_G',
      amount: 100,
      idempotencyKey: 'idem-swap-s2g-001',
    });

    const sofaAfter = swapRes.snapshot.accounts.find(
      (a) => a.ownerSite === 'sofayes.com'
    )!;
    expect(sofaAfter.asdStableBal).toBe(sofaBefore.asdStableBal - 100);
    expect(sofaAfter.asdGasBal).toBe(
      sofaBefore.asdGasBal + 100 * 1_000_000
    );
    expect(swapRes.snapshot.trialBalanceOk).toBe(true);
  });

  it('verifies HMAC signature and settles cross-project federation events', () => {
    expect(() =>
      executeFederationEvent({
        sourceSite: 'sofayes.com',
        targetSite: 'idles.site',
        eventType: 'COMPUTE_LEASE_PAYOUT',
        amountAsdS: 1200,
        hmacSignature: 'bad-unsigned-token',
        payloadSummary: '60fps 词级对齐与声音克隆 GPU 算力集群结算',
        idempotencyKey: 'idem-fed-bad-001',
      })
    ).toThrow(/INVALID_HMAC_SIGNATURE/);

    const validRes = executeFederationEvent({
      sourceSite: 'sofayes.com',
      targetSite: 'idles.site',
      eventType: 'COMPUTE_LEASE_PAYOUT',
      amountAsdS: 1200,
      hmacSignature: 'sha256=9f8e7d6c5b4a3210fedcba9876543210',
      payloadSummary: 'sofayes.com -> idles.site 60fps 声音克隆算力租用清算',
      idempotencyKey: 'idem-fed-ok-001',
    });

    expect(validRes.entry.amount).toBe(1200);
    expect(validRes.snapshot.trialBalanceOk).toBe(true);
  });
});
