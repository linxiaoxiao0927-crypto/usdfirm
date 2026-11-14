import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it, vi, afterEach } from 'vitest';
import {
  USDFIRM_ERROR_DICTIONARY,
  USDFIRM_UI_COPY,
  resolveUsdfirmError,
} from '@/lib/usdfirm/i18n';
import { createInitialFederationNodes } from '@/lib/federation-seed';
import {
  mapWorkerSnapshotToBundle,
  type WorkerSnapshotResponse,
} from '@/lib/usdfirm/worker-client';
import { POST as postMint } from '@/app/api/v1/usdfirm/mint/route';
import { POST as postBurn } from '@/app/api/v1/usdfirm/burn/route';
import { POST as postMultiSig } from '@/app/api/v1/usdfirm/multisig/route';
import { POST as postXPayes } from '@/app/api/v1/usdfirm/bridge/xpayes/route';
import { POST as postSegregatedMm } from '@/app/api/v1/usdfirm/bridge/segregated-mm/route';
import { GET as getTrace } from '@/app/api/v1/usdfirm/trace/route';
import { POST as postFirewallCheck } from '@/app/api/v1/usdfirm/firewall-check/route';

function collectSourceFiles(dir: string): string[] {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  const files: string[] = [];
  for (const entry of entries) {
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      if (entry.name === '__tests__') continue;
      files.push(...collectSourceFiles(full));
    } else if (/\.(ts|tsx)$/.test(entry.name)) {
      files.push(full);
    }
  }
  return files;
}

describe('USDFirm Bilingual i18n, Legacy Purge & Worker Contracts', () => {
  afterEach(() => {
    vi.restoreAllMocks();
    delete process.env.USDFIRM_FORCE_LIVE_WORKER;
  });

  it('purges all legacy ASD-S, ASD-G, and ASDCoin strings across src/lib/, src/components/, and src/app/', () => {
    const targets = ['src/lib', 'src/components', 'src/app'];
    const files = targets.flatMap((rel) =>
      collectSourceFiles(path.resolve(process.cwd(), rel))
    );
    expect(files.length).toBeGreaterThan(20);

    const violations: string[] = [];
    for (const file of files) {
      const content = fs.readFileSync(file, 'utf8');
      if (
        /ASD-S|ASD-G|ASD_S_TO_G|asdcoin_escrow|\.asdcoin-wal\.json|ASDCoin/.test(
          content
        )
      ) {
        violations.push(path.relative(process.cwd(), file));
      }
    }
    expect(violations).toEqual([]);
  });

  it('enforces Web2.5 compliance firewall for itiscoin.com federation seed (non-exchange)', () => {
    const nodes = createInitialFederationNodes();
    const itisNode = nodes.find((n) => n.domain === 'itiscoin.com');
    expect(itisNode).toBeDefined();
    expect(itisNode!.brandName).not.toMatch(/交易所/);
    expect(itisNode!.roleSummary).toContain('≠ 交易所');
    expect(itisNode!.roleSummaryEn).toContain('non-exchange');
    expect(itisNode!.brandNameEn).toContain('Treasury Yield & Governance Hub');
  });

  it('fixes BridgeStatusPanel customPayload submission bug', () => {
    const bridgePanelPath = path.resolve(
      process.cwd(),
      'src/components/usdfirm/BridgeStatusPanel.tsx'
    );
    const content = fs.readFileSync(bridgePanelPath, 'utf8');
    expect(content).toContain('payload: customPayload');
    expect(content).not.toContain('payload: sampleJson.data.samplePayload');
  });

  it('covers all key Worker ERR_* codes cleanly in zh and en without cross-language leakage', () => {
    const requiredCodes = [
      'ERR_INVALID_HMAC_SIGNATURE',
      'ERR_MISSING_CLEARING_HEADERS',
      'ERR_TIMESTAMP_EXPIRED',
      'ERR_CLEARING_SECRET_NOT_CONFIGURED',
      'ERR_REPLAY_DETECTED',
      'ERR_BUFFER_CAP_EXCEEDED',
      'ERR_BUFFER_INSUFFICIENT_ALLOCATED',
      'ERR_TIMELOCK_ACTIVE',
      'ERR_INVALID_AMOUNT',
      'ERR_INVALID_USDF_AMOUNT',
      'ERR_INVALID_PAYLOAD',
      'ERR_EXCEEDS_CIRCULATING_SUPPLY',
      'ERR_RESERVE_UNDERCOLLATERALIZED',
      'ERR_PROPOSAL_NOT_FOUND',
      'ERR_PROPOSAL_ALREADY_EXECUTED',
      'ERR_MULTISIG_QUORUM_NOT_MET',
      'ERR_ROUTE_NOT_FOUND',
      'ERR_BAD_WS_MESSAGE',
      'ERR_WORKER_UNREACHABLE',
      'ERR_GOVERNANCE_ONLY',
      'ERR_COMPLIANCE_FIREWALL_USE_SEGREGATED_BRIDGE',
      'ERR_VALIDATION_FAILED',
      'ERR_LEDGER_SYNC_FAILED',
      'ERR_INSUFFICIENT_USDF_BALANCE',
      'ERR_INSUFFICIENT_UUSDF_BALANCE',
      'ERR_INSUFFICIENT_CIRCULATING',
    ];

    for (const code of requiredCodes) {
      expect(USDFIRM_ERROR_DICTIONARY[code]).toBeDefined();

      const zhMsg = resolveUsdfirmError(code, 'Raw English Error Fallback', 'zh');
      expect(zhMsg.length).toBeGreaterThan(4);
      expect(zhMsg).not.toContain('Raw English Error Fallback');
      expect(/[\u4e00-\u9fff]/.test(zhMsg)).toBe(true);

      const enMsg = resolveUsdfirmError(code, '原始中文异常信息', 'en');
      expect(enMsg.length).toBeGreaterThan(8);
      expect(enMsg).not.toContain('原始中文异常信息');
      expect(/[\u4e00-\u9fff]/.test(enMsg)).toBe(false);
    }

    // Embedded sub-code extraction under generic wrapper
    const embeddedZh = resolveUsdfirmError(
      'POLICY_REJECTED',
      'COMPLIANCE_BLOCKED: Sanctioned address',
      'zh'
    );
    expect(embeddedZh).toContain('OFAC');
    expect(embeddedZh).not.toContain('Sanctioned address');

    // UI dictionary parity & strict language check
    expect(Object.keys(USDFIRM_UI_COPY.zh)).toEqual(Object.keys(USDFIRM_UI_COPY.en));
    const enJson = JSON.stringify(USDFIRM_UI_COPY.en);
    expect(/[\u4e00-\u9fff]/.test(enJson)).toBe(false);
  });

  it('maps usdfirm-rt-protocol DO snapshot accurately into UsdfirmProtocolBundle', () => {
    const workerSnap: WorkerSnapshotResponse = {
      ok: true,
      service: 'usdfirm-rt-protocol',
      domain: 'usdfirm.com',
      isolation: 'COMPLIANCE_FIREWALL_ENFORCED',
      attestation: {
        epoch: 143,
        merkleRoot: '0x' + 'a'.repeat(64),
        totalReservesUsd: 173_505_000,
        circulatingUsdf: 168_505_000,
        surplusUsd: 5_000_000,
        backingRatioPct: 102.97,
        weightedYieldBps: 454,
        pegUsd: 1,
        status: 'OVERCOLLATERALIZED',
        attestedAt: 1794670884249,
      },
      reserves: [
        {
          id: 'RSV-TBILL',
          name_zh: '短期美国国债 T-Bills (0-3M)',
          name_en: 'US Treasury Bills (0-3M)',
          custodian: 'BlackRock / BNY Mellon',
          asset_class: 'T-Bills',
          amount_usd: 82_000_000,
          yield_bps: 485,
          updated_at: 1794669820537,
          weight_pct: 47.26,
        },
      ],
      orders: [
        {
          id: 'ORD-XP-1',
          order_type: 'ONRAMP_MINT',
          source_module: 'xpayes.com',
          counterparty: 'xpayes:default (E2E)',
          fiat_currency: 'USD',
          fiat_amount: 5000,
          usdf_amount: 5000,
          tx_hash: '0x' + 'b'.repeat(64),
          merkle_root: '0x' + 'c'.repeat(64),
          status: 'SETTLED',
          trace_id: 'trc_e2e_1',
          created_at: 1794670425115,
        },
      ],
      proposals: [
        {
          id: 'PROP-MS-001',
          action: 'MINT_TREASURY_TRANCHE',
          title_zh: '增发 $2,500,000 USDF',
          title_en: 'Authorize $2.5M USDF Tranche',
          amount_usd: 2_500_000,
          proposer: 'Custody-SG-HSM-01',
          required_confirmations: 3,
          timelock_until: 1794669819537,
          status: 'PENDING',
          trace_id: 'trc_prop_001',
          created_at: 1794666220537,
          approvals: ['Custody-SG-HSM-01', 'Treasury-CH-HSM-02'],
        },
      ],
      signers: ['Custody-SG-HSM-01', 'Treasury-CH-HSM-02', 'Audit-NY-Observer-03'],
      requiredConfirmations: 3,
      bufferStatus: { allocated: 8_500_100, maxCap: 20_000_000, isSegregated: true },
      buffers: [
        {
          module_id: 'segregated_mm',
          allocated_usdf: 8_500_100,
          max_cap_usdf: 20_000_000,
          is_segregated: 1,
          updated_at: 1794670469263,
        },
      ],
      telemetry: {
        backingRatioPct: 102.97,
        pegDeviationBps: 1,
        circulatingUsdf: 168_505_000,
        segregatedBufferUtilizationPct: 42.5,
        riskLevel: 'NOMINAL',
        firewallMode: 'STRICT_SEGREGATION',
      },
      auditLogs: [
        {
          id: 'AUD-1',
          category: 'XPAYES_ONRAMP_MINT',
          actor: 'xpayes.com',
          summary_zh: 'XPayes 法币清算 -> 铸造 5,000 USDF',
          summary_en: 'XPayes Fiat Settlement -> Minted 5,000 USDF',
          tx_hash: '0x' + 'd'.repeat(64),
          trace_id: 'trc_e2e_1',
          created_at: 1794670425115,
        },
      ],
      traces: [
        {
          id: 'TRC-1',
          trace_id: 'trc_e2e_1',
          hop_seq: 2,
          caller: 'xpayes.com',
          receiver: 'usdfirm.com',
          action: 'ONRAMP_MINT',
          amount: 5000,
          asset: 'USDF',
          status: 'SETTLED',
          receipt_hash: '0x' + 'e'.repeat(64),
          meta_json: '{}',
          created_at: 1794670425115,
        },
      ],
      onlineClients: 2,
      serverTs: 1794670896190,
    };

    const bundle = mapWorkerSnapshotToBundle(workerSnap);
    expect(bundle.attestation.roundId).toBe(143);
    expect(bundle.attestation.totalReservesUsd).toBe(173_505_000);
    expect(bundle.reserves[0].nameZh).toContain('短期美国国债');
    expect(bundle.proposals[0].confirmCount).toBe(2);
    expect(bundle.bufferStatus.allocated).toBe(8_500_100);
    expect(bundle.bufferStatus.maxCap).toBe(20_000_000);
    expect(bundle.onlineClients).toBe(2);
    expect(bundle.traces?.length).toBe(1);
  });

  it('enforces API validation and bridge schemas across mint, burn, multisig, and bridges', async () => {
    const badMint = await postMint(
      new Request('http://localhost/api/v1/usdfirm/mint', {
        method: 'POST',
        body: JSON.stringify({
          partnerSite: 'xpayes.com',
          requesterPubkey: 'not-an-evm-address',
          amountUsd: -10,
        }),
      })
    );
    expect(badMint.status).toBe(400);
    expect((await badMint.json()).error.code).toBe('VALIDATION_ERROR');

    // Enforce $20M segregated firewall: reject unauthorized external desk on direct /api/v1/usdfirm/mint
    const firewallMint = await postMint(
      new Request('http://localhost/api/v1/usdfirm/mint', {
        method: 'POST',
        body: JSON.stringify({
          partnerSite: 'external_exchange_desk',
          requesterPubkey: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
          amountUsd: 1_000_000,
        }),
      })
    );
    const firewallMintJson = await firewallMint.json();
    expect(firewallMint.status).toBe(403);
    expect(firewallMintJson.success).toBe(false);
    expect(firewallMintJson.error.errorCode).toBe(
      'ERR_COMPLIANCE_FIREWALL_USE_SEGREGATED_BRIDGE'
    );

    const badBurn = await postBurn(
      new Request('http://localhost/api/v1/usdfirm/burn', {
        method: 'POST',
        body: JSON.stringify({
          partnerSite: 'xpayes.com',
          requesterPubkey: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
          amountUsdf: 100,
          burnAuthorizationSignature: 'short',
        }),
      })
    );
    expect(badBurn.status).toBe(400);

    const badMulti = await postMultiSig(
      new Request('http://localhost/api/v1/usdfirm/multisig', {
        method: 'POST',
        body: JSON.stringify({
          action: 'CONFIRM',
          proposalId: 'PROP-MS-001',
          signer: 'x',
        }),
      })
    );
    expect(badMulti.status).toBe(400);

    const badXpayes = await postXPayes(
      new Request('http://localhost/api/v1/usdfirm/bridge/xpayes', {
        method: 'POST',
        body: JSON.stringify({
          payload: {
            merchantId: 'M1',
            depositCurrency: 'JPY',
            depositAmount: -5,
            usdfPayoutAmount: 0,
            vIbanAccount: '12',
            paymentRef: 'x',
            timestamp: 'now',
          },
          signature: 'invalid_no_prefix',
        }),
      })
    );
    expect(badXpayes.status).toBe(400);

    const badMm = await postSegregatedMm(
      new Request('http://localhost/api/v1/usdfirm/bridge/segregated-mm', {
        method: 'POST',
        body: JSON.stringify({
          payload: {
            poolId: 'p',
            orderType: 'UNKNOWN',
            amountUsdf: -1,
            marketMakerId: 'a',
            exchangeNonce: -5,
            vaultDepositRef: 'no',
          },
          signature: 'bad',
        }),
      })
    );
    expect(badMm.status).toBe(400);
  });

  it('verifies firewall self-check (HTTP 401 ERR_INVALID_HMAC_SIGNATURE) and trace proxy with cache no-store', async () => {
    const fetchSpy = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input, init) => {
        expect(init?.cache).toBe('no-store');
        const url = String(input);
        if (url.includes('/api/bridge/xpayes-settlement')) {
          return new Response(
            JSON.stringify({ ok: false, errorCode: 'ERR_INVALID_HMAC_SIGNATURE' }),
            { status: 401, headers: { 'Content-Type': 'application/json' } }
          );
        }
        if (url.includes('/api/trace')) {
          return new Response(
            JSON.stringify({
              ok: true,
              service: 'usdfirm-rt-protocol',
              domain: 'usdfirm.com',
              traces: [
                {
                  id: 'TRC-TEST-1',
                  trace_id: 'trc_e2e_1794670409',
                  hop_seq: 2,
                  caller: 'xpayes.com',
                  receiver: 'usdfirm.com',
                  action: 'ONRAMP_MINT',
                  amount: 5000,
                  asset: 'USDF',
                  status: 'SETTLED',
                  receipt_hash: '0xabc',
                  meta_json: '{}',
                  created_at: 1794670425115,
                },
              ],
            }),
            { status: 200, headers: { 'Content-Type': 'application/json' } }
          );
        }
        return new Response(JSON.stringify({ ok: false, errorCode: 'ERR_ROUTE_NOT_FOUND' }), {
          status: 404,
        });
      });

    const fwRes = await postFirewallCheck();
    const fwJson = await fwRes.json();
    expect(fwRes.status).toBe(200);
    expect(fwJson.success).toBe(true);
    expect(fwJson.data.passed).toBe(true);
    expect(fwJson.data.httpStatus).toBe(401);
    expect(fwJson.data.errorCode).toBe('ERR_INVALID_HMAC_SIGNATURE');

    const traceRes = await getTrace(
      new Request('http://localhost/api/v1/usdfirm/trace?traceId=trc_e2e_1794670409')
    );
    const traceJson = await traceRes.json();
    expect(traceRes.status).toBe(200);
    expect(traceJson.success).toBe(true);
    expect(traceJson.data.traces.length).toBe(1);
    expect(traceJson.data.traces[0].trace_id).toBe('trc_e2e_1794670409');
    expect(fetchSpy).toHaveBeenCalledTimes(2);
  });
});
