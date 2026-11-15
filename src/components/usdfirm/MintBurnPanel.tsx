'use client';

import React, { useState, useEffect } from 'react';
import { Coins, Flame, ArrowRight, AlertTriangle, CheckCircle2, Clock } from 'lucide-react';
import type { UsdfMintBurnOrderRecord, UsdfirmProtocolBundle } from '@/lib/usdfirm/types';
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

interface MintBurnPanelProps {
  initialOrders: UsdfMintBurnOrderRecord[];
  onRefresh: () => void;
  onBundleUpdate?: (bundle: UsdfirmProtocolBundle) => void;
}

export function MintBurnPanel({
  initialOrders,
  onRefresh,
  onBundleUpdate,
}: MintBurnPanelProps) {
  const { copy, resolveError } = useUsdfirmLocale();
  const t = copy.mintBurn;

  const [mode, setMode] = useState<'MINT' | 'BURN'>('MINT');
  const [partnerSite, setPartnerSite] = useState<'xpayes.com' | 'usdfirm.com' | 'institutional_direct'>('xpayes.com');
  const [reserveId, setReserveId] = useState<'RSV-CASH' | 'RSV-TBILL'>('RSV-CASH');
  const [requesterPubkey, setRequesterPubkey] = useState('0x9965507D1a55bcC2695C58ba16FB37d819B0A4df');
  const [amount, setAmount] = useState('250000');
  const [reference, setReference] = useState('XPAY-WIRE-8842');
  const [burnSig, setBurnSig] = useState('0x9a8b7c6d5e4f3a2b1c0d9e8f7a6b5c4d3e2f1a0b');
  const [orders, setOrders] = useState<UsdfMintBurnOrderRecord[]>(initialOrders);
  const [submitting, setSubmitting] = useState(false);
  const [errorInfo, setErrorInfo] = useState<{ code: string; text: string } | null>(null);
  const [lastOrder, setLastOrder] = useState<UsdfMintBurnOrderRecord | null>(null);

  useEffect(() => {
    setOrders(initialOrders);
  }, [initialOrders]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorInfo(null);
    setLastOrder(null);

    try {
      const numericAmount = Number(amount);
      if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
        setErrorInfo({
          code: 'ERR_INVALID_USDF_AMOUNT',
          text: resolveError('ERR_INVALID_USDF_AMOUNT'),
        });
        return;
      }

      const endpoint = mode === 'MINT' ? '/api/v1/usdfirm/mint' : '/api/v1/usdfirm/burn';
      const body =
        mode === 'MINT'
          ? {
              partnerSite,
              requesterPubkey,
              amountUsd: numericAmount,
              reserveId,
              xpayesRef: partnerSite === 'xpayes.com' ? reference : undefined,
            }
          : {
              partnerSite,
              requesterPubkey,
              amountUsdf: numericAmount,
              reserveId,
              burnAuthorizationSignature: burnSig,
            };

      const res = await fetch(endpoint, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_INVALID_PAYLOAD';
        setErrorInfo({
          code,
          text: resolveError(code, json.error?.message),
        });
        return;
      }

      const newOrder: UsdfMintBurnOrderRecord = json.data.order;
      setLastOrder(newOrder);
      if (json.data.bundle && onBundleUpdate) {
        onBundleUpdate(json.data.bundle as UsdfirmProtocolBundle);
      } else {
        setOrders((prev) => [newOrder, ...prev.slice(0, 14)]);
        onRefresh();
      }
    } catch {
      setErrorInfo({
        code: 'ERR_WORKER_UNREACHABLE',
        text: resolveError('ERR_WORKER_UNREACHABLE'),
      });
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="rounded-3xl bg-[#1C1D21] p-6 space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <h3 className="text-lg font-bold text-[#F4F4F6] flex items-center gap-2">
            {mode === 'MINT' ? (
              <Coins className="w-5 h-5 text-[#00DC6D]" />
            ) : (
              <Flame className="w-5 h-5 text-[#FCD34D]" />
            )}
            {t.title}
          </h3>
          <p className="text-xs text-white/60 mt-0.5">{t.subtitle}</p>
        </div>

        <div className="flex rounded-full bg-[#24262C] p-1">
          <button
            type="button"
            onClick={() => {
              setMode('MINT');
              setErrorInfo(null);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              mode === 'MINT' ? 'bg-[#00DC6D] text-[#090A0F]' : 'text-white/65 hover:text-[#F4F4F6]'
            }`}
          >
            {t.mintTab}
          </button>
          <button
            type="button"
            onClick={() => {
              setMode('BURN');
              setErrorInfo(null);
            }}
            className={`rounded-full px-3.5 py-1.5 text-xs font-bold transition ${
              mode === 'BURN' ? 'bg-[#D4A853] text-[#090A0F]' : 'text-white/65 hover:text-[#F4F4F6]'
            }`}
          >
            {t.burnTab}
          </button>
        </div>
      </div>

      <form onSubmit={handleSubmit} noValidate className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
        <label className="space-y-1.5">
          <span className="text-white/60 font-medium">{t.partnerLabel}</span>
          <select
            value={partnerSite}
            onChange={(e) => setPartnerSite(e.target.value as typeof partnerSite)}
            className="w-full rounded-xl bg-[#24262C] focus:bg-[#26272B] px-3 py-2.5 text-[#F4F4F6] focus:outline-none"
          >
            <option value="xpayes.com" className="bg-[#18191C] text-white">{t.partnerXpayes}</option>
            <option value="usdfirm.com" className="bg-[#18191C] text-white">{t.partnerUsdfirm}</option>
            <option value="institutional_direct" className="bg-[#18191C] text-white">{t.partnerDirect}</option>
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-white/60 font-medium">{t.reserveLabel}</span>
          <select
            value={reserveId}
            onChange={(e) => setReserveId(e.target.value as typeof reserveId)}
            className="w-full rounded-xl bg-[#24262C] focus:bg-[#26272B] px-3 py-2.5 font-mono text-[#F4F4F6] focus:outline-none"
          >
            <option value="RSV-CASH" className="bg-[#18191C] text-white">{t.reserveCash}</option>
            <option value="RSV-TBILL" className="bg-[#18191C] text-white">{t.reserveTbill}</option>
          </select>
        </label>

        <label className="space-y-1.5">
          <span className="text-white/60 font-medium">
            {mode === 'MINT' ? t.amountLabelMint : t.amountLabelBurn}
          </span>
          <input
            type="number"
            min="1"
            step="any"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-xl bg-[#24262C] focus:bg-[#26272B] px-3 py-2.5 font-mono text-[#F4F4F6] focus:outline-none"
          />
        </label>

        {mode === 'MINT' ? (
          <label className="space-y-1.5">
            <span className="text-white/60 font-medium">{t.refLabel}</span>
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              className="w-full rounded-xl bg-[#24262C] focus:bg-[#26272B] px-3 py-2.5 font-mono text-[#F4F4F6] focus:outline-none"
            />
          </label>
        ) : (
          <label className="space-y-1.5">
            <span className="text-white/60 font-medium">{t.sigLabel}</span>
            <input
              type="text"
              value={burnSig}
              onChange={(e) => setBurnSig(e.target.value)}
              className="w-full rounded-xl bg-[#24262C] focus:bg-[#26272B] px-3 py-2.5 font-mono text-[#F4F4F6] focus:outline-none"
            />
          </label>
        )}

        <label className="space-y-1.5 sm:col-span-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-white/60 font-medium">{t.addressLabel}</span>
            <button
              type="button"
              onClick={() => setRequesterPubkey('0x7F367cc41522cE07553e846bc1068009752d4791')}
              className="text-[11px] text-[#FDA4AF] hover:underline font-mono"
            >
              {t.testOfacBtn}
            </button>
          </div>
          <input
            type="text"
            value={requesterPubkey}
            onChange={(e) => setRequesterPubkey(e.target.value)}
            className="w-full rounded-xl bg-[#24262C] focus:bg-[#26272B] px-3 py-2.5 font-mono text-[#F4F4F6] focus:outline-none"
          />
        </label>

        <div className="sm:col-span-2 flex flex-wrap items-center justify-between gap-2 pt-1">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setAmount('250000')}
              className="rounded-full bg-[#24262C] px-3 py-1.5 text-[11px] text-white/75 hover:bg-[#26272B] transition"
            >
              {t.presetInstant}
            </button>
            <button
              type="button"
              onClick={() => setAmount('2500000')}
              className="rounded-full bg-[#D4A853]/15 px-3 py-1.5 text-[11px] font-semibold text-[#FCD34D] hover:bg-[#D4A853]/25 transition"
            >
              {t.presetTimelock}
            </button>
          </div>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D] px-4 py-2 text-xs font-bold text-[#090A0F] hover:bg-[#19E67C] disabled:opacity-50 transition"
          >
            {submitting ? t.executing : mode === 'MINT' ? t.submitMint : t.submitBurn}
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>

      {errorInfo && (
        <div
          role="alert"
          className="sm-bento-rose rounded-2xl p-3.5 text-xs text-[#FDA4AF] flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{errorInfo.text}</span>
          </span>
          <code className="shrink-0 rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
            {errorInfo.code}
          </code>
        </div>
      )}

      {lastOrder && (
        <div className="sm-bento-emerald rounded-2xl p-3.5 text-xs space-y-1 font-mono">
          <div className="flex items-center justify-between text-[#6EE7B7] font-bold">
            <span className="flex items-center gap-1.5">
              {lastOrder.status === 'QUEUED_TIMELOCK' ? (
                <Clock className="w-4 h-4 text-[#FCD34D]" />
              ) : (
                <CheckCircle2 className="w-4 h-4 text-[#00DC6D]" />
              )}
              {lastOrder.orderNo} (
              {(t.statusLabels as Record<string, string>)[lastOrder.status] ||
                lastOrder.status}
              )
            </span>
            <span>
              {t.feeLabel}: ${lastOrder.feeUsd.toLocaleString()}
            </span>
          </div>
          {lastOrder.txHash && (
            <p className="text-white/70 truncate">
              {t.txHashLabel}: {lastOrder.txHash}
            </p>
          )}
          {lastOrder.traceId && (
            <p className="text-[#67E8F9] truncate">
              {t.traceIdLabel}: {lastOrder.traceId}
            </p>
          )}
          {lastOrder.status === 'QUEUED_TIMELOCK' && (
            <p className="text-[#FCD34D] font-sans">{t.timelockQueued}</p>
          )}
        </div>
      )}

      <div className="space-y-2 pt-1">
        <span className="text-xs font-semibold uppercase text-white/60">{t.recentOrders}</span>
        {orders.length === 0 ? (
          <div className="rounded-xl bg-[#24262C] p-4 text-center text-xs text-white/50">
            {t.emptyOrders}
          </div>
        ) : (
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            {orders.map((o) => {
              const displayType =
                o.orderType === 'MINT' ? t.orderTypeMint : t.orderTypeBurn;
              const statusKey = o.rawStatus || o.status;
              const displayStatus =
                (t.statusLabels as Record<string, string>)[statusKey] ||
                (t.statusLabels as Record<string, string>)[o.status] ||
                statusKey;
              return (
                <div
                  key={o.orderNo}
                  className="rounded-xl bg-[#24262C] px-3.5 py-2.5 text-xs flex items-center justify-between gap-2 font-mono"
                >
                  <div className="min-w-0">
                    <span
                      className={
                        o.orderType === 'MINT'
                          ? 'text-[#00DC6D] font-bold'
                          : 'text-[#FCD34D] font-bold'
                      }
                    >
                      {displayType}
                    </span>{' '}
                    <span className="text-[#F4F4F6]">${o.amountUsd.toLocaleString()}</span>
                    <span className="text-white/45 ml-2">({o.partnerSite})</span>
                    {o.traceId && (
                      <span className="text-[#67E8F9]/80 ml-2 text-[10px]">[{o.traceId}]</span>
                    )}
                  </div>
                  <span
                    className={`shrink-0 px-2.5 py-0.5 rounded-full text-[10px] font-semibold ${
                      o.status === 'EXECUTED' || o.status === 'SETTLED'
                        ? 'bg-[#00DC6D]/15 text-[#00DC6D]'
                        : 'bg-[#D4A853]/15 text-[#FCD34D]'
                    }`}
                  >
                    {displayStatus}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
