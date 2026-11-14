import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UsdfMintBurnEngine } from '@/lib/usdfirm/mint-burn-engine';
import {
  USDFIRM_WORKER_URL,
  fetchWorkerState,
  isVitestOffline,
  mapWorkerSnapshotToBundle,
  type WorkerSnapshotResponse,
} from '@/lib/usdfirm/worker-client';
import type { UsdfMintBurnOrderRecord } from '@/lib/usdfirm/types';

export const dynamic = 'force-dynamic';

const OFAC_BLACKLIST = new Set([
  '0x000000000000000000000000000000000000dead',
  '0x7f367cc41522ce07553e846bc1068009752d4791',
]);

const ALLOWED_MINT_PARTNERS = new Set([
  'xpayes.com',
  'institutional_direct',
  'usdfirm.com',
  'hmm.sale',
  'sheng.sale',
  'sofayes.com',
]);

const MintSchema = z.object({
  partnerSite: z.enum([
    'xpayes.com',
    'institutional_direct',
    'usdfirm.com',
    'hmm.sale',
    'sheng.sale',
    'sofayes.com',
  ]),
  requesterPubkey: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'ERR_VALIDATION_FAILED'),
  amountUsd: z.number().positive().max(50_000_000, 'ERR_INVALID_AMOUNT'),
  xpayesRef: z.string().optional(),
  reserveId: z.enum(['RSV-CASH', 'RSV-TBILL']).optional(),
  traceId: z.string().optional(),
});

export async function GET() {
  if (!isVitestOffline()) {
    const live = await fetchWorkerState();
    if (!live.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: live.errorCode,
            errorCode: live.errorCode,
            message: live.errorCode,
          },
        },
        { status: live.status }
      );
    }
    return NextResponse.json(
      { success: true, data: { orders: live.bundle.orders } },
      { status: 200 }
    );
  }

  const orders = UsdfMintBurnEngine.getInstance().getOrders();
  return NextResponse.json({ success: true, data: { orders } }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (typeof body?.partnerSite === 'string' && !ALLOWED_MINT_PARTNERS.has(body.partnerSite)) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'ERR_COMPLIANCE_FIREWALL_USE_SEGREGATED_BRIDGE',
            errorCode: 'ERR_COMPLIANCE_FIREWALL_USE_SEGREGATED_BRIDGE',
            message:
              'External trading desks must use /api/v1/usdfirm/bridge/segregated-mm subject to the $20,000,000 segregated buffer cap',
          },
        },
        { status: 403 }
      );
    }

    const parsed = MintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            errorCode: 'VALIDATION_ERROR',
            message: 'VALIDATION_ERROR',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    if (!isVitestOffline()) {
      if (OFAC_BLACKLIST.has(parsed.data.requesterPubkey.toLowerCase())) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'COMPLIANCE_BLOCKED',
              errorCode: 'COMPLIANCE_BLOCKED',
              message: 'COMPLIANCE_BLOCKED',
            },
          },
          { status: 422 }
        );
      }

      const counterpartyRef = parsed.data.xpayesRef;
      const counterparty = counterpartyRef
        ? `${parsed.data.partnerSite} · ${counterpartyRef}`
        : `${parsed.data.partnerSite} (${parsed.data.requesterPubkey.slice(0, 10)})`;

      const workerRes = await fetch(`${USDFIRM_WORKER_URL}/api/mint`, {
        method: 'POST',
        cache: 'no-store',
        signal: AbortSignal.timeout(7000),
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUsdf: parsed.data.amountUsd,
          counterparty,
          reserveId: parsed.data.reserveId ?? 'RSV-CASH',
          traceId: parsed.data.traceId,
        }),
      });
      const workerJson = (await workerRes.json()) as WorkerSnapshotResponse & {
        queuedMultisig?: boolean;
        proposalId?: string;
        orderId?: string;
        txHash?: string;
        merkleRoot?: string;
        traceId?: string;
        errorCode?: string;
      };

      if (!workerRes.ok || !workerJson.ok) {
        const errCode = workerJson.errorCode || 'ERR_INVALID_PAYLOAD';
        return NextResponse.json(
          {
            success: false,
            error: {
              code: errCode,
              errorCode: errCode,
              message: errCode,
            },
          },
          { status: workerRes.status || 400 }
        );
      }

      const bundle = mapWorkerSnapshotToBundle(workerJson);
      const feeUsd = Number((parsed.data.amountUsd * 0.0005).toFixed(2));
      const matchedOrder = workerJson.orderId
        ? bundle.orders.find((o) => o.orderNo === workerJson.orderId)
        : undefined;

      const order: UsdfMintBurnOrderRecord =
        matchedOrder ?? {
          orderNo: workerJson.proposalId || workerJson.orderId || `ORD-${Date.now()}`,
          orderType: 'MINT',
          partnerSite: parsed.data.partnerSite,
          requesterPubkey: parsed.data.requesterPubkey,
          amountUsd: parsed.data.amountUsd,
          feeUsd,
          status: workerJson.queuedMultisig ? 'QUEUED_TIMELOCK' : 'EXECUTED',
          txHash: workerJson.txHash ?? null,
          merkleRoot: workerJson.merkleRoot ?? null,
          traceId: workerJson.traceId ?? null,
          xpayesRef: parsed.data.xpayesRef ?? null,
          segregatedMmRef: null,
          timelockEta: workerJson.queuedMultisig
            ? new Date(Date.now() + 86400 * 1000).toISOString()
            : null,
          executedAt: workerJson.queuedMultisig ? null : new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

      return NextResponse.json(
        {
          success: true,
          data: {
            order,
            queuedMultisig: Boolean(workerJson.queuedMultisig),
            proposalId: workerJson.proposalId ?? null,
            traceId: workerJson.traceId ?? null,
            bundle,
          },
        },
        { status: workerRes.status === 202 ? 202 : 200 }
      );
    }

    const order = UsdfMintBurnEngine.getInstance().requestMint({
      partnerSite: parsed.data.partnerSite,
      requesterPubkey: parsed.data.requesterPubkey,
      amountUsd: parsed.data.amountUsd,
      xpayesRef: parsed.data.xpayesRef,
    });
    return NextResponse.json({ success: true, data: { order } }, { status: 200 });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : '';
    const isFirewall = rawMsg.includes('ERR_COMPLIANCE_FIREWALL_USE_SEGREGATED_BRIDGE');
    const isComplianceOrRisk =
      rawMsg.includes('COMPLIANCE_BLOCKED') || rawMsg.includes('RISK_');
    const code = isFirewall
      ? 'ERR_COMPLIANCE_FIREWALL_USE_SEGREGATED_BRIDGE'
      : isComplianceOrRisk
        ? 'POLICY_REJECTED'
        : 'INTERNAL_ERROR';
    return NextResponse.json(
      {
        success: false,
        error: {
          code,
          errorCode: code,
          message: code,
        },
      },
      { status: isFirewall ? 403 : isComplianceOrRisk ? 422 : 500 }
    );
  }
}
