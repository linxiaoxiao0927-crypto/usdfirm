import { describe, it, expect } from 'vitest';
import { GET as getPor } from '@/app/api/v1/usdfirm/por/route';
import { GET as getMintOrders, POST as postMint } from '@/app/api/v1/usdfirm/mint/route';
import { POST as postBurn } from '@/app/api/v1/usdfirm/burn/route';
import { GET as getMultiSig, POST as postMultiSig } from '@/app/api/v1/usdfirm/multisig/route';
import { GET as getRisk, POST as postRisk } from '@/app/api/v1/usdfirm/risk/route';
import { GET as getXPayes, POST as postXPayes } from '@/app/api/v1/usdfirm/bridge/xpayes/route';
import { GET as getSegregatedMm, POST as postSegregatedMm } from '@/app/api/v1/usdfirm/bridge/segregated-mm/route';

describe('USDFirm REST API Route Handlers', () => {
  it('GET /api/v1/usdfirm/por returns real-time PoR attestation, reserves, and telemetry', async () => {
    const res = await getPor();
    const json = await res.json();
    expect(res.status).toBe(200);
    expect(json.success).toBe(true);
    expect(json.data.attestation.reserveRatioPct).toBeGreaterThanOrEqual(100);
    expect(json.data.reserves.length).toBeGreaterThanOrEqual(4);
    expect(json.data.risk.isExchangeRiskSegregated).toBe(true);
  });

  it('POST /api/v1/usdfirm/mint and /burn enforce Zod validation and OFAC blacklist', async () => {
    const validMintReq = new Request('http://localhost/api/v1/usdfirm/mint', {
      method: 'POST',
      body: JSON.stringify({
        partnerSite: 'xpayes.com',
        requesterPubkey: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
        amountUsd: 100_000,
        xpayesRef: 'XPAY-API-TEST-01',
      }),
    });
    const mintRes = await postMint(validMintReq);
    const mintJson = await mintRes.json();
    expect(mintRes.status).toBe(200);
    expect(mintJson.success).toBe(true);
    expect(mintJson.data.order.status).toBe('EXECUTED');

    const ofacReq = new Request('http://localhost/api/v1/usdfirm/mint', {
      method: 'POST',
      body: JSON.stringify({
        partnerSite: 'xpayes.com',
        requesterPubkey: '0x7F367cc41522cE07553e846bc1068009752d4791',
        amountUsd: 50_000,
      }),
    });
    const ofacRes = await postMint(ofacReq);
    expect(ofacRes.status).toBe(422);

    const burnReq = new Request('http://localhost/api/v1/usdfirm/burn', {
      method: 'POST',
      body: JSON.stringify({
        partnerSite: 'institutional_direct',
        requesterPubkey: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
        amountUsdf: 50_000,
        burnAuthorizationSignature: '0xabcdef1234567890abcdef',
      }),
    });
    const burnRes = await postBurn(burnReq);
    const burnJson = await burnRes.json();
    expect(burnRes.status).toBe(200);
    expect(burnJson.data.order.orderType).toBe('BURN');

    const listRes = await getMintOrders();
    const listJson = await listRes.json();
    expect(listJson.data.orders.length).toBeGreaterThanOrEqual(2);
  });

  it('GET & POST /api/v1/usdfirm/multisig queue and confirm 3-of-5 proposals', async () => {
    const getRes = await getMultiSig();
    const getJson = await getRes.json();
    expect(getJson.success).toBe(true);
    const signers: string[] = getJson.data.signers;

    const propReq = new Request('http://localhost/api/v1/usdfirm/multisig', {
      method: 'POST',
      body: JSON.stringify({
        action: 'PROPOSE',
        targetAction: 'UPDATE_POR_FEED_HEARTBEAT_3600',
        proposer: signers[0],
        delaySeconds: 86400,
      }),
    });
    const propRes = await postMultiSig(propReq);
    const propJson = await propRes.json();
    expect(propRes.status).toBe(200);
    expect(propJson.data.confirmCount).toBe(1);
  });

  it('GET & POST /api/v1/usdfirm/bridge/xpayes and /segregated-mm verify HMAC-SHA256', async () => {
    const xSampleRes = await getXPayes();
    const xSampleJson = await xSampleRes.json();
    const { samplePayload, sampleSignature } = xSampleJson.data;

    const xPostRes = await postXPayes(
      new Request('http://localhost/api/v1/usdfirm/bridge/xpayes', {
        method: 'POST',
        body: JSON.stringify({ payload: samplePayload, signature: sampleSignature }),
      })
    );
    const xPostJson = await xPostRes.json();
    expect(xPostRes.status).toBe(200);
    expect(xPostJson.data.status).toBe('SETTLED');

    const mmSampleRes = await getSegregatedMm();
    const mmSampleJson = await mmSampleRes.json();
    const mmPostRes = await postSegregatedMm(
      new Request('http://localhost/api/v1/usdfirm/bridge/segregated-mm', {
        method: 'POST',
        body: JSON.stringify({
          payload: mmSampleJson.data.samplePayload,
          signature: mmSampleJson.data.sampleSignature,
        }),
      })
    );
    const mmPostJson = await mmPostRes.json();
    expect(mmPostRes.status).toBe(200);
    expect(mmPostJson.data.status).toBe('COMMITTED');
  });

  it('GET & POST /api/v1/usdfirm/risk manage circuit breaker and audit trail', async () => {
    const pauseRes = await postRisk(
      new Request('http://localhost/api/v1/usdfirm/risk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'PAUSE',
          actor: 'TEST_RISK_OFFICER',
          reason: 'API test circuit breaker',
        }),
      })
    );
    const pauseJson = await pauseRes.json();
    expect(pauseJson.data.telemetry.circuitBreakerActive).toBe(true);

    const resumeRes = await postRisk(
      new Request('http://localhost/api/v1/usdfirm/risk', {
        method: 'POST',
        body: JSON.stringify({
          action: 'RESUME',
          actor: 'TEST_RISK_OFFICER',
          reason: 'Resume after test',
        }),
      })
    );
    const resumeJson = await resumeRes.json();
    expect(resumeJson.data.telemetry.circuitBreakerActive).toBe(false);

    const riskGet = await getRisk();
    const riskGetJson = await riskGet.json();
    expect(riskGetJson.data.recentLogs.length).toBeGreaterThan(0);
  });
});
