'use client';

import React, { useState } from 'react';
import { Coins, Flame, ArrowRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { UsdfMintBurnOrderRecord } from '@/lib/usdfirm/types';

interface MintBurnPanelProps {
  initialOrders: UsdfMintBurnOrderRecord[];
  onRefresh: () => void;
}

export function MintBurnPanel({ initialOrders, onRefresh }: MintBurnPanelProps) {
  const [mode, setMode] = useState<'MINT' | 'BURN'>('MINT');
  const [partnerSite, setPartnerSite] = useState<'xpayes.com' | 'itisdeal.com' | 'institutional_direct'>('xpayes.com');
  const [requesterPubkey, setRequesterPubkey] = useState('0x9965507D1a55bcC2695C58ba16FB37d819B0A4df');
  const [amount, setAmount] = useState('250000');
  const [reference, setReference] = useState('XPAY-WIRE-8842');
  const [burnSig, setBurnSig] = useState('0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b');
  const [orders, setOrders] = useState<UsdfMintBurnOrderRecord[]>(initialOrders);
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [lastOrder, setLastOrder] = useState<UsdfMintBurnOrderRecord | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMsg('');
    setLastOrder(null);

    try {
      const numericAmount = Number(amount);
      const endpoint = mode === 'MINT' ? '/api/v1/usdfirm/mint' : '/api/v1/usdfirm/burn';
      const body =
        mode === 'MINT'
          ? {
              partnerSite,
              requesterPubkey,
              amountUsd: numericAmount,
              xpayesRef: partnerSite === 'xpayes.com' ? reference : undefined,
              itisdealRef: partnerSite === 'itisdeal.com' ? reference : undefined,
            }
          : { partnerSite, requesterPubkey, amountUsdf: numericAmount, burnAuthorizationSignature: burnSig };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) throw new Error(json.error?.message ?? 'Order execution failed');

      const newOrder: UsdfMintBurnOrderRecord = json.data.order;
      setLastOrder(newOrder);
      setOrders((prev) => [newOrder, ...prev.slice(0, 7)]);
      onRefresh();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Unexpected mint/burn error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/80 p-6 backdrop-blur-xl shadow-2xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            {mode === 'MINT' ? <Coins className="w-5 h-5 text-emerald-400" /> : <Flame className="w-5 h-5 text-amber-400" />}
            Institutional USDF Mint & Burn Engine
          </h3>
          <p className="text-xs text-zinc-400 mt-0.5">
            OFAC screening + 24h Timelock on Mints &ge; $1,000,000 USD (5 bps Mint / 3 bps Burn)
          </p>
        </div>

        <div className="flex rounded-xl border border-white/10 bg-zinc-950 p-1">
          <button
            type="button"
            onClick={() => setMode('MINT')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'MINT' ? 'bg-emerald-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Mint USDF
          </button>
          <button
            type="button"
            onClick={() => setMode('BURN')}
            className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
              mode === 'BURN' ? 'bg-amber-500 text-zinc-950' : 'text-zinc-400 hover:text-white'
            }`}
          >
            Burn & Redeem
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <label className="space-y-1.5">
          <span className="text-zinc-400 font-medium">Authorized Channel Partner</span>
          <select
            value={partnerSite}
            onChange={(e) => setPartnerSite(e.target.value as typeof partnerSite)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
          >
            <option value="xpayes.com">xpayes.com (Payment Gateway On-Ramp)</option>
            <option value="itisdeal.com">itisdeal.com (Segregated Liquidity Desk)</option>
            <option value="institutional_direct">institutional_direct (Prime Treasury)</option>
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-zinc-400 font-medium">Amount ({mode === 'MINT' ? 'USD Deposit' : 'USDF Burn'})</span>
          <input
            type="number"
            min="1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
          />
        </label>

        <label className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between">
            <span className="text-zinc-400 font-medium">Recipient / Burner EVM Address</span>
            <button
              type="button"
              onClick={() => setRequesterPubkey('0x7F367cc41522cE07553e846bc1068009752d4791')}
              className="text-[11px] text-rose-400 hover:underline font-mono"
            >
              Test OFAC Sanctioned Address
            </button>
          </div>
          <input
            type="text"
            value={requesterPubkey}
            onChange={(e) => setRequesterPubkey(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
          />
        </label>

        {mode === 'MINT' ? (
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-zinc-400 font-medium">Wire / Gateway Settlement Reference</span>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
        ) : (
          <label className="space-y-1.5 sm:col-span-2">
            <span className="text-zinc-400 font-medium">EIP-712 Burn Authorization Signature</span>
            <input
              type="text"
              value={burnSig}
              onChange={(e) => setBurnSig(e.target.value)}
              className="w-full rounded-xl border border-white/10 bg-zinc-950 px-3 py-2 font-mono text-white focus:border-emerald-500 focus:outline-none"
            />
          </label>
        )}

        <div className="sm:col-span-2 flex items-center justify-between pt-1">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setAmount('250000')}
              className="rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-[11px] text-zinc-300 hover:bg-white/10"
            >
              $250K (Instant)
            </button>
            <button
              type="button"
              onClick={() => setAmount('1500000')}
              className="rounded-lg border border-amber-500/30 bg-amber-500/10 px-2.5 py-1 text-[11px] text-amber-300 hover:bg-amber-500/20"
            >
              $1.5M (Triggers 24h Timelock)
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-500 px-4 py-2 text-xs font-bold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition"
          >
            {submitting ? 'Executing...' : mode === 'MINT' ? 'Issue USDF' : 'Burn USDF'}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {errorMsg && (
        <div role="alert" className="rounded-2xl border border-rose-500/40 bg-rose-950/60 p-3.5 text-xs text-rose-200 flex items-center gap-2 font-mono">
          <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {lastOrder && (
        <div className="rounded-2xl border border-emerald-500/30 bg-emerald-950/30 p-3.5 text-xs space-y-1 font-mono">
          <div className="flex items-center justify-between text-emerald-300 font-bold">
            <span className="flex items-center gap-1.5">
              {lastOrder.status === 'QUEUED_TIMELOCK' ? (
                <Clock className="w-4 h-4 text-amber-400" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              )}
              {lastOrder.orderNo} ({lastOrder.status})
            </span>
            <span>Fee: ${lastOrder.feeUsd.toLocaleString()}</span>
          </div>
          {lastOrder.txHash && <p className="text-zinc-400 truncate">TxHash: {lastOrder.txHash}</p>}
          {lastOrder.timelockEta && (
            <p className="text-amber-300">24h Multi-Sig Timelock ETA: {new Date(lastOrder.timelockEta).toLocaleString()}</p>
          )}
        </div>
      )}

      <div className="space-y-2 pt-2 border-t border-white/10">
        <span className="text-xs font-semibold uppercase text-zinc-400">Recent Issuance & Redemption Orders</span>
        <div className="space-y-1.5 max-h-44 overflow-y-auto pr-1">
          {orders.map((o) => (
            <div key={o.orderNo} className="rounded-xl border border-white/5 bg-zinc-950/70 px-3 py-2 text-xs flex items-center justify-between font-mono">
              <div>
                <span className={o.orderType === 'MINT' ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                  {o.orderType}
                </span>{' '}
                <span className="text-white">${o.amountUsd.toLocaleString()}</span>
                <span className="text-zinc-500 ml-2">({o.partnerSite})</span>
              </div>
              <span className={`px-2 py-0.5 rounded text-[10px] ${
                o.status === 'EXECUTED'
                  ? 'bg-emerald-500/15 text-emerald-300'
                  : 'bg-amber-500/15 text-amber-300'
              }`}>
                {o.status}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
