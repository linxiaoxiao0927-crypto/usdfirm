'use client';

import React, { useEffect, useState } from 'react';
import {
  KeyRound,
  Scale,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type {
  SiteSdkCredential,
  TrialBalanceAuditReport,
} from '@/lib/developer-audit';

export function DeveloperSdkPanel() {
  const [audit, setAudit] = useState<TrialBalanceAuditReport | null>(null);
  const [credentials, setCredentials] = useState<SiteSdkCredential[]>([]);
  const [sourceSite, setSourceSite] = useState('sofayes.com');
  const [targetSite, setTargetSite] = useState('idles.site');
  const [amountAsdS, setAmountAsdS] = useState('1200');
  const [signedData, setSignedData] = useState<{
    hmacSignature: string;
    canonicalString: string;
    curlSnippet: string;
  } | null>(null);
  const [status, setStatus] = useState<'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'>('IDLE');
  const [errMsg, setErrMsg] = useState('');

  useEffect(() => {
    fetch('/api/v1/developer')
      .then((r) => r.json())
      .then((json) => {
        if (json.success && json.data) {
          setAudit(json.data.trialBalance);
          setCredentials(json.data.sdkCredentials);
        }
      })
      .catch(() => {});
  }, []);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('LOADING');
    setErrMsg('');
    try {
      const res = await fetch('/api/v1/developer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSite,
          targetSite,
          eventType: 'COMPUTE_LEASE_PAYOUT',
          amountAsdS: Number(amountAsdS),
          idempotencyKey: `sdk-idem-${Date.now().toString().slice(-6)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? '签名生成失败');
      }
      setSignedData(json.data);
      setStatus('SUCCESS');
    } catch (err) {
      setStatus('ERROR');
      setErrMsg(err instanceof Error ? err.message : '请求失败');
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-emerald-400" />
            <h2 className="text-lg font-bold text-white">
              跨站开发者 SDK 网关 & T+0 试算平衡审计控制台
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            为 29+ 矩阵站点颁发最小权限 API Key，提供 T+0 借贷试算平衡表与真实 HMAC-SHA256 报文签名生成
          </p>
        </div>
        {audit && (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-500/30 bg-emerald-500/10 px-3 py-1 text-xs font-mono text-emerald-300">
            <Scale className="w-3.5 h-3.5" />
            T+0 借贷差额: {audit.varianceAsdS} ASD-S / {audit.varianceAsdG} ASD-G
          </span>
        )}
      </div>

      {/* 跨站 API Key 矩阵 */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {credentials.map((cred) => (
          <div
            key={cred.keyId}
            className="rounded-2xl border border-white/10 bg-zinc-950/75 p-4 space-y-2 text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-white">
                {cred.siteDomain}
              </span>
              <span className="font-mono text-[10px] text-emerald-400">
                {cred.keyId}
              </span>
            </div>
            <p className="font-mono text-[11px] text-zinc-400">
              Secret: {cred.maskedSecret}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {cred.scopes.map((sc) => (
                <span
                  key={sc}
                  className="rounded bg-white/10 px-1.5 py-0.5 font-mono text-[10px] text-amber-300"
                >
                  {sc}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* HMAC-SHA256 跨站签名与 cURL 生成器 */}
      <form
        onSubmit={handleSign}
        className="rounded-2xl border border-white/10 bg-zinc-950/80 p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-white">
          <Code2 className="w-4 h-4 text-cyan-400" />
          <span>跨站 Webhook HMAC-SHA256 签名计算与 cURL 生成器</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={sourceSite}
            onChange={(e) => setSourceSite(e.target.value)}
            aria-label="签名发起站点"
            className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white"
          >
            <option value="sofayes.com">sofayes.com</option>
            <option value="hmm.sale">hmm.sale</option>
            <option value="dezi.life">dezi.life</option>
          </select>
          <select
            value={targetSite}
            onChange={(e) => setTargetSite(e.target.value)}
            aria-label="签名目标站点"
            className="rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white"
          >
            <option value="idles.site">idles.site</option>
            <option value="taxyesai.com">taxyesai.com</option>
            <option value="uptoyes.com">uptoyes.com</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={amountAsdS}
              onChange={(e) => setAmountAsdS(e.target.value)}
              aria-label="签名金额 ASD-S"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-xs font-mono text-white"
            />
            <button
              type="submit"
              disabled={status === 'LOADING'}
              className="shrink-0 rounded-xl bg-cyan-500 px-4 py-2 text-xs font-semibold text-zinc-950 hover:bg-cyan-400 transition"
            >
              生成签名
            </button>
          </div>
        </div>

        {status === 'LOADING' && (
          <div className="text-xs text-amber-300 flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            正在使用 OpenSSL HMAC-SHA256 计算签名...
          </div>
        )}
        {status === 'ERROR' && (
          <div className="text-xs text-rose-400 flex items-center gap-1.5">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {errMsg}
          </div>
        )}
        {status === 'SUCCESS' && signedData && (
          <div className="rounded-xl border border-cyan-500/30 bg-zinc-900/90 p-3.5 space-y-2 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-emerald-400 font-sans font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              HMAC-SHA256 签名已生成: {signedData.hmacSignature}
            </div>
            <pre className="overflow-x-auto text-zinc-300 bg-black/50 p-2.5 rounded-lg">
              {signedData.curlSnippet}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
}
