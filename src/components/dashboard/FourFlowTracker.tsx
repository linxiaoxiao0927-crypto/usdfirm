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

interface FourFlowTrackerProps {
  escrows: FourFlowEscrowRecord[];
  onSnapshotUpdate: (snap: LedgerSnapshot) => void;
}

export function FourFlowTracker({
  escrows,
  onSnapshotUpdate,
}: FourFlowTrackerProps) {
  const [settlingOrder, setSettlingOrder] = useState<string | null>(null);
  const [newSite, setNewSite] = useState('hmm.sale');
  const [newAmount, setNewAmount] = useState('18000');
  const [status, setStatus] = useState<
    'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  >('IDLE');
  const [feedback, setFeedback] = useState('');

  const handleCreateOrder = async () => {
    const orderNo = `ORD-${newSite.split('.')[0].toUpperCase()}-${Date.now().toString().slice(-4)}`;
    setSettlingOrder(orderNo);
    setStatus('LOADING');
    setFeedback('');

    try {
      const res = await fetch('/api/v1/escrow', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'CREATE',
          orderNo,
          sourceSite: newSite,
          buyerEntity: 'ENT-SOFA-CORE',
          totalAmountAsd: Number(newAmount),
          setupyesEntity: `DID-SG-${Date.now().toString().slice(-5)}`,
          taxyesRouteId: 'TAX-1039-ROUTE-AUTO',
          xpayesPayment: `XPAY-${Date.now().toString().slice(-6)}`,
          idempotencyKey: `create-${orderNo}-${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? '发起四流合一托管单失败');
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setFeedback(
        `已为 [${newSite}] 创建四流合一托管单 ${orderNo}，锁定 ${Number(
          newAmount
        ).toLocaleString()} ASD-S，等待 UptoYes 履约签收`
      );
    } catch (err) {
      setStatus('ERROR');
      setFeedback(err instanceof Error ? err.message : '创建托管单异常');
    } finally {
      setSettlingOrder(null);
    }
  };

  const handleSettleOrder = async (escrow: FourFlowEscrowRecord) => {
    setSettlingOrder(escrow.orderNo);
    setStatus('LOADING');
    setFeedback('');

    try {
      const res = await fetch('/api/v1/escrow', {
        method: 'POST',
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
        throw new Error(json.error?.message ?? '四流合一清算触发失败');
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setFeedback(
        `订单 ${escrow.orderNo} 四流对齐完毕！已向 ${json.data.splitEntries.length} 方实时划转 ${escrow.totalAmountAsd.toLocaleString()} ASD-S`
      );
    } catch (err) {
      setStatus('ERROR');
      setFeedback(err instanceof Error ? err.message : '清算网络异常');
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
            <h2 className="text-lg font-bold text-white">
              “四流合一”智能托管与多方自动分润台
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            主体生成 (<span className="text-emerald-400 font-mono">setupyes</span>) +
            税务路由 (<span className="text-amber-400 font-mono">taxyesai</span>) +
            资金清算 (<span className="text-cyan-400 font-mono">xpayes</span>) +
            物理履约 (<span className="text-purple-400 font-mono">uptoyes</span>)
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <select
            value={newSite}
            onChange={(e) => setNewSite(e.target.value)}
            aria-label="选择发起托管的零售或品牌站点"
            className="rounded-xl border border-white/10 bg-zinc-950 px-3 py-1.5 text-xs text-white"
          >
            <option value="hmm.sale">hmm.sale (跨境商城)</option>
            <option value="sheng.sale">sheng.sale (省手特卖)</option>
            <option value="dezi.life">dezi.life (嘚滋供应链)</option>
            <option value="dcdy.life">dcdy.life (肚肠得意火锅)</option>
            <option value="lookplum.com">lookplum.com (望梅饮品)</option>
          </select>
          <input
            type="number"
            value={newAmount}
            onChange={(e) => setNewAmount(e.target.value)}
            aria-label="托管订单金额 ASD-S"
            className="w-24 rounded-xl border border-white/10 bg-zinc-950 px-2.5 py-1.5 text-xs font-mono text-white"
          />
          <button
            type="button"
            disabled={status === 'LOADING'}
            onClick={handleCreateOrder}
            className="inline-flex items-center gap-1.5 rounded-xl bg-cyan-500 px-3 py-1.5 text-xs font-semibold text-zinc-950 hover:bg-cyan-400 disabled:opacity-50 transition"
          >
            <PlusCircle className="w-3.5 h-3.5" />
            发起跨站托管单
          </button>
        </div>
      </div>

      {escrows.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-zinc-400">
          当前暂无处于托管或分润状态的跨境/供应链订单 (Empty State)
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
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-xs flex items-center gap-2">
          {status === 'SUCCESS' && (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {feedback}
            </span>
          )}
          {status === 'ERROR' && (
            <span className="text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {feedback}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
