import { NextResponse } from 'next/server';
import { z } from 'zod';
import { ItisDealBridge } from '@/lib/usdfirm/bridges/itisdeal-bridge';

const ItisDealSchema = z.object({
  payload: z.object({
    poolId: z.string().min(3),
    orderType: z.enum(['MINT_LIQUIDITY', 'BURN_REDEEM']),
    amountUsdf: z.number().positive(),
    marketMakerId: z.string().min(2),
    exchangeNonce: z.number().int().positive(),
    vaultDepositRef: z.string().min(4),
  }),
  signature: z.string().startsWith('sha256='),
});

export async function GET() {
  const bridge = ItisDealBridge.getInstance();
  const bufferStatus = bridge.getSegregatedBufferStatus();
  const samplePayload = {
    poolId: 'USDF_USDT_CORE_POOL',
    orderType: 'MINT_LIQUIDITY' as const,
    amountUsdf: 500_000,
    marketMakerId: 'MM_WINTERMUTE_DESK_01',
    exchangeNonce: Math.floor(Date.now() / 1000),
    vaultDepositRef: `VAULT-DEP-${Date.now().toString(36).toUpperCase()}`,
  };
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
    const parsed = ItisDealSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid ItisDeal liquidity request',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const result = ItisDealBridge.getInstance().executeLiquidityOperation(
      parsed.data.payload,
      parsed.data.signature
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Liquidity operation error';
    const isClientOrRisk =
      message.includes('INVALID_SIGNATURE') ||
      message.includes('REPLAY') ||
      message.includes('EXCHANGE_RISK_LIMIT');
    return NextResponse.json(
      {
        success: false,
        error: { code: isClientOrRisk ? 'RISK_OR_SIG_REJECTED' : 'INTERNAL_ERROR', message },
      },
      { status: isClientOrRisk ? 422 : 500 }
    );
  }
}
