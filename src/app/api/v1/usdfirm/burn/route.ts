import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UsdfMintBurnEngine } from '@/lib/usdfirm/mint-burn-engine';
import {
  USDFIRM_WORKER_URL,
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

const BurnSchema = z.object({
  partnerSite: z.enum(['xpayes.com', 'segregated_mm_desk', 'institutional_direct', 'usdfirm.com']),
  requesterPubkey: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'ERR_VALIDATION_FAILED'),
  amountUsdf: z.number().positive(),
  burnAuthorizationSignature: z.string().min(10, 'ERR_VALIDATION_FAILED'),
  reserveId: z.enum(['RSV-CASH', 'RSV-TBILL']).optional(),
  traceId: z.string().optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = BurnSchema.safeParse(body);
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

      const workerRes = await fetch(`${USDFIRM_WORKER_URL}/api/burn`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          amountUsdf: parsed.data.amountUsdf,
          counterparty: `${parsed.data.partnerSite} (${parsed.data.requesterPubkey.slice(0, 10)})`,
          reserveId: parsed.data.reserveId ?? 'RSV-CASH',
          traceId: parsed.data.traceId,
        }),
      });
      const workerJson = (await workerRes.json()) as WorkerSnapshotResponse & {
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
      const feeUsd = Number((parsed.data.amountUsdf * 0.0003).toFixed(2));
      const matchedOrder = workerJson.orderId
        ? bundle.orders.find((o) => o.orderNo === workerJson.orderId)
        : undefined;

      const order: UsdfMintBurnOrderRecord =
        matchedOrder ?? {
          orderNo: workerJson.orderId || `ORD-BURN-${Date.now()}`,
          orderType: 'BURN',
          partnerSite: parsed.data.partnerSite,
          requesterPubkey: parsed.data.requesterPubkey,
          amountUsd: parsed.data.amountUsdf,
          feeUsd,
          status: 'EXECUTED',
          txHash: workerJson.txHash ?? null,
          merkleRoot: workerJson.merkleRoot ?? null,
          traceId: workerJson.traceId ?? null,
          xpayesRef: null,
          segregatedMmRef: null,
          timelockEta: null,
          executedAt: new Date().toISOString(),
          createdAt: new Date().toISOString(),
        };

      return NextResponse.json(
        {
          success: true,
          data: {
            order,
            orderId: workerJson.orderId ?? null,
            txHash: workerJson.txHash ?? null,
            merkleRoot: workerJson.merkleRoot ?? null,
            traceId: workerJson.traceId ?? null,
            bundle,
          },
        },
        { status: 200 }
      );
    }

    const order = UsdfMintBurnEngine.getInstance().requestBurn({
      partnerSite:
        parsed.data.partnerSite === 'usdfirm.com'
          ? 'institutional_direct'
          : parsed.data.partnerSite,
      requesterPubkey: parsed.data.requesterPubkey,
      amountUsdf: parsed.data.amountUsdf,
      burnAuthorizationSignature: parsed.data.burnAuthorizationSignature,
    });
    return NextResponse.json({ success: true, data: { order } }, { status: 200 });
  } catch (err) {
    const rawMsg = err instanceof Error ? err.message : '';
    const errCode = rawMsg.includes('COMPLIANCE_')
      ? 'COMPLIANCE_BLOCKED'
      : rawMsg.includes('INSUFFICIENT_')
        ? 'ERR_INSUFFICIENT_CIRCULATING'
        : 'INTERNAL_ERROR';
    const isClientErr = errCode !== 'INTERNAL_ERROR';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: errCode,
          errorCode: errCode,
          message: errCode,
        },
      },
      { status: isClientErr ? 422 : 500 }
    );
  }
}
