import { describe, expect, it } from 'vitest';
import { UsdfReserveEngine } from '../usdfirm/reserve-engine';
import { UsdfMintBurnEngine } from '../usdfirm/mint-burn-engine';
import { UsdfMultiSigTimelock } from '../usdfirm/multisig-timelock';
import { XPayesBridge } from '../usdfirm/bridges/xpayes-bridge';
import { ItisDealBridge } from '../usdfirm/bridges/itisdeal-bridge';
import { UsdfRiskMonitor } from '../usdfirm/risk-monitor';
import { UsdfAuditTrail } from '../usdfirm/audit-trail';

describe('USDFirm Protocol Engine Core Suite', () => {
  it('calculates Proof-of-Reserves, overcollateralization, and Merkle root', () => {
    const reserveEngine = UsdfReserveEngine.getInstance();
    const attestation = reserveEngine.generatePoRAttestation(101);

    expect(attestation.totalReservesUsd).toBeGreaterThan(120_000_000);
    expect(attestation.reserveRatioPct).toBeGreaterThanOrEqual(100.0);
    expect(attestation.merkleRoot.startsWith('0x')).toBe(true);
    expect(attestation.merkleRoot.length).toBe(66);
    expect(attestation.isCompliant).toBe(true);
    expect(attestation.chainlinkRoundData.roundId).toBe(101);
  });

  it('handles segregated minting with timelock threshold and blacklist checks', () => {
    const engine = UsdfMintBurnEngine.getInstance();
    const reserveEngine = UsdfReserveEngine.getInstance();
    const supplyBefore = reserveEngine.getCirculatingUsdf();

    // 1. Regular mint < $1M executes immediately
    const order1 = engine.requestMint({
      partnerSite: 'xpayes.com',
      requesterPubkey: '0x1111111111111111111111111111111111111111',
      amountUsd: 250_000,
      xpayesRef: 'XPAY-TEST-01',
    });
    expect(order1.status).toBe('EXECUTED');
    expect(order1.txHash?.startsWith('0x')).toBe(true);
    expect(reserveEngine.getCirculatingUsdf()).toBe(supplyBefore + 250_000);

    // 2. Large mint >= $1M triggers 24h Timelock Queue
    const order2 = engine.requestMint({
      partnerSite: 'institutional_direct',
      requesterPubkey: '0x2222222222222222222222222222222222222222',
      amountUsd: 1_500_000,
    });
    expect(order2.status).toBe('QUEUED_TIMELOCK');
    expect(order2.timelockEta).toBeDefined();

    // 3. OFAC blacklist rejection
    expect(() =>
      engine.requestMint({
        partnerSite: 'institutional_direct',
        requesterPubkey: '0x000000000000000000000000000000000000dead',
        amountUsd: 50_000,
      })
    ).toThrow(/COMPLIANCE_BLOCKED/);

    // 4. Burn reduces circulation
    const burnOrder = engine.requestBurn({
      partnerSite: 'xpayes.com',
      requesterPubkey: '0x1111111111111111111111111111111111111111',
      amountUsdf: 100_000,
      burnAuthorizationSignature: 'sig_ok',
    });
    expect(burnOrder.status).toBe('EXECUTED');
  });

  it('enforces 3-of-5 multi-sig confirmations and timelock delays', () => {
    const timelock = UsdfMultiSigTimelock.getInstance();
    const prop = timelock.proposeOperation(
      'UPGRADE_TREASURY_CUSTODIAN_FEED',
      timelock.signers[0],
      86400
    );

    expect(prop.confirmCount).toBe(1);
    expect(prop.status).toBe('QUEUED');

    // Confirm by signer 2
    timelock.confirmProposal(prop.proposalId, timelock.signers[1]);
    expect(prop.confirmCount).toBe(2);

    // Confirm by signer 3 (reaching 3-of-5 quorum)
    timelock.confirmProposal(prop.proposalId, timelock.signers[2]);
    expect(prop.confirmCount).toBe(3);

    // Cannot execute before timelock expires
    expect(() =>
      timelock.executeProposal(prop.proposalId, timelock.signers[0])
    ).toThrow(/TIMELOCK_STILL_LOCKED/);
  });

  it('authenticates xpayes.com gateway settlements via HMAC-SHA256', () => {
    const bridge = XPayesBridge.getInstance();
    const payload = {
      merchantId: 'MCH-SINGAPORE-091',
      depositCurrency: 'USD' as const,
      depositAmount: 75_000,
      usdfPayoutAmount: 75_000,
      vIbanAccount: 'GB88XPAY889922001',
      paymentRef: 'PAY-XPAY-20261103-99',
      timestamp: new Date().toISOString(),
    };

    const validSig = bridge.generateSignatureForTesting(payload);
    const result = bridge.processSettlement(payload, validSig);
    expect(result.status).toBe('SETTLED');
    expect(result.txHash.startsWith('0x')).toBe(true);

    // Replay attack rejection
    expect(() => bridge.processSettlement(payload, validSig)).toThrow(
      /XPAYES_IDEMPOTENCY_CONFLICT/
    );
  });

  it('segregates itisdeal.com exchange risk with hard buffer caps', () => {
    const bridge = ItisDealBridge.getInstance();
    const req = {
      poolId: 'USDF_USDT_AMM_POOL_01',
      orderType: 'MINT_LIQUIDITY' as const,
      amountUsdf: 1_000_000,
      marketMakerId: 'MM-JUMP-CRYPTO-88',
      exchangeNonce: 99881,
      vaultDepositRef: 'DEPOSIT-VAULT-77',
    };

    const validSig = bridge.generateSignatureForTesting(req);
    const result = bridge.executeLiquidityOperation(req, validSig);
    expect(result.status).toBe('COMMITTED');

    const status = bridge.getSegregatedBufferStatus();
    expect(status.isSegregated).toBe(true);
    expect(status.allocated).toBeLessThanOrEqual(status.maxCap);
  });

  it('monitors risk telemetry and verifies audit trail chain integrity', () => {
    const risk = UsdfRiskMonitor.getInstance();
    const telemetry = risk.getTelemetry();
    expect(telemetry.reserveRatioPct).toBeGreaterThanOrEqual(100.0);
    expect(telemetry.isExchangeRiskSegregated).toBe(true);

    const audit = UsdfAuditTrail.getInstance();
    expect(audit.verifyIntegrity()).toBe(true);
  });
});
