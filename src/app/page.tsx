import React from 'react';
import { getLedgerSnapshot } from '@/lib/ledger-engine';
import { ClearingConsoleClient } from '@/components/dashboard/ClearingConsoleClient';

export const dynamic = 'force-dynamic';

export default function UsdfirmHomePage() {
  const initialSnapshot = getLedgerSnapshot();

  return (
    <main className="min-h-screen bg-[#090A0F]">
      <ClearingConsoleClient initialSnapshot={initialSnapshot} initialTab="USDFIRM" />
    </main>
  );
}
