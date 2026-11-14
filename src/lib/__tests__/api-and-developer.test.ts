import { describe, expect, it, beforeEach } from 'vitest';
import { resetLedgerStoreForTesting } from '@/lib/ledger-engine';
import { GET as getLedger } from '@/app/api/v1/ledger/route';
import { POST as postMint } from '@/app/api/v1/mint/route';
import { POST as postSwap } from '@/app/api/v1/swap/route';
import { POST as postFederation } from '@/app/api/v1/federation/route';
import { POST as postChain } from '@/app/api/v1/chain/route';
import {
  GET as getDeveloperAudit,
  POST as postSignPayload,
} from '@/app/api/v1/developer/route';

describe('ASDCoin End-to-End API Routes & Developer HMAC/Audit Suite', () => {
  beforeEach(() => {
    resetLedgerStoreForTesting();
  });

  it('returns T+0 trial balance audit and signs cross-site HMAC payloads', async () => {
    const auditReq = new Request('http://localhost:3000/api/v1/developer');
    const auditRes = await getDeveloperAudit(auditReq);
    const auditJson = await auditRes.json();

    expect(auditRes.status).toBe(200);
    expect(auditJson.success).toBe(true);
    expect(auditJson.data.trialBalance.isBalanced).toBe(true);
    expect(auditJson.data.sdkCredentials.length).toBeGreaterThanOrEqual(6);

    // Generate real HMAC-SHA256 signature for sofayes.com -> idles.site
    const signReq = new Request('http://localhost:3000/api/v1/developer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceSite: 'sofayes.com',
        targetSite: 'idles.site',
        eventType: 'COMPUTE_LEASE_PAYOUT',
        amountAsdS: 800,
        idempotencyKey: 'idem-e2e-hmac-001',
      }),
    });
    const signRes = await postSignPayload(signReq);
    const signJson = await signRes.json();

    expect(signRes.status).toBe(200);
    expect(signJson.success).toBe(true);
    expect(signJson.data.hmacSignature.startsWith('sha256=')).toBe(true);

    // Feed signed payload into /api/v1/federation
    const fedReq = new Request('http://localhost:3000/api/v1/federation', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        sourceSite: 'sofayes.com',
        targetSite: 'idles.site',
        eventType: 'COMPUTE_LEASE_PAYOUT',
        amountAsdS: 800,
        hmacSignature: signJson.data.hmacSignature,
        payloadSummary: 'E2E 真实 HMAC 签名跨站算力结算',
        idempotencyKey: 'idem-e2e-hmac-001',
      }),
    });
    const fedRes = await postFederation(fedReq);
    const fedJson = await fedRes.json();

    expect(fedRes.status).toBe(200);
    expect(fedJson.success).toBe(true);
    expect(fedJson.data.snapshot.trialBalanceOk).toBe(true);
  });

  it('validates golden-route error contracts on invalid payloads and executes mint/swap/chain', async () => {
    const badMint = new Request('http://localhost:3000/api/v1/mint', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ action: 'MINT', amountUsd: -50 }),
    });
    const badRes = await postMint(badMint);
    const badJson = await badRes.json();
    expect(badRes.status).toBe(400);
    expect(badJson.success).toBe(false);
    expect(badJson.error.code).toBe('VALIDATION_ERROR');

    const swapReq = new Request('http://localhost:3000/api/v1/swap', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ownerSite: 'sofayes.com',
        ownerEntity: 'ENT-SOFA-CORE',
        direction: 'ASD_S_TO_G',
        amount: 50,
        idempotencyKey: 'idem-e2e-swap-01',
      }),
    });
    const swapRes = await postSwap(swapReq);
    expect(swapRes.status).toBe(200);

    const chainReq = new Request('http://localhost:3000/api/v1/chain', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetSite: 'sofayes.com' }),
    });
    const chainRes = await postChain(chainReq);
    const chainJson = await chainRes.json();
    expect(chainRes.status).toBe(200);
    expect(chainJson.data.proof.verified).toBe(true);

    const ledgerRes = await getLedger(
      new Request('http://localhost:3000/api/v1/ledger')
    );
    expect(ledgerRes.status).toBe(200);
  });
});
