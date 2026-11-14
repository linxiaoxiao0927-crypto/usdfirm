'use client';

import React from 'react';
import { ShieldCheck, CheckCircle2, FileText, Database, Lock } from 'lucide-react';
import type { UsdfPoRAttestation, UsdfReserveAssetItem } from '@/lib/usdfirm/types';

interface PorAttestationDashboardProps {
  attestation: UsdfPoRAttestation;
  reserves: UsdfReserveAssetItem[];
}

export function PorAttestationDashboard({
  attestation,
  reserves,
}: PorAttestationDashboardProps) {
  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 sm:p-8 backdrop-blur-xl shadow-2xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-white/10 pb-5">
        <div>
          <div className="flex items-center gap-2.5">
            <ShieldCheck className="w-6 h-6 text-emerald-400" />
            <h2 className="text-xl font-bold tracking-tight text-white">
              Real-Time Proof of Reserves (PoR) Attestation
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            Independent cryptographic verification of USDF dollar backing, certified by Grant Thornton & Chainlink Oracle Feed
          </p>
        </div>
        <div className="flex items-center gap-3">
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-500/15 px-3 py-1 text-xs font-mono font-semibold text-emerald-300">
            <CheckCircle2 className="w-3.5 h-3.5" />
            Backing Ratio: {attestation.reserveRatioPct}%
          </span>
          <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs font-mono text-zinc-400">
            Round #{attestation.roundId}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 space-y-1">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Total Audited Reserves</span>
          <p className="text-2xl font-bold font-mono text-emerald-400">
            ${attestation.totalReservesUsd.toLocaleString()} USD
          </p>
          <span className="text-[11px] text-zinc-500">Custodied at BNY Mellon & FRBNY</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 space-y-1">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Total Circulating USDF</span>
          <p className="text-2xl font-bold font-mono text-white">
            ${attestation.circulatingUsdf.toLocaleString()} USDF
          </p>
          <span className="text-[11px] text-zinc-500">ERC-20 & Multi-Chain Vaults</span>
        </div>

        <div className="rounded-2xl border border-white/10 bg-zinc-950/70 p-5 space-y-1">
          <span className="text-xs uppercase tracking-wider text-zinc-400">Surplus Overcollateralization</span>
          <p className="text-2xl font-bold font-mono text-amber-300">
            +${(attestation.totalReservesUsd - attestation.circulatingUsdf).toLocaleString()} USD
          </p>
          <span className="text-[11px] text-zinc-500">100% Segregated Safety Buffer</span>
        </div>
      </div>

      <div className="space-y-3">
        <div className="flex items-center justify-between text-xs text-zinc-400">
          <span className="font-semibold uppercase text-zinc-300 flex items-center gap-1.5">
            <Database className="w-4 h-4 text-cyan-400" />
            Audited Reserve Asset Breakdown
          </span>
          <span>Updated: {new Date(attestation.timestamp).toLocaleTimeString()}</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {reserves.map((item) => (
            <div
              key={item.cusip}
              className="rounded-2xl border border-white/10 bg-white/5 p-4 flex flex-col justify-between space-y-2"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono text-emerald-300 font-bold">{item.cusip}</span>
                <span className="rounded bg-white/10 px-2 py-0.5 text-[10px] text-zinc-300 font-mono">
                  {item.assetType.replace(/_/g, ' ')}
                </span>
              </div>
              <div>
                <p className="text-sm font-semibold text-white truncate">{item.name}</p>
                <p className="text-xs text-zinc-400">{item.custodian}</p>
              </div>
              <div className="flex items-center justify-between pt-2 border-t border-white/10 text-xs font-mono">
                <span className="text-zinc-400">Market Value:</span>
                <span className="text-white font-bold">${item.marketUsd.toLocaleString()} USD</span>
                <span className="text-amber-400">{item.yieldApy}% APY</span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="rounded-2xl border border-white/10 bg-zinc-950/90 p-4 space-y-2 text-xs font-mono">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-zinc-400 flex items-center gap-1.5">
            <Lock className="w-3.5 h-3.5 text-cyan-400" />
            Cryptographic SHA-256 Merkle Root:
          </span>
          <span className="text-cyan-300 break-all">{attestation.merkleRoot}</span>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-zinc-500 pt-1 border-t border-white/10 font-sans">
          <span>Chainlink Oracle Data: Round #{attestation.chainlinkRoundData.roundId} | Answer: {attestation.chainlinkRoundData.answerMicro} microUSD</span>
          <a
            href={attestation.attestationReportUrl}
            target="_blank"
            rel="noreferrer"
            className="text-emerald-400 hover:underline flex items-center gap-1 font-mono"
          >
            <FileText className="w-3.5 h-3.5" />
            View Independent Auditor Certificate
          </a>
        </div>
      </div>
    </div>
  );
}
