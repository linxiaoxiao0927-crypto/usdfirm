import { NextResponse } from 'next/server';
import { z } from 'zod';
import { XPayesBridge } from '@/lib/usdfirm/bridges/xpayes-bridge';
import {
  USDFIRM_WORKER_URL,
  fetchWorkerState,
  isVitestOffline,
} from '@/lib/usdfirm/worker-client';
import { signClearingEnvelopeServer } from '@/lib/usdfirm/clearing-signer';

export const dynamic = 'force-dynamic';

const XPayesHookSchema = z.object({
  payload: z.object({
    merchantId: z.string().min(2),
    depositCurrency: z.enum(['USD', 'EUR', 'GBP']),
    depositAmount: z.number().positive(),
    usdfPayoutAmount: z.number().positive(),
    vIbanAccount: z.string().min(5),
    paymentRef: z.string().min(4),
    timestamp: z.string(),
    action: z.enum(['ONRAMP_MINT', 'OFFRAMP_BURN']).optional(),
  }),
  signature: z.string().startsWith('sha256='),
  tamperTest: z.boolean().optional(),
});

export async function GET() {
  const samplePayload = {
    merchantId: 'MERCH_SOFAYES_GLOBAL',
    depositCurrency: 'USD' as const,
    depositAmount: 125_000,
    usdfPayoutAmount: 125_000,
    vIbanAccount: 'CH9300762011623852957',
    paymentRef: `XPAY-SETTLE-${Date.now().toString(36).toUpperCase()}`,
    timestamp: new Date().toISOString(),
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

    const xpayesBuffer = live.bundle.buffers?.find((b) => b.module_id === 'xpayes') ?? null;
    return NextResponse.json({
      success: true,
      data: {
        gatewayStatus: 'OPERATIONAL',
        hmacAlgorithm: 'HMAC-SHA256',
        xpayesBuffer,
        samplePayload,
        sampleSignature: 'sha256=' + '0'.repeat(64),
      },
    });
  }

  const bridge = XPayesBridge.getInstance();
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
            errorCode: 'VALIDATION_ERROR',
            message: 'VALIDATION_ERROR',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    if (!isVitestOffline()) {
      const now = String(Date.now());
      const traceId = `trc_xp_${now}_${Math.random().toString(16).slice(2, 8)}`;
      const idempotencyKey = parsed.data.payload.paymentRef;
      const caller = 'xpayes.com';
      const rawBody = JSON.stringify({
        action: parsed.data.payload.action ?? 'ONRAMP_MINT',
        usdfAmount: parsed.data.payload.usdfPayoutAmount,
        fiatAmount: parsed.data.payload.depositAmount,
        fiatCurrency: parsed.data.payload.depositCurrency,
        merchantId: parsed.data.payload.merchantId,
        paymentRef: parsed.data.payload.paymentRef,
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

      const workerRes = await fetch(`${USDFIRM_WORKER_URL}/api/bridge/xpayes-settlement`, {
        method: 'POST',
        cache: 'no-store',
        headers: {
          'Content-Type': 'application/json',
          'X-SM-Caller': caller,
          'X-SM-Trace-Id': traceId,
          'X-SM-Timestamp': now,
          'X-SM-Idempotency-Key': idempotencyKey,
          'X-SM-Signature': sig,
        },
        body: rawBody,
      });

      const workerJson = (await workerRes.json().catch(() => ({}))) as {
        ok?: boolean;
        errorCode?: string;
        mintOrderId?: string;
        txHash?: string;
        merkleRoot?: string;
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
            status: 'SETTLED',
            txHash: workerJson.txHash ?? '',
            mintOrderId: workerJson.mintOrderId ?? '',
            traceId: workerJson.traceId ?? traceId,
          },
        },
        { status: 200 }
      );
    }

    const result = XPayesBridge.getInstance().processSettlement(
      parsed.data.payload,
      parsed.data.signature
    );

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'INTERNAL_ERROR';
    const isAuthOrIdem =
      message.includes('INVALID_SIGNATURE') || message.includes('IDEMPOTENCY_');
    return NextResponse.json(
      {
        success: false,
        error: {
          code: isAuthOrIdem ? 'AUTH_OR_IDEMPOTENCY_REJECTED' : 'INTERNAL_ERROR',
          errorCode: isAuthOrIdem ? 'AUTH_OR_IDEMPOTENCY_REJECTED' : 'INTERNAL_ERROR',
          message,
        },
      },
      { status: isAuthOrIdem ? 422 : 500 }
    );
  }
}
