import { NextResponse } from 'next/server';
import { MintOrRedeemSchema } from '@/lib/schemas/ledger-schemas';
import { executeMintOrRedeem } from '@/lib/ledger-engine';
import type { LedgerEntryRecord, LedgerSnapshot } from '@/types/ledger';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = MintOrRedeemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '铸币/赎回参数校验失败',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const result = executeMintOrRedeem(parsed.data);
    return NextResponse.json<
      ApiResponse<{ entry: LedgerEntryRecord; snapshot: LedgerSnapshot }>
    >({ success: true, data: result }, { status: 200 });
  } catch (err) {
    console.error('[API_ERROR]', err);
    const message =
      err instanceof Error ? err.message : '铸币/赎回网关异常';
    const isBusinessErr =
      message.includes('IDEMPOTENCY_CONFLICT') ||
      message.includes('INSUFFICIENT_ASD_BALANCE');
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: isBusinessErr ? 'LEDGER_REJECTED' : 'INTERNAL_ERROR',
          message,
        },
      },
      { status: isBusinessErr ? 422 : 500 }
    );
  }
}
