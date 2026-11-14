import { NextResponse } from 'next/server';
import { SkillGasBurnSchema } from '@/lib/schemas/ledger-schemas';
import { executeSkillGasBurn } from '@/lib/ledger-engine';
import type { LedgerSnapshot } from '@/types/ledger';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
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
            message: 'AI Skill 燃料扣费参数校验失败',
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
    const message =
      err instanceof Error ? err.message : 'Skill 燃料清算异常';
    const isBusinessErr =
      message.includes('IDEMPOTENCY_CONFLICT') ||
      message.includes('INSUFFICIENT_GAS_BALANCE');
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: isBusinessErr ? 'GAS_BURN_REJECTED' : 'INTERNAL_ERROR',
          message,
        },
      },
      { status: isBusinessErr ? 422 : 500 }
    );
  }
}
