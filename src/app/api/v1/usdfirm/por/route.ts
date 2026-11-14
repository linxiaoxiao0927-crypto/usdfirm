import { NextResponse } from 'next/server';
import { UsdfReserveEngine } from '@/lib/usdfirm/reserve-engine';
import { UsdfRiskMonitor } from '@/lib/usdfirm/risk-monitor';
import { fetchWorkerState, isVitestOffline } from '@/lib/usdfirm/worker-client';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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

      return NextResponse.json({
        success: true,
        data: {
          attestation: live.bundle.attestation,
          reserves: live.bundle.reserves,
          risk: live.bundle.telemetry,
          bufferStatus: live.bundle.bufferStatus,
          onlineClients: live.bundle.onlineClients,
        },
      });
    }

    const reserveEngine = UsdfReserveEngine.getInstance();
    const riskMonitor = UsdfRiskMonitor.getInstance();

    const attestation = reserveEngine.generatePoRAttestation(1);
    const reserves = reserveEngine.getReserves();
    const risk = riskMonitor.getTelemetry();

    return NextResponse.json({
      success: true,
      data: {
        attestation,
        reserves,
        risk,
      },
    });
  } catch (err) {
    console.error('[POR_API_ERROR]', err);
    return NextResponse.json(
      {
        success: false,
        error: { code: 'POR_FEED_ERROR', errorCode: 'POR_FEED_ERROR', message: 'POR_FEED_ERROR' },
      },
      { status: 500 }
    );
  }
}
