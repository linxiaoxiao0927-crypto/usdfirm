import React from 'react';
import { fetchWorkerState } from '@/lib/usdfirm/worker-client';
import { UsdfirmProtocolHub } from '@/components/usdfirm/UsdfirmProtocolHub';
import { UsdfirmPageHeader } from '@/components/usdfirm/UsdfirmPageHeader';

export const dynamic = 'force-dynamic';

export default async function UsdfirmPage() {
  const live = await fetchWorkerState();

  return (
    <main className="min-h-screen bg-[#090A0F] text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <UsdfirmPageHeader />
        <UsdfirmProtocolHub
          initialBundle={live.ok ? live.bundle : undefined}
          initialErrorCode={live.ok ? null : live.errorCode}
        />
      </div>
    </main>
  );
}
