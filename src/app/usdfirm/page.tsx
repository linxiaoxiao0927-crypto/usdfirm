import React from 'react';
import { fetchWorkerState } from '@/lib/usdfirm/worker-client';
import { UsdfirmProtocolHub } from '@/components/usdfirm/UsdfirmProtocolHub';
import { UsdfirmPageHeader } from '@/components/usdfirm/UsdfirmPageHeader';

export const dynamic = 'force-dynamic';

export default async function UsdfirmPage() {
  const live = await fetchWorkerState();

  return (
    <main className="min-h-screen bg-[#111215] text-[#F4F4F6] flex flex-col overflow-x-hidden">
      <UsdfirmPageHeader />
      <div className="mx-auto max-w-7xl w-full px-4 sm:px-6 lg:px-8 pt-2 pb-16 space-y-6">
        <UsdfirmProtocolHub
          initialBundle={live.ok ? live.bundle : undefined}
          initialErrorCode={live.ok ? null : live.errorCode}
        />
      </div>
    </main>
  );
}
