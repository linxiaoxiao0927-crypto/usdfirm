import { NextResponse } from 'next/server';
import { UsdfReserveEngine } from '@/lib/usdfirm/reserve-engine';
import { UsdfRiskMonitor } from '@/lib/usdfirm/risk-monitor';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
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
        error: { code: 'POR_FEED_ERROR', message: 'Unable to retrieve PoR attestation' },
      },
      { status: 500 }
    );
  }
}
