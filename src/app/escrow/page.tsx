import React from 'react';
import { getLedgerSnapshot } from '@/lib/ledger-engine';
import { fetchWorkerState } from '@/lib/usdfirm/worker-client';
import { ClearingConsoleClient } from '@/components/dashboard/ClearingConsoleClient';

export const dynamic = 'force-dynamic';

export default async function EscrowRoutePage() {
  const [initialSnapshot, live] = await Promise.all([
    Promise.resolve(getLedgerSnapshot()),
    fetchWorkerState(),
  ]);
  return (
    <main className="min-h-screen bg-[#111215]">
      <ClearingConsoleClient
        initialSnapshot={initialSnapshot}
        initialBundle={live.ok ? live.bundle : undefined}
        initialBundleErrorCode={live.ok ? null : live.errorCode}
        initialTab="ESCROW"
      />
    </main>
  );
}
