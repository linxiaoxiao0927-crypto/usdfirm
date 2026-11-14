import { NextResponse } from 'next/server';
import { z } from 'zod';
import { XPayesBridge } from '@/lib/usdfirm/bridges/xpayes-bridge';

const XPayesHookSchema = z.object({
  payload: z.object({
    merchantId: z.string().min(2),
    depositCurrency: z.enum(['USD', 'EUR', 'GBP']),
    depositAmount: z.number().positive(),
    usdfPayoutAmount: z.number().positive(),
    vIbanAccount: z.string().min(5),
    paymentRef: z.string().min(4),
    timestamp: z.string(),
  }),
  signature: z.string().startsWith('sha256='),
});

export async function GET() {
  const bridge = XPayesBridge.getInstance();
  const samplePayload = {
    merchantId: 'MERCH_SOFAYES_GLOBAL',
    depositCurrency: 'USD' as const,
    depositAmount: 125_000,
    usdfPayoutAmount: 125_000,
    vIbanAccount: 'CH9300762011623852957',
    paymentRef: `XPAY-SETTLE-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
  };
  const sampleSignature = bridge.generateSignatureForTesting(samplePayload);

  return NextResponse.json({
    success: true,
    data: {
      gatewayStatus: 'OPERATIONAL',
      hmacAlgorithm: 'HMAC-SHA256',
      samplePayload,
      sampleSignature,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = XPayesHookSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid XPayes webhook payload',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const result = XPayesBridge.getInstance().processSettlement(
      parsed.data.payload,
      parsed.data.signature
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Bridge settlement error';
    const isAuthOrIdem =
      message.includes('INVALID_SIGNATURE') || message.includes('IDEMPOTENCY_');
    return NextResponse.json(
      {
        success: false,
        error: { code: isAuthOrIdem ? 'AUTH_OR_IDEMPOTENCY_REJECTED' : 'INTERNAL_ERROR', message },
      },
      { status: isAuthOrIdem ? 422 : 500 }
    );
  }
}
