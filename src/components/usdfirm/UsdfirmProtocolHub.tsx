'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { RefreshCw, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import type {
  UsdfPoRAttestation,
  UsdfReserveAssetItem,
  UsdfMintBurnOrderRecord,
  TimelockProposalRecord,
  UsdfRiskTelemetrySnapshot,
  UsdfAuditLogRecord,
} from '@/lib/usdfirm/types';
import { PorAttestationDashboard } from './PorAttestationDashboard';
import { MintBurnPanel } from './MintBurnPanel';
import { MultiSigTimelockPanel } from './MultiSigTimelockPanel';
import { RiskMonitorPanel } from './RiskMonitorPanel';
import { BridgeStatusPanel } from './BridgeStatusPanel';

export interface UsdfirmInitialBundle {
  attestation: UsdfPoRAttestation;
  reserves: UsdfReserveAssetItem[];
  orders: UsdfMintBurnOrderRecord[];
  proposals: TimelockProposalRecord[];
  signers: string[];
  requiredConfirmations: number;
  telemetry: UsdfRiskTelemetrySnapshot;
  auditLogs: UsdfAuditLogRecord[];
  bufferStatus: { allocated: number; maxCap: number; isSegregated: boolean };
}

interface UsdfirmProtocolHubProps {
  initialBundle?: UsdfirmInitialBundle;
  showStandaloneLink?: boolean;
}

export function UsdfirmProtocolHub({
  initialBundle,
  showStandaloneLink = false,
}: UsdfirmProtocolHubProps) {
  const [bundle, setBundle] = useState<UsdfirmInitialBundle | null>(initialBundle ?? null);
  const [syncing, setSyncing] = useState(!initialBundle);

  const fetchFullState = useCallback(async () => {
    setSyncing(true);
    try {
      const [porRes, mintRes, multiRes, riskRes, itisRes] = await Promise.all([
        fetch('/api/v1/usdfirm/por'),
        fetch('/api/v1/usdfirm/mint'),
        fetch('/api/v1/usdfirm/multisig'),
        fetch('/api/v1/usdfirm/risk'),
        fetch('/api/v1/usdfirm/bridge/itisdeal'),
      ]);
      const [porJson, mintJson, multiJson, riskJson, itisJson] = await Promise.all([
        porRes.json(),
        mintRes.json(),
        multiRes.json(),
        riskRes.json(),
        itisRes.json(),
      ]);

      if (porJson.success && mintJson.success && multiJson.success && riskJson.success && itisJson.success) {
        setBundle({
          attestation: porJson.data.attestation,
          reserves: porJson.data.reserves,
          orders: mintJson.data.orders,
          proposals: multiJson.data.proposals,
          signers: multiJson.data.signers,
          requiredConfirmations: multiJson.data.requiredConfirmations,
          telemetry: riskJson.data.telemetry,
          auditLogs: riskJson.data.recentLogs,
          bufferStatus: itisJson.data.bufferStatus,
        });
      }
    } finally {
      setSyncing(false);
    }
  }, []);

  useEffect(() => {
    if (!initialBundle) {
      void fetchFullState();
    }
  }, [initialBundle, fetchFullState]);

  if (!bundle) {
    return (
      <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-8 text-center backdrop-blur-xl space-y-2">
        <RefreshCw className="w-6 h-6 text-emerald-400 animate-spin mx-auto" />
        <p className="text-xs font-mono text-zinc-300">
          Synchronizing USDFirm.com Cryptographic Reserve &amp; Multi-Sig State...
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-emerald-500/30 bg-emerald-950/20 px-5 py-3.5 backdrop-blur-md">
        <div className="flex flex-wrap items-center gap-2.5 text-xs">
          <span className="rounded-full bg-emerald-500 px-2.5 py-0.5 font-mono font-bold text-zinc-950">
            USDFirm.com Protocol
          </span>
          <span className="text-zinc-300 font-medium">
            Segregated Dollar-Pegged Stablecoin Issuance, PoR Oracle &amp; Multi-Sig Treasury Layer
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={fetchFullState}
            disabled={syncing}
            className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-mono text-zinc-200 hover:bg-white/10 transition"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${syncing ? 'animate-spin text-emerald-400' : ''}`} />
            Refresh Oracle
          </button>
          {showStandaloneLink && (
            <Link
              href="/usdfirm"
              className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 px-3 py-1.5 text-xs font-mono text-emerald-300 hover:bg-emerald-500/30 transition"
            >
              Dedicated Portal (/usdfirm)
              <ExternalLink className="w-3.5 h-3.5" />
            </Link>
          )}
        </div>
      </div>

      <PorAttestationDashboard attestation={bundle.attestation} reserves={bundle.reserves} />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <MintBurnPanel initialOrders={bundle.orders} onRefresh={fetchFullState} />
        <MultiSigTimelockPanel
          initialProposals={bundle.proposals}
          signers={bundle.signers}
          requiredConfirmations={bundle.requiredConfirmations}
          onRefresh={fetchFullState}
        />
      </div>

      <BridgeStatusPanel initialBuffer={bundle.bufferStatus} onRefresh={fetchFullState} />
      <RiskMonitorPanel
        initialTelemetry={bundle.telemetry}
        initialAuditLogs={bundle.auditLogs}
        onRefresh={fetchFullState}
      />
    </div>
  );
}
