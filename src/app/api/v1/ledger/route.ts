import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLedgerSnapshot } from '@/lib/ledger-engine';
import type { LedgerSnapshot } from '@/types/ledger';

const QuerySchema = z.object({
  simulateError: z.enum(['true', 'false']).optional(),
  simulateEmpty: z.enum(['true', 'false']).optional(),
});

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
};

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const parsed = QuerySchema.safeParse({
      simulateError: searchParams.get('simulateError') ?? undefined,
      simulateEmpty: searchParams.get('simulateEmpty') ?? undefined,
    });

    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: '查询参数校验失败',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    if (parsed.data.simulateError === 'true') {
      throw new Error('UPSTREAM_LEDGER_NODE_TIMEOUT: 核心清算节点对账超时');
    }

    const snapshot = getLedgerSnapshot();
    if (parsed.data.simulateEmpty === 'true') {
      return NextResponse.json<ApiResponse<LedgerSnapshot>>(
        {
          success: true,
          data: {
            ...snapshot,
            recentEntries: [],
            escrowOrders: [],
            federationNodes: [],
          },
        },
        { status: 200 }
      );
    }

    return NextResponse.json<ApiResponse<LedgerSnapshot>>(
      { success: true, data: snapshot },
      { status: 200 }
    );
  } catch (err) {
    console.error('[API_ERROR]', err);
    const message =
      err instanceof Error ? err.message : '清结算总账查询异常';
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message },
      },
      { status: 500 }
    );
  }
}
