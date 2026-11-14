import { NextResponse } from 'next/server';
import { getLedgerSnapshot } from '@/lib/ledger-engine';
import type { LedgerSnapshot } from '@/types/ledger';

export const dynamic = 'force-dynamic';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; errorCode?: string; message: string; details?: unknown };
};

export async function GET(_request: Request) {
  try {
    const snapshot = getLedgerSnapshot();
    return NextResponse.json<ApiResponse<LedgerSnapshot>>(
      { success: true, data: snapshot },
      { status: 200 }
    );
  } catch (err) {
    console.error('[API_ERROR]', err);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'ERR_LEDGER_SYNC_FAILED',
          errorCode: 'ERR_LEDGER_SYNC_FAILED',
          message: 'ERR_LEDGER_SYNC_FAILED',
        },
      },
      { status: 500 }
    );
  }
}
