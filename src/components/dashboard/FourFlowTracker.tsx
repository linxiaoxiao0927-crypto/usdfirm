'use client';

import React, { useState } from 'react';
import {
  Workflow,
  CheckCircle2,
  AlertTriangle,
  PlusCircle,
} from 'lucide-react';
import type { FourFlowEscrowRecord, LedgerSnapshot } from '@/types/ledger';
import { EscrowOrderCard } from '@/components/dashboard/EscrowOrderCard';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

interface FourFlowTrackerProps {
  escrows: FourFlowEscrowRecord[];
  onSnapshotUpdate: (snap: LedgerSnapshot) => void;
}

export function FourFlowTracker({
  escrows,
  onSnapshotUpdate,
}: FourFlowTrackerProps) {
  const { copy, resolveError } = useUsdfirmLocale();
  const t = copy.dashboard.escrow;

  const [settlingOrder, setSettlingOrder] = useState<string | null>(null);
  const [newSite, setNewSite] = useState('hmm.sale');
  const [newAmount, setNewAmount] = useState('18000');
  const [status, setStatus] = useState<
    'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  >('IDLE');
  const [feedback, setFeedback] = useState('');
  const [errorCode, setErrorCode] = useState<string | null>(null);

  const handleCreateOrder = async () => {
    const orderNo = `ORD-${newSite.split('.')[0].toUpperCase()}-${Date.now().toString().slice(-4)}`;
    const numericAmount = Number(newAmount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setStatus('ERROR');
      setErrorCode('ERR_INVALID_AMOUNT');
      setFeedback(resolveError('ERR_INVALID_AMOUNT'));
      return;
    }

    setSettlingOrder(orderNo);
    setStatus('LOADING');
    setFeedback('');
    setErrorCode(null);

    try {
      const res = await fetch('/api/v1/escrow', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          orderNo,
          sourceSite: newSite,
          buyerEntity: 'ENT-SOFA-CORE',
          totalAmountAsd: numericAmount,
          setupyesEntity: `DID-SG-${Date.now().toString().slice(-5)}`,
          taxyesRouteId: 'TAX-1039-ROUTE-AUTO',
          xpayesPayment: `XPAY-${Date.now().toString().slice(-6)}`,
          idempotencyKey: `create-${orderNo}-${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_INTERNAL_SERVER';
        setStatus('ERROR');
        setErrorCode(code);
        setFeedback(resolveError(code, json.error?.message));
        return;
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setFeedback(t.formatCreateSuccess(newSite, orderNo, numericAmount));
    } catch {
      const code = 'ERR_LEDGER_SYNC_FAILED';
      setStatus('ERROR');
      setErrorCode(code);
      setFeedback(resolveError(code));
    } finally {
      setSettlingOrder(null);
    }
  };

  const handleSettleOrder = async (escrow: FourFlowEscrowRecord) => {
    setSettlingOrder(escrow.orderNo);
    setStatus('LOADING');
    setFeedback('');
    setErrorCode(null);

    try {
      const res = await fetch('/api/v1/escrow', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'SETTLE',
          orderNo: escrow.orderNo,
          setupyesEntity: escrow.setupyesEntity ?? 'DID-HK-AUTO-991',
          taxyesRouteId: escrow.taxyesRouteId ?? 'TAX-1039-ROUTE-01',
          xpayesPayment: escrow.xpayesPayment ?? 'XPAY-LOCK-8812',
          uptoyesWaybill:
            escrow.uptoyesWaybill ?? 'UPTO-UWB-DRONE-WIN-09',
          idempotencyKey: `settle-${escrow.orderNo}-${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_INTERNAL_SERVER';
        setStatus('ERROR');
        setErrorCode(code);
        setFeedback(resolveError(code, json.error?.message));
        return;
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setFeedback(
        t.formatSettleSuccess(
          escrow.orderNo,
          json.data.splitEntries.length,
          escrow.totalAmountAsd
        )
      );
    } catch {
      const code = 'ERR_LEDGER_SYNC_FAILED';
      setStatus('ERROR');
      setErrorCode(code);
      setFeedback(resolveError(code));
    } finally {
      setSettlingOrder(null);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Workflow className="w-5 h-5 text-cyan-400" />
            <h2 className="text-lg font-bold text-white">{t.title}</h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            {t.flowEntityPrefix} (<span className="text-emerald-400 font-mono">setupyes</span>) +{' '}
            {t.flowTaxPrefix} (<span className="text-amber-400 font-mono">taxyesai</span>) +{' '}
            {t.flowCapitalPrefix} (<span className="text-cyan-400 font-mono">xpayes</span>) +{' '}
            {t.flowLogisticsPrefix} (<span className="text-purple-400 font-mono">uptoyes</span>)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            aria-label={t.siteSelectAria}
            className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-1.5 text-xs text-white"
          >
            <option value="hmm.sale">{t.siteOptions.hmm}</option>
            <option value="sheng.sale">{t.siteOptions.sheng}</option>
            <option value="dezi.life">{t.siteOptions.dezi}</option>
            <option value="dcdy.life">{t.siteOptions.dcdy}</option>
            <option value="lookplum.com">{t.siteOptions.lookplum}</option>
          </select>
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            aria-label={t.amountAria}
            className="w-24 rounded-xl border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-xs font-mono text-white"
          />
          <button
            type="button"
            disabled={status === 'LOADING'}
            onClick={handleCreateOrder}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            {t.createBtn}
          </button>
        </div>
      </div>

      {escrows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-zinc-400">
          {t.emptyState}
        </div>
      ) : (
        <div className="space-y-4">
          {escrows.map((esc) => (
            <EscrowOrderCard
              key={esc.id}
              esc={esc}
              isLoadingThis={
                status === 'LOADING' && settlingOrder === esc.orderNo
              }
              onSettle={handleSettleOrder}
            />
          ))}
        </div>
      )}

      {status !== 'IDLE' && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-xs flex items-center justify-between gap-2">
          {status === 'SUCCESS' && (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {feedback}
            </span>
          )}
          {status === 'ERROR' && (
            <>
              <span className="text-rose-400 flex items-center gap-1.5">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {feedback}
              </span>
              {errorCode && (
                <code className="rounded bg-black/40 px-2 py-0.5 font-mono text-[10px] text-rose-300">
                  {errorCode}
                </code>
              )}
            </>
          )}
        </div>
      )}
    </div>
  );
}
