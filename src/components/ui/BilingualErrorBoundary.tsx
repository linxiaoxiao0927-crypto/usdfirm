'use client';

import React from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface State {
  hasError: boolean;
  errorCode: string;
}

export class BilingualErrorBoundary extends React.Component<
  { children: React.ReactNode; lang: 'zh' | 'en' },
  State
> {
  constructor(props: { children: React.ReactNode; lang: 'zh' | 'en' }) {
    super(props);
    this.state = { hasError: false, errorCode: 'ERR_RENDER_EXCEPTION' };
  }

  static getDerivedStateFromError(): State {
    return { hasError: true, errorCode: 'ERR_RENDER_EXCEPTION' };
  }

  componentDidCatch(): void {
    // Isolated fallback state without leaking raw English stack traces
  }

  render() {
    if (!this.state.hasError) {
      return this.props.children;
    }

    const isZh = this.props.lang === 'zh';
    return (
      <div className="my-8 mx-auto max-w-xl rounded-3xl sm-bento-rose p-6 space-y-4">
        <div className="flex items-center gap-2.5 text-[#FDA4AF] font-semibold text-sm">
          <AlertTriangle className="w-5 h-5 shrink-0" />
          <span>
            {isZh
              ? '界面视图渲染受阻，已触发零崩溃安全隔离'
              : 'View render interrupted; isolated safely without crash'}
          </span>
        </div>
        <p className="text-xs text-white/75 leading-relaxed">
          {isZh
            ? '部分动态数据格式暂时不可用，请点击下方按钮重试恢复当前模块。'
            : 'A dynamic module snapshot could not be rendered cleanly. Tap retry to recover.'}
        </p>
        <details className="text-[11px] font-mono text-white/60">
          <summary className="cursor-pointer select-none hover:text-white">
            {isZh ? '查看技术错误码' : 'Technical Error Code'}
          </summary>
          <code className="mt-1 inline-block rounded-lg bg-black/30 px-2.5 py-1 text-[#FDA4AF]">
            {this.state.errorCode}
          </code>
        </details>
        <button
          type="button"
          onClick={() => this.setState({ hasError: false })}
          className="inline-flex items-center gap-1.5 rounded-full bg-[#00DC6D] hover:bg-[#19E67C] text-[#090A0F] px-4 py-2 text-xs font-bold transition active:scale-95"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>{isZh ? '恢复视图' : 'Recover View'}</span>
        </button>
      </div>
    );
  }
}
