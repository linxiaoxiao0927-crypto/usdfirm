import { NextResponse } from 'next/server';
import { UsdfReserveEngine } from '@/lib/usdfirm/reserve-engine';
import { UsdfMintBurnEngine } from '@/lib/usdfirm/mint-burn-engine';
import { UsdfMultiSigTimelock } from '@/lib/usdfirm/multisig-timelock';
import { UsdfRiskMonitor } from '@/lib/usdfirm/risk-monitor';
import { UsdfAuditTrail } from '@/lib/usdfirm/audit-trail';
import { SegregatedMmBridge } from '@/lib/usdfirm/bridges/segregated-mm-bridge';
import { fetchWorkerState, isVitestOffline } from '@/lib/usdfirm/worker-client';
import type { UsdfirmProtocolBundle } from '@/lib/usdfirm/types';

export const dynamic = 'force-dynamic';

function buildLocalBundle(): UsdfirmProtocolBundle {
  const reserveEngine = UsdfReserveEngine.getInstance();
  const mintBurnEngine = UsdfMintBurnEngine.getInstance();
  const timelock = UsdfMultiSigTimelock.getInstance();
  const riskMonitor = UsdfRiskMonitor.getInstance();
  const auditTrail = UsdfAuditTrail.getInstance();
  const mmBridge = SegregatedMmBridge.getInstance();

  return {
    attestation: reserveEngine.generatePoRAttestation(1),
    reserves: reserveEngine.getReserves(),
    orders: mintBurnEngine.getOrders(),
    proposals: timelock.getProposals(),
    signers: timelock.signers,
    requiredConfirmations: timelock.requiredConfirmations,
    telemetry: riskMonitor.getTelemetry(),
    auditLogs: auditTrail.getRecentLogs(15),
    bufferStatus: mmBridge.getSegregatedBufferStatus(),
    traces: [],
    onlineClients: 0,
    serverTs: Date.now(),
    source: 'LOCAL_ENGINE',
  };
}

const NO_STORE_HEADERS = { 'Cache-Control': 'no-store, max-age=0' };

export async function GET() {
  if (isVitestOffline()) {
    return NextResponse.json(
      {
        success: true,
        data: buildLocalBundle(),
      },
      { headers: NO_STORE_HEADERS }
    );
  }

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
      { status: live.status, headers: NO_STORE_HEADERS }
    );
  }

  return NextResponse.json(
    {
      success: true,
      data: live.bundle,
    },
    { headers: NO_STORE_HEADERS }
  );
}
