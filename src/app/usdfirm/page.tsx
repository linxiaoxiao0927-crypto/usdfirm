import React from 'react';
import Link from 'next/link';
import { ArrowLeft, Shield } from 'lucide-react';
import { UsdfReserveEngine } from '@/lib/usdfirm/reserve-engine';
import { UsdfMintBurnEngine } from '@/lib/usdfirm/mint-burn-engine';
import { UsdfMultiSigTimelock } from '@/lib/usdfirm/multisig-timelock';
import { UsdfRiskMonitor } from '@/lib/usdfirm/risk-monitor';
import { UsdfAuditTrail } from '@/lib/usdfirm/audit-trail';
import { ItisDealBridge } from '@/lib/usdfirm/bridges/itisdeal-bridge';
import { UsdfirmProtocolHub, type UsdfirmInitialBundle } from '@/components/usdfirm/UsdfirmProtocolHub';

export const dynamic = 'force-dynamic';

export default function UsdfirmPage() {
  const reserveEngine = UsdfReserveEngine.getInstance();
  const mintBurnEngine = UsdfMintBurnEngine.getInstance();
  const timelock = UsdfMultiSigTimelock.getInstance();
  const riskMonitor = UsdfRiskMonitor.getInstance();
  const auditTrail = UsdfAuditTrail.getInstance();
  const itisBridge = ItisDealBridge.getInstance();

  const initialBundle: UsdfirmInitialBundle = {
    attestation: reserveEngine.generatePoRAttestation(1),
    reserves: reserveEngine.getReserves(),
    orders: mintBurnEngine.getOrders(),
    proposals: timelock.getProposals(),
    signers: timelock.signers,
    requiredConfirmations: timelock.requiredConfirmations,
    telemetry: riskMonitor.getTelemetry(),
    auditLogs: auditTrail.getRecentLogs(15),
    bufferStatus: itisBridge.getSegregatedBufferStatus(),
  };

  return (
    <main className="min-h-screen bg-[#090A0F] text-zinc-100 py-8 px-4 sm:px-6 lg:px-8">
      <div className="mx-auto max-w-7xl space-y-6">
        <header className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-3xl border border-white/10 bg-zinc-950/90 p-6 backdrop-blur-xl shadow-2xl">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-0.5 text-xs font-mono font-semibold text-emerald-300">
                <Shield className="w-3.5 h-3.5" />
                Web2.5 Compliance Firewall · Segregated Stablecoin Issuer
              </span>
              <span className="rounded-full border border-white/10 bg-white/5 px-3 py-0.5 text-xs font-mono text-zinc-400">
                1 USDF = $1.00 USD (100%+ Backed)
              </span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-white">
              USDFirm.com{' '}
              <span className="text-zinc-400 font-normal text-lg">
                Institutional Reserve Attestation, Timelock Issuance &amp; Liquidity Protocol
              </span>
            </h1>
          </div>

          <Link
            href="/"
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-4 py-2 text-xs font-medium text-zinc-300 hover:bg-white/10 hover:text-white transition self-start sm:self-auto"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            ASDCoin Clearing Console
          </Link>
        </header>

        <UsdfirmProtocolHub initialBundle={initialBundle} />
      </div>
    </main>
  );
}
