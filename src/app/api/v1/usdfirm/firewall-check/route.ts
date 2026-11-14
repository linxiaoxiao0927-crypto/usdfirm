import { NextResponse } from 'next/server';
import { executeFirewallSelfCheck } from '@/lib/usdfirm/worker-client';

export const dynamic = 'force-dynamic';

export async function POST() {
  try {
    const result = await executeFirewallSelfCheck();
    return NextResponse.json({
      success: true,
      data: result,
    });
  } catch {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'ERR_WORKER_UNREACHABLE',
          errorCode: 'ERR_WORKER_UNREACHABLE',
          message: 'ERR_WORKER_UNREACHABLE',
        },
      },
      { status: 503 }
    );
  }
}
