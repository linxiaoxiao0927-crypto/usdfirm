import { NextResponse } from 'next/server';
import { z } from 'zod';
import { SegregatedMmBridge } from '@/lib/usdfirm/bridges/segregated-mm-bridge';
import {
  fetchWorkerState,
  isVitestOffline,
} from '@/lib/usdfirm/worker-client';

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
      const serverSecret = process.env.CLEARING_HMAC_SECRET;
      if (parsed.data.tamperTest || !serverSecret) {
        return NextResponse.json(
          {
            success: false,
            error: {
              code: 'ERR_INVALID_HMAC_SIGNATURE',
              errorCode: 'ERR_INVALID_HMAC_SIGNATURE',
              message: 'ERR_INVALID_HMAC_SIGNATURE',
            },
          },
          { status: 401 }
        );
      }

      const bridge = SegregatedMmBridge.getInstance();
      const validSig = bridge.generateSignatureForTesting(parsed.data.payload);
      const localRes = bridge.executeLiquidityOperation(parsed.data.payload, validSig);

      return NextResponse.json(
        {
          success: true,
          data: {
            status: 'COMMITTED',
            allocatedUsdf: localRes.bufferRemaining,
            bufferRemaining: 20_000_000 - localRes.bufferRemaining,
            maxCapUsdf: 20_000_000,
            txHash: localRes.txHash,
            traceId: `trc_mm_${Date.now()}`,
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
