import { NextResponse } from 'next/server';
import { SkillGasBurnSchema } from '@/lib/schemas/ledger-schemas';
import { executeSkillGasBurn } from '@/lib/ledger-engine';
import type { LedgerSnapshot } from '@/types/ledger';

export const dynamic = 'force-dynamic';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; errorCode?: string; message: string; details?: unknown };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SkillGasBurnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            errorCode: 'ERR_VALIDATION_FAILED',
            message: 'ERR_VALIDATION_FAILED',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const result = executeSkillGasBurn(parsed.data);
    return NextResponse.json<
      ApiResponse<{
        totalGasConsumed: number;
        burnedGas: number;
        providerGas: number;
        snapshot: LedgerSnapshot;
      }>
    >({ success: true, data: result }, { status: 200 });
  } catch (err) {
    console.error('[API_ERROR]', err);
    const rawMsg = err instanceof Error ? err.message : '';
    const errCode = rawMsg.includes('IDEMPOTENCY_CONFLICT')
      ? 'ERR_IDEMPOTENCY_CONFLICT'
      : rawMsg.includes('INSUFFICIENT_')
        ? 'ERR_INSUFFICIENT_UUSDF_BALANCE'
        : rawMsg.includes('SKILL_NOT_FOUND')
          ? 'ERR_SKILL_NOT_FOUND'
          : 'ERR_INTERNAL_SERVER';
    const isBusinessErr = errCode !== 'ERR_INTERNAL_SERVER';
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: isBusinessErr ? 'GAS_BURN_REJECTED' : 'INTERNAL_ERROR',
          errorCode: errCode,
          message: errCode,
        },
      },
      { status: isBusinessErr ? 422 : 500 }
    );
  }
}
