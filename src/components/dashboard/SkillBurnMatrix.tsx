'use client';

import React, { useState } from 'react';
import {
  Flame,
  Cpu,
  CheckCircle2,
  AlertTriangle,
  Loader2,
} from 'lucide-react';
import type {
  SkillDefinition,
  SkillCode,
  LedgerSnapshot,
} from '@/types/ledger';

interface SkillBurnMatrixProps {
  skills: SkillDefinition[];
  totalBurnedAsdG: number;
  onSnapshotUpdate: (snap: LedgerSnapshot) => void;
}

export function SkillBurnMatrix({
  skills,
  totalBurnedAsdG,
  onSnapshotUpdate,
}: SkillBurnMatrixProps) {
  const [activeCode, setActiveCode] = useState<SkillCode | null>(null);
  const [status, setStatus] = useState<
    'IDLE' | 'LOADING' | 'SUCCESS' | 'ERROR'
  >('IDLE');
  const [statusMsg, setStatusMsg] = useState('');

  const triggerSkillCall = async (skill: SkillDefinition) => {
    setActiveCode(skill.code);
    setStatus('LOADING');
    setStatusMsg('');

    try {
      const res = await fetch('/api/v1/gas', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          callerSite: 'sofayes.com',
          callerEntity: 'ENT-SOFA-CORE',
          skillCode: skill.code,
          units: 10,
          idempotencyKey: `gas-${skill.code}-${Date.now()}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message ?? 'Skill 算力扣费失败');
      }
      onSnapshotUpdate(json.data.snapshot);
      setStatus('SUCCESS');
      setStatusMsg(
        `调用 [${skill.domain}] 成功：扣减 ${json.data.totalGasConsumed.toLocaleString()} ASD-G（算力节点分润 ${json.data.providerGas.toLocaleString()} / 实时销毁 ${json.data.burnedGas.toLocaleString()}）`
      );
    } catch (err) {
      setStatus('ERROR');
      setStatusMsg(err instanceof Error ? err.message : '调用异常');
    } finally {
      setActiveCode(null);
    }
  };

  return (
    <div className="rounded-3xl border border-white/10 bg-zinc-900/75 p-6 sm:p-8 backdrop-blur-xl space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-amber-400" />
            <h2 className="text-lg font-bold text-white">
              AI Business Skills 燃料矩阵 (Skill_01 ~ Skill_06)
            </h2>
          </div>
          <p className="text-xs text-zinc-400 mt-1">
            所有跨站商业职能调用按 Token / 毫秒颗粒度实时扣减{' '}
            <span className="text-amber-300 font-mono">ASD-G</span>，自动执行节点分润与通缩销毁
          </p>
        </div>
        <span className="rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-1 text-xs font-mono text-amber-300">
          累计已燃烧: {totalBurnedAsdG.toLocaleString()} ASD-G
        </span>
      </div>

      {skills.length === 0 ? (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-6 text-center text-xs text-zinc-400">
          当前暂无已注册的 AI 商业技能接口 (Empty State)
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {skills.map((skill) => {
            const isCalling =
              status === 'LOADING' && activeCode === skill.code;
            return (
              <div
                key={skill.code}
                className="flex flex-col justify-between rounded-2xl border border-white/10 bg-white/5 p-5 hover:border-emerald-500/40 transition space-y-4"
              >
                <div className="space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="rounded-md bg-emerald-500/15 px-2 py-0.5 font-mono text-[11px] text-emerald-300 border border-emerald-500/30">
                      {skill.code.slice(0, 8)}
                    </span>
                    <span className="font-mono text-cyan-400 font-semibold">
                      {skill.domain}
                    </span>
                  </div>
                  <h3 className="text-sm font-bold text-white">
                    {skill.name}
                  </h3>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {skill.description}
                  </p>
                </div>

                <div className="space-y-3 pt-2 border-t border-white/10">
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>单价 ({skill.unitLabel})</span>
                    <span className="font-mono text-amber-300 font-semibold">
                      {skill.gasPerUnit.toLocaleString()} ASD-G
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[11px] text-zinc-400">
                    <span>分润 / 燃烧配比</span>
                    <span className="font-mono text-emerald-300">
                      {Math.round(skill.providerRatio * 100)}% 节点 /{' '}
                      {Math.round(skill.burnRatio * 100)}% 销毁
                    </span>
                  </div>
                  <button
                    type="button"
                    disabled={isCalling}
                    onClick={() => triggerSkillCall(skill)}
                    className="w-full flex items-center justify-center gap-1.5 rounded-xl border border-white/15 bg-white/10 py-2 text-xs font-semibold text-white hover:bg-emerald-500 hover:text-zinc-950 hover:border-emerald-400 disabled:opacity-50 transition"
                  >
                    {isCalling ? (
                      <>
                        <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        流式计费燃烧中...
                      </>
                    ) : (
                      <>
                        <Cpu className="w-3.5 h-3.5" />
                        模拟 10 单位编排调用
                      </>
                    )}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {status !== 'IDLE' && (
        <div className="rounded-2xl border border-white/10 bg-zinc-950/80 px-4 py-3 text-xs flex items-center gap-2">
          {status === 'LOADING' && (
            <span className="text-amber-300 flex items-center gap-1.5">
              <Loader2 className="w-4 h-4 animate-spin" />
              正在通过 XPayes + ASDCoin 状态通道执行毫秒级算力扣费...
            </span>
          )}
          {status === 'SUCCESS' && (
            <span className="text-emerald-400 flex items-center gap-1.5">
              <CheckCircle2 className="w-4 h-4 shrink-0" />
              {statusMsg}
            </span>
          )}
          {status === 'ERROR' && (
            <span className="text-rose-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {statusMsg}
            </span>
          )}
        </div>
      )}
    </div>
  );
}
