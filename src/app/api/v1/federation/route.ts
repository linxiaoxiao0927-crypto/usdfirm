import { NextResponse } from 'next/server';
import { FederationEventSchema } from '@/lib/schemas/ledger-schemas';
import { executeFederationEvent } from '@/lib/federation-engine';
import type { LedgerEntryRecord, LedgerSnapshot } from '@/types/ledger';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = FederationEventSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '跨站联邦报文契约校验失败',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const result = executeFederationEvent(parsed.data);
    return NextResponse.json<
      ApiResponse<{
        entry: LedgerEntryRecord;
        snapshot: LedgerSnapshot;
      }>
    >({ success: true, data: result }, { status: 200 });
  } catch (err) {
    console.error('[API_ERROR]', err);
    const message =
      err instanceof Error ? err.message : '跨站联邦清算总线异常';
    const isAuthOrBizErr =
      message.includes('INVALID_HMAC_SIGNATURE') ||
      message.includes('IDEMPOTENCY_CONFLICT') ||
      message.includes('INSUFFICIENT_');
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: isAuthOrBizErr ? 'FEDERATION_REJECTED' : 'INTERNAL_ERROR',
          message,
        },
      },
      { status: isAuthOrBizErr ? 422 : 500 }
    );
  }
}
