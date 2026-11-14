import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SegregatedMmBridge } from '@/lib/usdfirm/bridges/segregated-mm-bridge';
import {
  fetchWorkerState,
  isVitestOffline,
  USDFIRM_WORKER_URL,
} from '@/lib/usdfirm/worker-client';
import { signClearingEnvelopeServer } from '@/lib/usdfirm/clearing-signer';

export const dynamic = 'force-dynamic';

const SegregatedMmSchema = z.object({
  payload: z.object({
    poolId: z.string().min(3),
    orderType: z.enum(['MINT_LIQUIDITY', 'BURN_REDEEM']),
    amountUsdf: z.number().positive(),
    marketMakerId: z.string().min(2),
    exchangeNonce: z.number().int().positive(),
    vaultDepositRef: z.string().min(4),
  }),
  signature: z.string().startsWith('sha256='),
  tamperTest: z.boolean().optional(),
});

export async function GET(): Promise<NextResponse>;
export async function GET(request: Request): Promise<NextResponse>;
export async function GET(request?: Request): Promise<NextResponse> {
  const url = request ? new URL(request.url) : null;
  const orderTypeParam = url?.searchParams.get('orderType');
  const orderType: 'MINT_LIQUIDITY' | 'BURN_REDEEM' =
    orderTypeParam === 'BURN_REDEEM' ? 'BURN_REDEEM' : 'MINT_LIQUIDITY';
  const amountParam = Number(url?.searchParams.get('amountUsdf') || 500_000);
  const amountUsdf = Number.isFinite(amountParam) && amountParam > 0 ? amountParam : 500_000;
  const nonceParam = Number(url?.searchParams.get('exchangeNonce') || 0);
  const exchangeNonce =
    Number.isInteger(nonceParam) && nonceParam > 0
      ? nonceParam
      : Math.floor(Date.now() / 1000);

  const samplePayload = {
    poolId: 'USDF_USDT_CORE_POOL',
    orderType,
    amountUsdf,
    marketMakerId: 'MM_WINTERMUTE_DESK_01',
    exchangeNonce,
    vaultDepositRef: `VAULT-DEP-${Date.now().toString(36).toUpperCase()}`,
  };

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

    return NextResponse.json({
      success: true,
      data: {
        bufferStatus: live.bundle.bufferStatus,
        buffers: live.bundle.buffers,
        samplePayload,
        sampleSignature: 'sha256=' + '0'.repeat(64),
      },
    });
  }

  const bridge = SegregatedMmBridge.getInstance();
  const bufferStatus = bridge.getSegregatedBufferStatus();
  const sampleSignature = bridge.generateSignatureForTesting(samplePayload);

  return NextResponse.json({
    success: true,
    data: {
      bufferStatus,
      samplePayload,
      sampleSignature,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SegregatedMmSchema.safeParse(body);
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
      const caller = 'itisdeal.com';
      const now = String(Date.now());
      const traceId = `trc_ui_mm_${now}`;
      const idempotencyKey = `ui_mm_${parsed.data.payload.poolId}_${parsed.data.payload.exchangeNonce}_${now}`;
      const rawBody = JSON.stringify({
        orderType: parsed.data.payload.orderType,
        amountUsdf: parsed.data.payload.amountUsdf,
        poolId: parsed.data.payload.poolId,
        marketMakerId: parsed.data.payload.marketMakerId,
        exchangeNonce: parsed.data.payload.exchangeNonce,
        vaultDepositRef: parsed.data.payload.vaultDepositRef,
      });

      const serverSecret = process.env.CLEARING_HMAC_SECRET;
      const sig =
        !parsed.data.tamperTest && serverSecret
          ? signClearingEnvelopeServer({
              caller,
              traceId,
              timestamp: now,
              idempotencyKey,
              rawBody,
              secret: serverSecret,
            })
          : parsed.data.signature;

      const workerRes = await fetch(
        `${USDFIRM_WORKER_URL}/api/bridge/itisdeal-liquidity`,
        {
          method: 'POST',
          cache: 'no-store',
          signal: AbortSignal.timeout(7000),
          headers: {
            'Content-Type': 'application/json',
            'X-SM-Caller': caller,
            'X-SM-Trace-Id': traceId,
            'X-SM-Timestamp': now,
            'X-SM-Idempotency-Key': idempotencyKey,
            'X-SM-Signature': sig,
          },
          body: rawBody,
        }
      );

      const workerJson = (await workerRes.json().catch(() => ({}))) as {
        ok?: boolean;
        errorCode?: string;
        orderType?: string;
        amountUsdf?: number;
        allocatedUsdf?: number;
        bufferRemaining?: number;
        maxCapUsdf?: number;
        txHash?: string;
        traceId?: string;
      };

      if (!workerRes.ok || !workerJson.ok) {
        const errCode = workerJson.errorCode || 'ERR_INVALID_HMAC_SIGNATURE';
        return NextResponse.json(
          {
            success: false,
            error: {
              code: errCode,
              errorCode: errCode,
              message: errCode,
            },
          },
          { status: workerRes.status || 401 }
        );
      }

      return NextResponse.json(
        {
          success: true,
          data: {
            status: 'COMMITTED',
            orderType: workerJson.orderType ?? parsed.data.payload.orderType,
            amountUsdf: workerJson.amountUsdf ?? parsed.data.payload.amountUsdf,
            allocatedUsdf: workerJson.allocatedUsdf ?? 0,
            bufferRemaining: workerJson.bufferRemaining ?? 0,
            maxCapUsdf: workerJson.maxCapUsdf ?? 20_000_000,
            txHash: workerJson.txHash ?? '',
            traceId: workerJson.traceId ?? traceId,
          },
        },
        { status: 200 }
      );
    }

    const result = SegregatedMmBridge.getInstance().executeLiquidityOperation(
      parsed.data.payload,
      parsed.data.signature
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
    const isClientOrRisk =
      message.includes('INVALID_SIGNATURE') ||
      message.includes('REPLAY') ||
      message.includes('RISK_LIMIT') ||
      message.includes('BUFFER_UNDERFLOW');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isClientOrRisk ? 'RISK_OR_SIG_REJECTED' : 'INTERNAL_ERROR',
          errorCode: isClientOrRisk ? 'RISK_OR_SIG_REJECTED' : 'INTERNAL_ERROR',
          message,
        },
      },
      { status: isClientOrRisk ? 422 : 500 }
    );
  }
}
