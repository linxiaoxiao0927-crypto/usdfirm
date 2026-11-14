import { NextResponse } from 'next/server';
import { TokenSwapSchema } from '@/lib/schemas/ledger-schemas';
import { executeTokenSwap } from '@/lib/federation-engine';
import type { LedgerEntryRecord, LedgerSnapshot } from '@/types/ledger';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = TokenSwapSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'ASD-S / ASD-G 闪兑参数校验失败',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const result = executeTokenSwap(parsed.data);
    return NextResponse.json<
      ApiResponse<{
        entry: LedgerEntryRecord;
        convertedAmount: number;
        snapshot: LedgerSnapshot;
      }>
    >({ success: true, data: result }, { status: 200 });
  } catch (err) {
    console.error('[API_ERROR]', err);
    const message =
      err instanceof Error ? err.message : '双态通证闪兑引擎异常';
    const isBusinessErr =
      message.includes('IDEMPOTENCY_CONFLICT') ||
      message.includes('INSUFFICIENT_');
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: isBusinessErr ? 'SWAP_REJECTED' : 'INTERNAL_ERROR',
          message,
        },
      },
      { status: isBusinessErr ? 422 : 500 }
    );
  }
}
