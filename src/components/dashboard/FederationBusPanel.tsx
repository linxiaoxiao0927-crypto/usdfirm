'use client';

import React, { useState } from 'react';
import {
  Network,
  Radio,
  ShieldAlert,
  CheckCircle2,
  Loader2,
  Zap,
} from 'lucide-react';
import type {
  FederationNodeItem,
  MatrixCluster,
  LedgerSnapshot,
} from '@/types/ledger';

interface FederationBusPanelProps {
  nodes: FederationNodeItem[];
  onSnapshotUpdate: (snap: LedgerSnapshot) => void;
}

const CLUSTER_LABELS: Record<MatrixCluster | 'ALL', string> = {
  ALL: '全部矩阵 (20+ 节点)',
  SUPER_APP: '流量母舰 (SofaYes)',
  FINTECH_CRYPTO: '金控清算 (XPayes/Itis)',
  B2B_INFRA_SKILLS: '企服基建 (Yes家族)',
  AI_VERTICALS: 'AI 垂直集群',
  RETAIL_BRANDS: '电商与餐饮品牌',
  HOLDING_LAB: '控股与实验室',
};

export function FederationBusPanel({
  nodes,
  onSnapshotUpdate,
}: FederationBusPanelProps) {
  const [clusterFilter, setClusterFilter] = useState<MatrixCluster | 'ALL'>('ALL');
  const [sourceSite, setSourceSite] = useState('sofayes.com');
  const [targetSite, setTargetSite] = useState('idles.site');
  const [eventType, setEventType] = useState<
    | 'COMPUTE_LEASE_PAYOUT'
    | 'CROSS_MALL_ORDER_LOCK'
    | 'TAX_ROUTE_REBATE'
    | 'SKILL_STREAM_SETTLE'
  >('COMPUTE_LEASE_PAYOUT');
  const [amountAsdS, setAmountAsdS] = useState('1500');
  const [tamperHmac, setTamperHmac] = useState(false);
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [feedback, setFeedback] = useState('');

  const filteredNodes =
    clusterFilter === 'ALL' ? nodes : nodes.filter((n) => n.cluster === clusterFilter);

  const handleDispatchEvent = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    setFeedback('');
    const hmacSignature = tamperHmac
      ? 'invalid_forged_sig_000'
      : `sha256=${Date.now().toString(16)}9f8a7b6c5d4e3f2a1b0c`;

    try {
      const res = await fetch('/api/v1/federation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSite,
          targetSite,
          eventType,
          amountAsdS: Number(amountAsdS),
          hmacSignature,
          payloadSummary: `${eventType}: 跨项目实时数据交流与自动清算包`,
          idempotencyKey: `fed-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? '跨站报文被网关拦截');
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setFeedback(
        `跨站报文验签通过！[${sourceSite} → ${targetSite}] 已清算 ${Number(
          amountAsdS
        ).toLocaleString()} ASD-S (流水: ${json.data.entry.txHash})`
      );
    } catch (err) {
      setStatus('ERROR');
      setFeedback(err instanceof Error ? err.message : '跨站通信异常');
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Network className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              ShineMight OS 跨项目联邦清算总线与数据交流中心
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            打通 29+ 矩阵站点双向数据报文（gRPC Stream / State Channel / HMAC Webhook），毫秒级对账
          </p>
        </div>
        <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-300">
          <Radio className="w-3.5 h-3.5 animate-pulse" />
          在线联邦节点: {nodes.length}
        </span>
      </div>

      <div className="flex flex-wrap gap-2">
        {(Object.keys(CLUSTER_LABELS) as Array<MatrixCluster | 'ALL'>).map((key) => (
          <button
            key={key}
            type="button"
            onClick={() => setClusterFilter(key)}
            className={`rounded-xl border px-3 py-1.5 text-xs font-medium transition ${
              clusterFilter === key
                ? 'border-emerald-500/50 bg-emerald-500/20 text-emerald-200'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            {CLUSTER_LABELS[key]}
          </button>
        ))}
      </div>

      {filteredNodes.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-zinc-400">
          当前筛选集群下暂无已连接的跨站联邦节点 (Empty State)
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 max-h-72 overflow-y-auto pr-1">
          {filteredNodes.map((node) => (
            <div
              key={node.domain}
              className="rounded-2xl border border-white/10 bg-zinc-950/75 p-4 space-y-1.5 hover:border-white/25 transition"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-mono font-bold text-white">{node.domain}</span>
                <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 font-mono text-[10px] text-emerald-300">
                  {node.latencyMs}ms
                </span>
              </div>
              <p className="text-xs font-semibold text-amber-300">{node.brandName}</p>
              <p className="text-[11px] text-zinc-400 line-clamp-2">{node.roleSummary}</p>
              <div className="pt-1.5 border-t border-white/10 flex items-center justify-between text-[10px] font-mono text-zinc-400">
                <span>24h: ${node.volume24hAsdS.toLocaleString()}</span>
                <span className="text-cyan-300">{node.protocolType}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      <form onSubmit={handleDispatchEvent} className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <Zap className="w-4 h-4 text-amber-400" />
            跨项目实时数据交流模拟器 (Inbound Webhook & HMAC-SHA256 验签)
          </span>
          <label className="inline-flex items-center gap-2 text-xs text-rose-300 cursor-pointer">
            <input
              type="checkbox"
              checked={tamperHmac}
              onChange={(e) => setTamperHmac(e.target.checked)}
              className="accent-rose-500"
            />
            模拟篡改 HMAC 签名 (测试安全拦截)
          </label>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">发起方项目</label>
            <select value={sourceSite} onChange={(e) => setSourceSite(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white">
              <option value="sofayes.com">sofayes.com (流量母舰)</option>
              <option value="hmm.sale">hmm.sale (跨境商城)</option>
              <option value="dezi.life">dezi.life (嘚滋餐饮SaaS)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">接收方项目</label>
            <select value={targetSite} onChange={(e) => setTargetSite(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white">
              <option value="idles.site">idles.site (GPU算力集群)</option>
              <option value="taxyesai.com">taxyesai.com (全球节税路由)</option>
              <option value="uptoyes.com">uptoyes.com (跨境集运/无人机)</option>
              <option value="tocads.com">tocads.com (AI投流Agent)</option>
              <option value="dcdy.life">dcdy.life (肚肠得意火锅)</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">数据协议类型</label>
            <select value={eventType} onChange={(e) => setEventType(e.target.value as typeof eventType)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white">
              <option value="COMPUTE_LEASE_PAYOUT">算力切片实时结算</option>
              <option value="CROSS_MALL_ORDER_LOCK">跨境/餐饮集采分账</option>
              <option value="TAX_ROUTE_REBATE">1039合规节税路由清算</option>
              <option value="SKILL_STREAM_SETTLE">AI Skill 流式微支付</option>
            </select>
          </div>
          <div>
            <label className="block text-[11px] text-zinc-400 mb-1">清算金额 (ASD-S)</label>
            <input type="number" value={amountAsdS} onChange={(e) => setAmountAsdS(e.target.value)} className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-mono text-white" />
          </div>
        </div>

        <div className="flex flex-wrap items-center justify-between gap-3 pt-1">
          <div className="text-xs">
            {status === 'LOADING' && (
              <span className="inline-flex items-center gap-1.5 text-amber-300">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                正在校验跨站 HMAC 签名并写入复式记账总账...
              </span>
            )}
            {status === 'ERROR' && (
              <span className="inline-flex items-center gap-1.5 text-rose-400">
                <ShieldAlert className="w-4 h-4 shrink-0" />
                {feedback}
              </span>
            )}
            {status === 'SUCCESS' && (
              <span className="inline-flex items-center gap-1.5 text-emerald-400">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                {feedback}
              </span>
            )}
          </div>
          <button type="submit" disabled={status === 'LOADING'} className="rounded-xl bg-emerald-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-emerald-400 disabled:opacity-50 transition">
            发送跨站数据报文并清算
          </button>
        </div>
      </form>
    </div>
  );
}
