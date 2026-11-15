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
import { useUsdfirmLocale, extractErrorCode } from '@/lib/usdfirm/i18n';

export function DeveloperSdkPanel() {
  const { copy, resolveError } = useUsdfirmLocale();
  const t = copy.dashboard.developer;

  const [audit, setAudit] = useState<TrialBalanceAuditReport | null>(null);
  const [credentials, setCredentials] = useState<SiteSdkCredential[]>([]);
  const [auditErrorCode, setAuditErrorCode] = useState<string | null>(null);
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
  const [signErrorCode, setSignErrorCode] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/v1/developer', { cache: 'no-store' })
      .then((r) => r.json())
      .then((json) => {
        if (cancelled) return;
        if (json.success && json.data) {
          setAudit(json.data.trialBalance);
          setCredentials(json.data.sdkCredentials);
          setAuditErrorCode(null);
        } else {
          setAuditErrorCode(extractErrorCode(json) || 'ERR_LEDGER_AUDIT_FETCH');
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAuditErrorCode('ERR_LEDGER_AUDIT_FETCH');
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const handleSign = async (e: React.FormEvent) => {
    e.preventDefault();
    const numericAmount = Number(amountAsdS);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setStatus('ERROR');
      setSignErrorCode('ERR_INVALID_AMOUNT');
      setErrMsg(resolveError('ERR_INVALID_AMOUNT'));
      return;
    }

    setStatus('LOADING');
    setErrMsg('');
    setSignErrorCode(null);
    try {
      const res = await fetch('/api/v1/developer', {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sourceSite,
          targetSite,
          eventType: 'COMPUTE_LEASE_PAYOUT',
          amountAsdS: numericAmount,
          idempotencyKey: `sdk-idem-${Date.now().toString().slice(-6)}`,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        const code = extractErrorCode(json) || 'ERR_HMAC_SIGN_FAILED';
        setStatus('ERROR');
        setSignErrorCode(code);
        setErrMsg(resolveError(code, json.error?.message));
        return;
      }
      setSignedData(json.data);
      setStatus('SUCCESS');
    } catch {
      const code = 'ERR_HMAC_SIGN_FAILED';
      setStatus('ERROR');
      setSignErrorCode(code);
      setErrMsg(resolveError(code));
    }
  };

  return (
    <div className="rounded-3xl bg-[#1C1D21] p-6 sm:p-8 space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3 pb-1">
        <div>
          <div className="flex items-center gap-2">
            <KeyRound className="w-5 h-5 text-[#00DC6D]" />
            <h2 className="text-lg font-bold text-[#F4F4F6]">{t.title}</h2>
          </div>
          <p className="text-xs text-white/60 mt-1">{t.subtitle}</p>
        </div>
        {audit && (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D]/15 px-3.5 py-1 text-xs font-mono font-semibold text-[#00DC6D]">
            <Scale className="w-3.5 h-3.5" />
            {t.variancePrefix} {audit.varianceAsdS} USDF / {audit.varianceAsdG} uUSDF
          </span>
        )}
      </div>

      {auditErrorCode && (
        <div
          role="alert"
          className="sm-bento-rose rounded-2xl px-4 py-3 text-xs text-[#FDA4AF] flex items-center justify-between gap-2"
        >
          <span className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            {resolveError(auditErrorCode)}
          </span>
          <code className="rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
            {auditErrorCode}
          </code>
        </div>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
        {credentials.map((cred) => (
          <div
            key={cred.keyId}
            className="rounded-2xl bg-[#24262C] p-4 space-y-2 text-xs hover:bg-[#26272B] transition"
          >
            <div className="flex items-center justify-between">
              <span className="font-mono font-bold text-[#F4F4F6]">
                {cred.siteDomain}
              </span>
              <span className="font-mono text-[10px] text-[#00DC6D]">
                {cred.keyId}
              </span>
            </div>
            <p className="font-mono text-[11px] text-white/60">
              {t.secretPrefix} {cred.maskedSecret}
            </p>
            <div className="flex flex-wrap gap-1 pt-1">
              {cred.scopes.map((sc) => (
                <span
                  key={sc}
                  className="rounded-full bg-[#D4A853]/15 px-2 py-0.5 font-mono text-[10px] text-[#FCD34D]"
                >
                  {sc}
                </span>
              ))}
            </div>
          </div>
        ))}
      </div>

      <form
        onSubmit={handleSign}
        noValidate
        className="rounded-2xl bg-[#24262C] p-5 space-y-4"
      >
        <div className="flex items-center gap-2 text-xs font-semibold text-[#F4F4F6]">
          <Code2 className="w-4 h-4 text-[#00DC6D]" />
          <span>{t.signerTitle}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <select
            value={sourceSite}
            onChange={(e) => setSourceSite(e.target.value)}
            aria-label={t.sourceAria}
            className="rounded-xl bg-white/[0.075] focus:bg-white/[0.12] px-3 py-2.5 text-xs text-[#F4F4F6] focus:outline-none"
          >
            <option value="sofayes.com" className="bg-[#18191C] text-white">sofayes.com</option>
            <option value="hmm.sale" className="bg-[#18191C] text-white">hmm.sale</option>
            <option value="dezi.life" className="bg-[#18191C] text-white">dezi.life</option>
          </select>
          <select
            value={targetSite}
            onChange={(e) => setTargetSite(e.target.value)}
            aria-label={t.targetAria}
            className="rounded-xl bg-white/[0.075] focus:bg-white/[0.12] px-3 py-2.5 text-xs text-[#F4F4F6] focus:outline-none"
          >
            <option value="idles.site" className="bg-[#18191C] text-white">idles.site</option>
            <option value="taxyesai.com" className="bg-[#18191C] text-white">taxyesai.com</option>
            <option value="uptoyes.com" className="bg-[#18191C] text-white">uptoyes.com</option>
          </select>
          <div className="flex gap-2">
            <input
              type="number"
              value={amountAsdS}
              onChange={(e) => setAmountAsdS(e.target.value)}
              aria-label={t.amountAria}
              className="w-full rounded-xl bg-white/[0.075] focus:bg-white/[0.12] px-3 py-2.5 text-xs font-mono text-[#F4F4F6] focus:outline-none"
            />
            <button
              type="submit"
              disabled={status === 'LOADING'}
              className="shrink-0 rounded-full bg-[#00DC6D] px-4 py-2.5 text-xs font-bold text-[#090A0F] hover:bg-[#19E67C] transition"
            >
              {t.signBtn}
            </button>
          </div>
        </div>

        {status === 'LOADING' && (
          <div className="text-xs text-[#FCD34D] flex items-center gap-1.5">
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            {t.loadingMsg}
          </div>
        )}
        {status === 'ERROR' && (
          <div className="sm-bento-rose rounded-xl p-3 text-xs text-[#FDA4AF] flex items-center justify-between gap-2">
            <span className="flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {errMsg}
            </span>
            {signErrorCode && (
              <code className="rounded-full bg-[#090A0F]/60 px-2.5 py-0.5 font-mono text-[10px] text-[#FDA4AF]">
                {signErrorCode}
              </code>
            )}
          </div>
        )}
        {status === 'SUCCESS' && signedData && (
          <div className="sm-bento-teal rounded-2xl p-4 space-y-2 text-[11px] font-mono">
            <div className="flex items-center gap-1.5 text-[#00DC6D] font-sans font-semibold">
              <CheckCircle2 className="w-3.5 h-3.5" />
              {t.signedPrefix} {signedData.hmacSignature}
            </div>
            <pre className="overflow-x-auto text-white/85 bg-[#090A0F]/55 p-3 rounded-xl">
              {signedData.curlSnippet}
            </pre>
          </div>
        )}
      </form>
    </div>
  );
}
