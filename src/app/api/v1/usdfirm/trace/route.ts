import { NextResponse } from 'next/server';
import { fetchWorkerTrace } from '@/lib/usdfirm/worker-client';

export const dynamic = 'force-dynamic';

export async function GET(): Promise<NextResponse>;
export async function GET(request: Request): Promise<NextResponse>;
export async function GET(request?: Request): Promise<NextResponse> {
  const url = request ? new URL(request.url) : null;
  const traceId = url?.searchParams.get('traceId')?.trim() || undefined;

  const result = await fetchWorkerTrace(traceId);
  if (!result.ok) {
    return NextResponse.json(
      {
        success: false,
        error: {
          code: result.errorCode,
          errorCode: result.errorCode,
          message: result.errorCode,
        },
      },
      { status: result.status }
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      traces: result.traces,
      service: result.service ?? 'usdfirm-rt-protocol',
      domain: result.domain ?? 'usdfirm.com',
      traceId: traceId ?? null,
    },
  });
}
