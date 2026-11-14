import { createHmac } from 'node:crypto';
import type { LedgerSnapshot } from '@/types/ledger';

export interface SiteSdkCredential {
  siteDomain: string;
  keyId: string;
  maskedSecret: string;
  scopes: string[];
  webhookUrl: string;
}

export interface TrialBalanceAuditReport {
  generatedAt: string;
  assetReserveAsdS: number;
  liabilitiesAndEquityAsdS: number;
  varianceAsdS: number;
  assetReserveAsdG: number;
  liabilitiesAndEquityAsdG: number;
  varianceAsdG: number;
  isBalanced: boolean;
  walPersistenceMode: string;
}

export const SHINEMIGHT_SDK_CREDENTIALS: SiteSdkCredential[] = [
  {
    siteDomain: 'sofayes.com',
    keyId: 'ak_live_sofa_99812a',
    maskedSecret: 'whsec_sofa_****_e81f',
    scopes: ['MINT_READ', 'SKILL_GAS_BURN', 'FEDERATION_DISPATCH'],
    webhookUrl: 'https://sofayes.com/api/webhooks/asdcoin',
  },
  {
    siteDomain: 'xpayes.com',
    keyId: 'ak_live_xpay_77410b',
    maskedSecret: 'whsec_xpay_****_c92a',
    scopes: ['MINT_AUTHORITY', 'REDEEM_SETTLE', 'POR_ATTEST'],
    webhookUrl: 'https://xpayes.com/api/v1/asdcoin-callback',
  },
  {
    siteDomain: 'itiscoin.com',
    keyId: 'ak_live_itis_66301c',
    maskedSecret: 'whsec_itis_****_a10d',
    scopes: ['MINT_AUTHORITY', 'CHAIN_LIQUIDITY_SYNC'],
    webhookUrl: 'https://itiscoin.com/api/v1/vault-sync',
  },
  {
    siteDomain: 'taxyesai.com',
    keyId: 'ak_live_tax_55290d',
    maskedSecret: 'whsec_tax_****_b44e',
    scopes: ['ESCROW_4FLOW_ATTEST', 'SKILL_02_SETTLE'],
    webhookUrl: 'https://taxyesai.com/api/webhooks/clearing',
  },
  {
    siteDomain: 'uptoyes.com',
    keyId: 'ak_live_upto_44180e',
    maskedSecret: 'whsec_upto_****_f73c',
    scopes: ['ESCROW_WAYBILL_PROOF', 'SKILL_03_SETTLE'],
    webhookUrl: 'https://uptoyes.com/api/webhooks/escrow-split',
  },
  {
    siteDomain: 'hmm.sale',
    keyId: 'ak_live_hmm_33070f',
    maskedSecret: 'whsec_hmm_****_d19b',
    scopes: ['ESCROW_CREATE', 'CROSS_MALL_SETTLE'],
    webhookUrl: 'https://hmm.sale/api/webhooks/order-settled',
  },
  {
    siteDomain: 'dezi.life',
    keyId: 'ak_live_dezi_22060g',
    maskedSecret: 'whsec_dezi_****_901a',
    scopes: ['ESCROW_CREATE', 'SUPPLY_CHAIN_SPLIT'],
    webhookUrl: 'https://dezi.life/api/webhooks/asdcoin',
  },
];

export function generateTrialBalanceAudit(
  snapshot: LedgerSnapshot
): TrialBalanceAuditReport {
  const reserveAcc = snapshot.accounts.find(
    (a) => a.accountType === 'ASSET_RESERVE'
  );
  const nonReserve = snapshot.accounts.filter(
    (a) => a.accountType !== 'ASSET_RESERVE'
  );

  const assetReserveAsdS = reserveAcc ? reserveAcc.asdStableBal : 0;
  const liabilitiesAndEquityAsdS = nonReserve.reduce(
    (s, a) => s + a.asdStableBal,
    0
  );
  const varianceAsdS = assetReserveAsdS - liabilitiesAndEquityAsdS;

  const assetReserveAsdG = reserveAcc ? reserveAcc.asdGasBal : 0;
  const liabilitiesAndEquityAsdG = nonReserve.reduce(
    (s, a) => s + a.asdGasBal,
    0
  );
  const varianceAsdG = assetReserveAsdG - liabilitiesAndEquityAsdG;

  return {
    generatedAt: new Date().toISOString(),
    assetReserveAsdS,
    liabilitiesAndEquityAsdS,
    varianceAsdS,
    assetReserveAsdG,
    liabilitiesAndEquityAsdG,
    varianceAsdG,
    isBalanced: varianceAsdS === 0 && varianceAsdG === 0,
    walPersistenceMode: 'LOCAL_JSON_WAL (.asdcoin-wal.json) + PRISMA_SCHEMA',
  };
}

export function computeSiteHmacSignature(input: {
  sourceSite: string;
  targetSite: string;
  eventType: string;
  amountAsdS: number;
  idempotencyKey: string;
}): {
  hmacSignature: string;
  canonicalString: string;
  curlSnippet: string;
} {
  const canonicalString = `${input.sourceSite}|${input.targetSite}|${input.eventType}|${input.amountAsdS}|${input.idempotencyKey}`;
  const secretKey = `shinemight_whsec_${input.sourceSite}_master_key`;
  const digest = createHmac('sha256', secretKey)
    .update(canonicalString, 'utf8')
    .digest('hex');
  const hmacSignature = `sha256=${digest}`;

  const curlSnippet = [
    `curl -X POST https://asdcoin.com/api/v1/federation \\`,
    `  -H "Content-Type: application/json" \\`,
    `  -d '{"sourceSite":"${input.sourceSite}","targetSite":"${input.targetSite}","eventType":"${input.eventType}","amountAsdS":${input.amountAsdS},"hmacSignature":"${hmacSignature}","payloadSummary":"SDK Signed Clearing","idempotencyKey":"${input.idempotencyKey}"}'`,
  ].join('\n');

  return {
    hmacSignature,
    canonicalString,
    curlSnippet,
  };
}
