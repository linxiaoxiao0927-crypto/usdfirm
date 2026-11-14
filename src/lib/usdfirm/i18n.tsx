'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';

export type UsdfirmLocale = 'zh' | 'en';

export interface LocalizedErrorEntry {
  zh: string;
  en: string;
}

export const USDFIRM_ERROR_DICTIONARY: Record<string, LocalizedErrorEntry> = {
  // Cloudflare DO Worker (usdfirm-rt-protocol) error codes
  ERR_INVALID_HMAC_SIGNATURE: {
    zh: 'HMAC-SHA256 签名校验失败：跨模块清算报文已被合规防火墙拦截',
    en: 'HMAC-SHA256 signature verification failed: cross-module clearing request blocked by compliance firewall.',
  },
  ERR_MISSING_CLEARING_HEADERS: {
    zh: '缺少必需的跨站清算安全头（X-SM-Caller / Trace-Id / Timestamp / Idempotency-Key / Signature）',
    en: 'Missing required clearing security headers (X-SM-Caller / Trace-Id / Timestamp / Idempotency-Key / Signature).',
  },
  ERR_TIMESTAMP_EXPIRED: {
    zh: '清算请求时间戳已过期（超过 300 秒允许时间窗口），已拒绝重放',
    en: 'Clearing request timestamp expired (outside the 300-second replay window).',
  },
  ERR_CLEARING_SECRET_NOT_CONFIGURED: {
    zh: '清算节点未配置 CLEARING_HMAC_SECRET 共享密钥',
    en: 'CLEARING_HMAC_SECRET is not configured on the clearing worker.',
  },
  ERR_REPLAY_DETECTED: {
    zh: '检测到幂等键重放攻击：该清算请求已被原子处理，禁止重复入账',
    en: 'Idempotency replay detected: this clearing request has already been processed.',
  },
  ERR_BUFFER_CAP_EXCEEDED: {
    zh: '超出隔离做市缓冲池 $20,000,000 USDF 硬顶限制，防火墙已阻止风险外溢',
    en: 'Segregated market-maker buffer $20,000,000 USDF hard cap exceeded; spillover blocked.',
  },
  ERR_BUFFER_INSUFFICIENT_ALLOCATED: {
    zh: '隔离做市缓冲池已分配余额不足，无法执行此次赎回扣减',
    en: 'Insufficient allocated balance in segregated market-maker buffer for redemption.',
  },
  ERR_TIMELOCK_ACTIVE: {
    zh: '时间锁处于冷却锁定状态：尚未到达最小延迟解锁时间，禁止提前执行',
    en: 'Timelock delay is still active: execution is locked until the mandatory delay expires.',
  },
  ERR_INVALID_AMOUNT: {
    zh: '无效金额参数：请求金额必须为正数且在单笔限额范围内',
    en: 'Invalid amount: requested amount must be positive and within allowed protocol limits.',
  },
  ERR_INVALID_USDF_AMOUNT: {
    zh: '无效的 USDF 金额：必须为大于 0 且不超过单笔上限的有效数值',
    en: 'Invalid USDF amount: must be a finite positive number within single-transaction bounds.',
  },
  ERR_INVALID_PAYLOAD: {
    zh: '请求报文格式无效或缺少必填协议字段',
    en: 'Invalid request payload format or missing required protocol fields.',
  },
  ERR_EXCEEDS_CIRCULATING_SUPPLY: {
    zh: '销毁请求数量超过当前流通 USDF 总量',
    en: 'Burn amount exceeds total circulating USDF supply.',
  },
  ERR_RESERVE_UNDERCOLLATERALIZED: {
    zh: '储备托管池可用美元余额不足，无法完成此次赎回出金',
    en: 'Insufficient USD balance in the designated reserve custody pool for redemption.',
  },
  ERR_PROPOSAL_NOT_FOUND: {
    zh: '未找到指定的多签时间锁治理提案',
    en: 'Multi-sig timelock proposal not found.',
  },
  ERR_PROPOSAL_ALREADY_EXECUTED: {
    zh: '该多签治理提案已完成执行，不可重复签署或触发',
    en: 'This multi-sig governance proposal has already been executed.',
  },
  ERR_MULTISIG_QUORUM_NOT_MET: {
    zh: '未满足 3-of-5 硬件多签法定门槛，无法执行该提案',
    en: '3-of-5 hardware multi-sig quorum has not been met yet.',
  },
  ERR_ROUTE_NOT_FOUND: {
    zh: '目标协议路由不存在',
    en: 'Requested protocol route not found.',
  },
  ERR_BAD_WS_MESSAGE: {
    zh: '实时 WebSocket 协议消息格式无效',
    en: 'Malformed WebSocket protocol message.',
  },

  // Protocol / API / Validation / Local Engine error codes
  ERR_WORKER_UNREACHABLE: {
    zh: '无法连接至 USDFirm 实时协议节点 (usdfirm-rt-protocol)，请检查网络或代理状态',
    en: 'Unable to reach live USDFirm protocol worker (usdfirm-rt-protocol). Check connectivity.',
  },
  ERR_GOVERNANCE_ONLY: {
    zh: '主网熔断开关受 3-of-5 硬件多签与预言机协议保护，禁止未经授权的远程直接变更',
    en: 'Mainnet circuit breaker is protected by 3-of-5 HSM governance and oracle telemetry; direct unauthenticated overrides are blocked.',
  },
  VALIDATION_ERROR: {
    zh: '请求参数校验失败：请检查输入地址、金额或必填字段格式',
    en: 'Parameter validation failed: please verify address format, amount, and required fields.',
  },
  COMPLIANCE_BLOCKED: {
    zh: '合规筛查拦截：目标地址命中 OFAC 制裁黑名单，禁止铸造或销毁 USDF',
    en: 'Compliance screen blocked: address matches OFAC sanctions list.',
  },
  POLICY_REJECTED: {
    zh: '风控策略拦截：当前请求未通过合规或每日限额审查',
    en: 'Policy rejected: request failed compliance or risk limit check.',
  },
  INVALID_AMOUNT: {
    zh: '输入金额必须大于 0',
    en: 'Amount must be greater than zero.',
  },
  INSUFFICIENT_CIRCULATION: {
    zh: '销毁数量超过当前生态流通中的 USDF 总量',
    en: 'Burn amount exceeds circulating USDF supply.',
  },
  RISK_CIRCUIT_BREAKER_ACTIVE: {
    zh: '全局风控熔断器已触发：当前协议已暂停新铸造操作',
    en: 'Global risk circuit breaker active: new minting operations are paused.',
  },
  RISK_DAILY_CAP_EXCEEDED: {
    zh: '超出每日 $25,000,000 USDF 铸造流速上限',
    en: 'Exceeds daily $25,000,000 USDF mint velocity cap.',
  },
  TIMELOCK_UNAUTHORIZED: {
    zh: '权限拒绝：提交者或签署人不在授权 5 人硬件多签委员会名单内',
    en: 'Unauthorized: caller is not an authorized multi-sig committee signer.',
  },
  TIMELOCK_NOT_FOUND: {
    zh: '未找到对应的多签时间锁提案',
    en: 'Timelock proposal not found.',
  },
  TIMELOCK_INVALID_STATE: {
    zh: '提案当前状态不允许执行签署操作',
    en: 'Proposal state does not allow confirmation.',
  },
  TIMELOCK_DUPLICATE_SIGN: {
    zh: '该硬件签名人已确认过此提案，请切换其他委员会密钥完成多签',
    en: 'This hardware signer has already confirmed the proposal; switch to another signer key.',
  },
  TIMELOCK_ALREADY_RESOLVED: {
    zh: '提案已处理完毕（已执行或已取消）',
    en: 'Proposal has already been resolved.',
  },
  TIMELOCK_THRESHOLD_UNMET: {
    zh: '多签确认数不足：执行前必须集齐至少 3-of-5 名硬件委员签署',
    en: 'Multi-sig quorum unmet: at least 3-of-5 hardware confirmations required before execution.',
  },
  TIMELOCK_STILL_LOCKED: {
    zh: '24 小时强制时间锁尚未到期，暂不可执行该提案',
    en: '24-hour mandatory timelock delay has not expired yet.',
  },
  XPAYES_INVALID_SIGNATURE: {
    zh: 'XPayes 网关 HMAC-SHA256 签名认证失败',
    en: 'XPayes gateway HMAC-SHA256 webhook signature authentication failed.',
  },
  XPAYES_IDEMPOTENCY_CONFLICT: {
    zh: 'XPayes 支付流水号幂等冲突：该清算流水已处理',
    en: 'XPayes idempotency conflict: paymentRef has already been settled.',
  },
  SEGREGATED_MM_INVALID_SIGNATURE: {
    zh: '隔离做市流动性桥接 HMAC-SHA256 签名认证失败',
    en: 'Segregated market-maker liquidity bridge HMAC-SHA256 verification failed.',
  },
  SEGREGATED_MM_NONCE_REPLAY: {
    zh: '隔离做市台 Nonce 重放冲突：该序号已被消费',
    en: 'Segregated market-maker nonce replay detected: desk nonce already consumed.',
  },
  SEGREGATED_MM_RISK_LIMIT: {
    zh: '超出 $20M 隔离做市缓冲上限，已阻断风险传导',
    en: '$20M segregated market-maker buffer cap exceeded; spillover prevented.',
  },
  SEGREGATED_MM_BUFFER_UNDERFLOW: {
    zh: '赎回金额大于当前已分配的隔离做市缓冲余额',
    en: 'Redemption exceeds currently allocated segregated liquidity buffer.',
  },
  AUTH_OR_IDEMPOTENCY_REJECTED: {
    zh: '跨站网关鉴权或幂等校验被拒绝',
    en: 'Cross-module gateway authentication or idempotency check rejected.',
  },
  RISK_OR_SIG_REJECTED: {
    zh: '风控隔离阈值或 HMAC 签名校验被拒绝',
    en: 'Segregated risk limit or HMAC signature check rejected.',
  },
  POR_FEED_ERROR: {
    zh: '无法获取实时 PoR 储备金证明快照',
    en: 'Unable to retrieve real-time Proof of Reserves attestation.',
  },
  MULTISIG_REJECTED: {
    zh: '多签时间锁操作被协议拒绝',
    en: 'Multi-sig timelock operation rejected by protocol.',
  },
  RISK_OP_ERROR: {
    zh: '风控状态操作异常',
    en: 'Risk telemetry operation error.',
  },
  UPSTREAM_LEDGER_NODE_TIMEOUT: {
    zh: '核心清算节点对账超时，严禁伪造降级，请排查节点连接',
    en: 'Upstream clearing ledger node timed out. Zero-Fake Policy: verify node health.',
  },
  UPSTREAM_LEDGER_ERROR: {
    zh: '清算总账节点同步失败，请稍后重试',
    en: 'Clearing ledger synchronization failed. Please retry.',
  },
  ERR_COMPLIANCE_FIREWALL_USE_SEGREGATED_BRIDGE: {
    zh: '合规防火墙隔离拦截：外部做市流动性必须通过 /api/v1/usdfirm/bridge/segregated-mm 隔离通道执行，并受 $20,000,000 硬顶约束',
    en: 'Compliance firewall blocked: external market-maker liquidity must use /api/v1/usdfirm/bridge/segregated-mm subject to the $20,000,000 segregated buffer cap.',
  },
  ERR_VALIDATION_FAILED: {
    zh: '请求参数校验失败：请检查输入格式、金额边界与必填字段',
    en: 'Request parameter validation failed: please verify input format, amount bounds, and required fields.',
  },
  ERR_LEDGER_SYNC_FAILED: {
    zh: '总账快照同步失败：核心清结算节点暂时不可用',
    en: 'Ledger snapshot sync failed: upstream clearing core unavailable.',
  },
  ERR_INSUFFICIENT_USDF_BALANCE: {
    zh: '账户可用 USDF 稳定币余额不足，无法完成扣减或托管锁定',
    en: 'Insufficient available USDF balance for debit or escrow lock.',
  },
  ERR_INSUFFICIENT_UUSDF_BALANCE: {
    zh: '账户可用 uUSDF 算力燃料余额不足，请先通过闪兑补充燃料',
    en: 'Insufficient uUSDF gas fuel balance. Swap USDF to uUSDF first.',
  },
  ERR_INSUFFICIENT_CIRCULATING: {
    zh: '销毁请求数量超过当前流通 USDF 总量',
    en: 'Burn amount exceeds circulating USDF supply.',
  },
  ERR_LEDGER_FATAL: {
    zh: '总账核心账目异常：未找到对应的复式记账子账户',
    en: 'Ledger account inconsistency: required double-entry subaccount not found.',
  },
  ERR_SKILL_NOT_FOUND: {
    zh: '未找到对应的 ShineMight 商业职能 Skill 节点',
    en: 'Requested ShineMight Business Skill node not found.',
  },
  ERR_ESCROW_DUPLICATE: {
    zh: '四流合一托管单号重复：请勿重复提交相同订单号',
    en: 'Duplicate 4-flow escrow order number.',
  },
  ERR_ESCROW_NOT_FOUND: {
    zh: '未找到指定的四流合一智能托管单据',
    en: 'Specified 4-flow escrow order not found.',
  },
  ERR_ESCROW_ALREADY_SETTLED: {
    zh: '该托管单据已核销或已撤销，不可重复终态结算',
    en: 'Escrow order has already been settled or refunded.',
  },
  ERR_MERKLE_ENGINE: {
    zh: 'Rust/Merkle 密码学证明引擎执行异常',
    en: 'Rust/Merkle cryptographic proof engine execution error.',
  },
  ERR_LEDGER_AUDIT_FETCH: {
    zh: '开发者对账审计数据拉取失败',
    en: 'Failed to retrieve developer reconciliation audit telemetry.',
  },
  ERR_HMAC_SIGN_FAILED: {
    zh: '跨站网关 HMAC-SHA256 签名工具调用失败',
    en: 'Cross-site HMAC-SHA256 signing helper failed.',
  },
  ERR_IDEMPOTENCY_CONFLICT: {
    zh: '幂等键重放拦截：该请求标识已被消费，禁止重复执行',
    en: 'Idempotency replay conflict: this request key has already been consumed.',
  },
  ERR_POLICY_REJECTED: {
    zh: '合规与风控策略拦截：当前请求未通过审核条件',
    en: 'Policy rejected: request failed compliance or risk verification.',
  },
  ERR_INTERNAL_SERVER: {
    zh: '协议内部服务异常，请检查节点状态或参数',
    en: 'Internal protocol error. Please check node status and parameters.',
  },
  INTERNAL_ERROR: {
    zh: '协议内部服务异常，请检查节点状态或参数',
    en: 'Internal protocol error. Please check node status and parameters.',
  },
  ERR_UNKNOWN: {
    zh: '未知协议异常，请检查输入参数及清算节点状态',
    en: 'Unexpected protocol error. Please verify inputs and clearing node status.',
  },
};

const KNOWN_CODE_TOKENS = Object.keys(USDFIRM_ERROR_DICTIONARY);

export function extractErrorCode(input: unknown): string | undefined {
  if (!input) return undefined;
  if (typeof input === 'string') {
    for (const code of KNOWN_CODE_TOKENS) {
      if (input.includes(code)) return code;
    }
    const errMatch = input.match(/\b(ERR_[A-Z0-9_]+)\b/);
    if (errMatch) return errMatch[1];
    return undefined;
  }
  if (typeof input === 'object') {
    const obj = input as Record<string, unknown>;
    if (typeof obj.errorCode === 'string' && obj.errorCode) return obj.errorCode;
    if (typeof obj.code === 'string' && obj.code) return obj.code;
    if (obj.error && typeof obj.error === 'object') {
      const nested = obj.error as Record<string, unknown>;
      if (typeof nested.errorCode === 'string' && nested.errorCode) return nested.errorCode;
      if (typeof nested.code === 'string' && nested.code) return nested.code;
      if (typeof nested.message === 'string') return extractErrorCode(nested.message);
    }
    if (typeof obj.message === 'string') return extractErrorCode(obj.message);
  }
  return undefined;
}

/**
 * Translates any Worker `ERR_*` code or backend error code strictly into `zh` or `en`.
 * Never leaks raw English error messages in `zh` mode, and never leaks Chinese characters in `en` mode.
 */
export function resolveUsdfirmError(
  errorCode?: string | null,
  fallbackMsg?: string | null,
  locale: UsdfirmLocale = 'zh'
): string {
  const normalizedCode = errorCode?.trim() || '';
  const fallback = fallbackMsg?.trim() || '';

  // 1. Check if fallback contains a more specific sub-code when top-level code is generic
  const GENERIC_WRAPPERS = new Set([
    'POLICY_REJECTED',
    'REJECTED',
    'MULTISIG_REJECTED',
    'AUTH_OR_IDEMPOTENCY_REJECTED',
    'RISK_OR_SIG_REJECTED',
    'INTERNAL_ERROR',
  ]);

  if (fallback) {
    for (const token of KNOWN_CODE_TOKENS) {
      if (
        fallback.includes(token) &&
        (!normalizedCode || GENERIC_WRAPPERS.has(normalizedCode) || normalizedCode === token)
      ) {
        return USDFIRM_ERROR_DICTIONARY[token][locale];
      }
    }
  }

  // 2. Direct match on errorCode
  if (normalizedCode && USDFIRM_ERROR_DICTIONARY[normalizedCode]) {
    return USDFIRM_ERROR_DICTIONARY[normalizedCode][locale];
  }

  // 3. Extract any ERR_* token from fallback
  if (fallback) {
    const extracted = extractErrorCode(fallback);
    if (extracted && USDFIRM_ERROR_DICTIONARY[extracted]) {
      return USDFIRM_ERROR_DICTIONARY[extracted][locale];
    }
  }

  // 4. Fallback strict language guard (Zero-Fake & Locale-Strict)
  return USDFIRM_ERROR_DICTIONARY.ERR_UNKNOWN[locale];
}

const LEDGER_SEED_EN_LABELS: Record<string, string> = {
  'C2M 供应链货款': 'C2M Supply Chain Principal',
  '包税集运与无人机派送': 'DDP Consolidation & Drone POD',
  '1039 合规税务预提': 'Cross-Border Tax Withholding',
  '财资清算燃烧回购池': 'Treasury Clearing & Buyback Pool',
  '肚肠得意底料集采主款': 'DCDY Broth & Cold-Chain Principal',
  '冷链干线物流履约': 'Cold-Chain Trunk Logistics',
  '园区合规节税托管': 'Compliant Tax-Zone Escrow',
  'sofayes.com 60fps词级对齐与声音克隆实时算力清算':
    'sofayes.com 60fps word-sync & voice cloning real-time compute clearing',
  'hmm.sale 跨境严选批次 #882 四流合一托管锁定':
    'hmm.sale cross-border C2M batch #882 4-flow escrow lock',
  'dezi.life 嘚滋餐饮供应链园区核定与分润税务路由':
    'dezi.life Dezi catering supply-chain & compliant tax split routing',
};

/** Translates initial Chinese seed labels/memos to clean English in `en` locale. */
export function translateLedgerSeedText(
  text: string,
  locale: UsdfirmLocale
): string {
  if (locale === 'zh') return text;
  if (LEDGER_SEED_EN_LABELS[text]) return LEDGER_SEED_EN_LABELS[text];
  // Fallback guard so dynamic seed Chinese text never leaks verbatim in strict EN mode
  if (/[\u4e00-\u9fff]/.test(text)) {
    return text.replace(/[\u4e00-\u9fff]+/g, 'Clearing Record').trim();
  }
  return text;
}

export const USDFIRM_UI_COPY = {
  zh: {
    localeToggleLabel: 'EN',
    localeBadge: '中文',
    console: {
      badge: 'ShineMight OS · USDFirm 发行核心',
      pegPill: '1 USDF = $1.00 USD (100%+ 足额美元储备锚定)',
      subtitle:
        '合规防火墙物理隔离：独立承载 USDF 铸造/销毁与多签储备透明公示，仅向 xpayes.com 输出流动性，与交易所撮合严格隔离',
      pageTitleSub: '美元稳定币底层发行协议 · PoR 储备金证明与多签财资池',
      syncLedger: '同步实时总账',
      liveTelemetryTag: 'Cloudflare DO 实时共识',
      viewScope: '视图域:',
      loadingSnapshot: '正在从 USDFirm 储备金与清算协议拉取 T+0 试算平衡快照...',
      errorAlertTitle: '真实告警 (Zero-Fake Policy)：跨站清结算节点通讯中断',
      reconnectBtn: '重连主清算通道',
      metricCircTitle: 'USDF 生态流通总量',
      metricCircSub: '1:1 美元国债与现金托管足额支持',
      metricTrialOk: '借贷试算平衡',
      metricTrialErr: '账务失衡告警',
      metricPorTitle: 'PoR 储备金充足率',
      metricPorSubPrefix: '总储备',
      metricPorBadge: '>= 100% 足额锚定',
      metricBurnTitle: 'AI Skill 算力燃料累计燃烧',
      metricBurnSub: '按 Token / 毫秒颗粒度实时销毁',
      metricBurnUnit: 'uUSDF',
      metricBurnBadge: '通缩分润引擎',
      metricFlowTitle: '四流合一合规对齐率',
      metricFlowSubPrefix: '实时脉冲吞吐',
      metricFlowUnit: '已对齐',
      metricFlowBadge: '主体+税+资+物',
      tabs: {
        ALL: '全景驾驶舱 (All)',
        USDFIRM: 'USDFirm 稳定币发行协议',
        RUST_CHAIN: 'Rust 合约 & Merkle 证明',
        FEDERATION: '29+ 跨站联邦总线',
        VAULT_SWAP: 'PoR 储备 & 双态闪兑',
        SKILLS: 'AI Skill 燃料矩阵',
        ESCROW: '四流合一智能托管',
        DEVELOPER: '开发者 SDK & 对账',
        LEDGER: '复式记账总账审计',
      },
    },
    dedicatedPage: {
      firewallBadge: 'Web2.5 合规防火墙 · 隔离稳定币发行层',
      pegBadge: '1 USDF = $1.00 USD (100%+ 储备支持)',
      subtitle: '机构级储备金证明 (PoR)、多签时间锁发行与流动性隔离协议',
      backHome: 'USDFirm 清算控制台',
    },
    hub: {
      protocolBadge: 'USDFirm.com 协议核心',
      protocolDesc: '物理隔离美元稳定币发行层、PoR 储备金预言机与 3-of-5 多签财资架构',
      wsLive: 'WSS 实时直连',
      wsConnecting: 'WSS 连接中...',
      wsReconnecting: 'WSS 断开 · 重连中',
      onlineNodes: '在线客户端',
      refreshOracle: '刷新预言机状态',
      dedicatedPortal: '独立协议门户 (/usdfirm)',
      loadingState: '正在同步 USDFirm.com 实时储备金证明与多签时间锁状态...',
      workerErrorTitle: '实时协议节点连接异常 (Zero-Fake Policy)',
      retryWorker: '重新连接 Worker',
    },
    por: {
      title: '实时储备金证明 (PoR) 加密审计看板',
      subtitle: '由独立审计机构与 USDFirm Durable Object PoR 预言机实时校验 100%+ 美元资产足额锚定',
      backingRatio: '储备抵押率',
      epochRound: '审计轮次',
      totalReserves: '已审计储备总资产',
      totalReservesSub: '托管于 BNY Mellon、Citi 与美联储逆回购专户',
      circulatingUsdf: '当前流通 USDF 总量',
      circulatingSub: '全网隔离发行与跨链金库流通净额',
      surplusBuffer: '超额抵押安全垫 (Surplus)',
      surplusSub: '100% 独立隔离风险准备金',
      breakdownTitle: '已审计储备资产构成明细',
      updatedAt: '最后校验时间',
      marketValue: '实时估值:',
      weight: '占比',
      apy: '年化收益',
      merkleLabel: 'SHA-256 密码学 Merkle 状态根:',
      oracleFeed: 'Chainlink PoR 预言机轮次',
      answerMicro: '储备估值 (microUSD)',
      viewCert: '查看独立审计师鉴证报告',
      assetTypes: {
        TREASURY: '美国短期国债',
        US_TREASURY_BILL: '美国短期国债',
        CASH: '美元现金托管',
        FDIC_CASH_DEPOSIT: '银行托管现金',
        OVERNIGHT_REPO: '美联储隔夜逆回购',
      },
    },
    mintBurn: {
      title: '机构级 USDF 铸造与销毁引擎',
      subtitle: '内置 OFAC 制裁筛查 · 单笔 > $2,000,000 USDF 自动触发 3-of-5 多签时间锁队列 · 交易所流动请走 $20M 隔离桥',
      mintTab: '铸造 USDF',
      burnTab: '销毁赎回',
      partnerLabel: '授权清算通道方',
      partnerXpayes: 'xpayes.com (法币支付网关入金)',
      partnerUsdfirm: 'usdfirm.com (协议合规储备发行池)',
      partnerDirect: 'institutional_direct (主财资库直连)',
      reserveLabel: '锚定储备托管池',
      reserveCash: 'RSV-CASH (Tier-1 托管行美元现金)',
      reserveTbill: 'RSV-TBILL (0-3M 短期美国国债)',
      amountLabelMint: '铸造数量 (USD 入金)',
      amountLabelBurn: '销毁数量 (USDF 赎回)',
      addressLabel: '接收 / 销毁机构地址或账户标识',
      testOfacBtn: '填充 OFAC 制裁地址测试',
      refLabel: '网关电汇 / 结算参考号',
      sigLabel: 'EIP-712 销毁授权签名',
      presetInstant: '$250K (即时结算)',
      presetTimelock: '$2.5M (触发多签时间锁)',
      executing: '正在链上/DO 结算...',
      submitMint: '执行铸造 USDF',
      submitBurn: '执行销毁 USDF',
      feeLabel: '协议费用',
      timelockQueued: '大额提案已进入 3-of-5 多签时间锁队列',
      recentOrders: '近期铸造与销毁清算流水',
      emptyOrders: '暂无铸造或销毁记录',
      orderTypeMint: '铸造',
      orderTypeBurn: '销毁',
      txHashLabel: '链上哈希',
      traceIdLabel: '链路追踪号',
      statusLabels: {
        SETTLED: '已清算',
        EXECUTED: '已执行',
        QUEUED_TIMELOCK: '时间锁排队',
        PENDING: '处理中',
        REJECTED: '已拦截',
      },
    },
    multisig: {
      title: '多签财资时间锁治理',
      subtitle: '强制执行硬件法定多签门槛与时间锁冷却期，防范单点秘钥失陷风险',
      minDelayBadge: '最小时间锁延迟: 24h / DO 实时验签',
      activeSigner: '当前操作硬件签名钥匙 (HSM)',
      queueAction: '发起大额增发时间锁提案 (>$2M USDF)',
      queueBtn: '提交队列',
      confirmations: '已获签名确认:',
      unlocked: '时间锁已到期 · 可执行',
      timelocked: '时间锁冷却锁定中',
      etaLabel: '最早可执行时间',
      signBtn: '硬件签署',
      executeBtn: '执行提案',
      emptyProposals: '当前暂无待处理或历史多签提案',
      statusPending: '待签署',
      statusReady: '待执行',
      statusExecuted: '已执行',
    },
    bridge: {
      title: '流动性输出与隔离缓冲桥接矩阵 (xpayes.com & Segregated MM)',
      subtitle: '基于 HMAC-SHA256 双向验签与严格隔离缓冲区，彻底阻断二级市场波动传导至稳定币储备池',
      firewallBadge: '合规防火墙: 严格物理隔离',
      gaugeTitle: '$20M 隔离做市缓冲实时水位表',
      gaugeSubtitle: '硬顶上限 $20,000,000 USDF · 独立账本隔离外部波动风险',
      allocatedLabel: '已分配做市额度',
      remainingLabel: '剩余可用缓冲额度',
      capLabel: '强制硬顶上限',
      utilizationLabel: '当前缓冲占用率',
      xpayesPoolLabel: 'XPayes 清算托管池实存:',
      segregatedLabel: '隔离防火墙状态',
      segregatedYes: '物理隔离激活',
      segregatedNo: '未隔离告警',
      capTagSuffix: 'M USDF 硬顶',
      xpayesTitle: 'xpayes.com 法币支付网关桥接',
      xpayesTag: 'vIBAN 法币入金',
      xpayesDesc: '支持 T+0 法币到账即刻铸造 USDF，内置 paymentRef 幂等防重放与 HMAC-SHA256 强制验签。',
      xpayesValidBtn: '模拟已签名 Webhook 清算',
      xpayesBadBtn: '测试伪造签名拦截',
      segregatedMmTitle: '隔离做市流动性缓冲桥接',
      segregatedMmDesc: '受 $20,000,000 硬顶与跨站 HMAC 密钥隔离保护；前端无权伪造签名调拨缓冲资金。',
      segregatedMmBridgeBtn: '提交 +$500K 流动性缓冲请求',
      segregatedMmRedeemBtn: '提交 -$250K 缓冲回收请求',
      xpayesSettledPrefix: 'XPayes 网关结算成功',
      segregatedMmCommittedPrefix: '隔离缓冲调拨完成',
      txPrefix: '交易哈希',
      orderMintLiquidity: '注入做市流动性',
      orderBurnRedeem: '回收做市缓冲',
    },
    firewall: {
      title: '跨站加密防火墙实时自检 (Safe Self-Check)',
      subtitle: '零密钥泄露自检：向线上 DO Worker 发送故意伪造的 HMAC 签名请求，实时验证 HTTP 401 防火墙拦截有效性',
      secretGuard: '前端零 CLEARING_HMAC_SECRET 暴露 · 安全沙箱直连',
      runBtn: '执行伪造签名防火墙自检',
      runningBtn: '正在向 Cloudflare DO 验证...',
      idleHint: '点击上方按钮发起真实探测请求至 /api/bridge/xpayes-settlement，验证未授权签名是否被实时拦截。',
      verdictPassed: '防火墙加密拦截验证通过 · HTTP 401',
      verdictFailed: '防火墙自检异常：未按预期拦截伪造请求',
      endpointLabel: '探测目标接口',
      httpStatusLabel: 'HTTP 状态码',
      httpPrefix: '状态码',
      errorCodeLabel: 'Worker 返回码',
      latencyLabel: '往返耗时',
      tracePrefix: '链路追踪号',
    },
    trace: {
      title: '四跳统一清算链路追踪器 (chainTraceId Inspector)',
      subtitle: '实时查询 DO 持久化 clearing_traces 表，追踪跨站主体、资金桥接、风控校验与终局存证全链路',
      placeholder: '输入 traceId（例如 trc_e2e_1794670409）',
      inspectBtn: '查询链路',
      showAllBtn: '显示最新链路',
      quickPicks: '最近链路快捷选择:',
      loading: '正在向 DO Worker 查询实时清算追踪记录...',
      empty: '未查询到匹配的链路追踪记录，请选择上方快捷 Trace ID 或执行一笔铸造/清算操作。',
      hopStage1: '第 1 跳 · 发起方/主体核验',
      hopStage2: '第 2 跳 · USDFirm 清算桥接',
      hopStage3: '第 3 跳 · PoR/风控一致性校验',
      hopStage4: '第 4 跳 · 不可篡改链上存证',
      awaitingHop: '等待下游或上游节点上报该跳回执',
      receiptHash: '回执哈希',
      formatHopBadge: (seq: number) => `第 ${seq} 跳`,
      actionLabels: {
        MINT_SETTLED: '铸造清算入账',
        BURN_SETTLED: '销毁赎回出账',
        XPAYES_WEBHOOK_MINT: 'XPayes 网关入金铸造',
        BRIDGE_SEGREGATED_LIQUIDITY: '隔离做市缓冲桥接',
        TIMELOCK_PROPOSED: '大额多签时间锁提案',
        TIMELOCK_EXECUTED: '多签时间锁执行终局',
      },
      statusLabels: {
        FINALIZED: '终局已存证',
        SETTLED: '已清算',
        VERIFIED: '已验签',
        TIMELOCKED: '时间锁排队',
        BLOCKED: '合规已拦截',
      },
    },
    risk: {
      title: '自动化风控哨兵 & SHA-256 哈希链审计日志',
      subtitle: '实时监控锚定偏离度、$25M 日铸造流速上限与紧急熔断开关',
      statusPrefix: '风控等级:',
      pegLabel: '二级市场实时锚定价',
      deltaPrefix: '偏离:',
      breakerLabel: '协议熔断器状态',
      breakerFrozen: '已熔断冻结',
      breakerActive: '正常运行',
      breakerRule: '脱锚 < $0.9900 自动触发',
      segregationLabel: '交易所风险隔离',
      segregatedYes: '严格物理隔离',
      segregatedNo: '隔离告警',
      segregationSub: '零风险传导至 PoR 储备',
      velocityLabel: '24h 铸造流速配额',
      usedSuffix: '已占用',
      freezeBtn: '演练紧急熔断',
      resumeBtn: '恢复锚定与铸造',
      stressLabel: '脱锚压力测试:',
      simulateBtn: '模拟锚定价',
      auditTitle: '不可篡改密码学审计链 (SHA-256 Hash-Chained)',
      chainVerified: '哈希链校验通过',
      emptyLogs: '暂无审计日志',
      levelLabels: {
        NORMAL: '正常监控',
        WARNING: '预警关注',
        CRITICAL: '紧急熔断',
      },
      actionLabels: {
        CIRCUIT_BREAKER_PAUSE: '熔断暂停',
        CIRCUIT_BREAKER_RESUME: '恢复正常',
        TIMELOCK_PROPOSE: '提交时间锁',
        TIMELOCK_EXECUTE: '执行多签',
        MINT_ORDER: '铸造清算',
        BURN_ORDER: '销毁赎回',
        BRIDGE_XPAYES: 'XPayes 桥接',
        BRIDGE_SEGREGATED_MM: '隔离缓冲桥接',
      },
      reasonPause: '风控官演练：触发紧急熔断隔离保护',
      reasonResume: '恢复美元 1:1 锚定状态与常规铸造',
      reasonDepeg: '预言机脱锚极限压力测试',
    },
    dashboard: {
      skills: {
        title: 'AI 商业职能 Skill 燃料矩阵 (Skill_01 ~ Skill_06)',
        subtitlePrefix: '所有跨站商业职能调用按 Token / 毫秒颗粒度实时扣减',
        subtitleSuffix: '，自动执行节点分润与通缩销毁',
        burnedBadgePrefix: '累计已燃烧:',
        emptyState: '当前暂无已注册的 AI 商业技能接口',
        unitPricePrefix: '单价',
        splitLabel: '分润 / 燃烧配比',
        providerLabel: '节点',
        burnLabel: '销毁',
        callingBtn: '流式计费燃烧中...',
        invokeBtn: '模拟 10 单位编排调用',
        loadingMsg: '正在通过 XPayes + USDFirm 状态通道执行毫秒级算力扣费...',
        formatSuccessMsg: (domain: string, total: number, prov: number, burned: number) =>
          `调用 [${domain}] 成功：扣减 ${total.toLocaleString()} uUSDF（算力节点分润 ${prov.toLocaleString()} / 实时销毁 ${burned.toLocaleString()}）`,
        skillMeta: {
          SKILL_01_SETUPYES: {
            name: 'SetupYes 全球极速注册',
            unitLabel: '次主体生成/牌照核验',
            description: '全球公司注册、海外秘书地址、牌照与税号自动申领接口',
          },
          SKILL_02_TAXYES: {
            name: 'TaxYes AI 全球节税路由',
            unitLabel: '千Token节税推演/1039合规',
            description: '跨国转移定价、专利盒剥离、1039无票合规与园区核定匹配',
          },
          SKILL_03_UPTOYES: {
            name: 'UptoYes 智能跨境履约',
            unitLabel: '单包清关/UWB无人机航段',
            description: '跨境集运、包税清关及末端无人机厘米级悬停入窗派送',
          },
          SKILL_04_FITJOB: {
            name: 'FitJob 全球 EOR 与背调',
            unitLabel: '次跨店背调/EOR合约清算',
            description: 'AI 招聘、跨店实训背调网与全球 EOR 灵活用工合规发薪',
          },
          SKILL_05_TOCADS: {
            name: 'TocAds 对话式投流 Agent',
            unitLabel: '千次实时竞价与税前凭证',
            description: 'AI 广告营销生成与对话式全球投流，联动税前抵扣凭证',
          },
          SKILL_06_IDLES: {
            name: 'Idles 闲置 GPU 算力集群',
            unitLabel: 'GPU显存秒级切片 (A100/H100)',
            description: '分布式闲置算力变现与高并发 AI 推理/60fps音视频渲染集群',
          },
        } as Record<string, { name: string; unitLabel: string; description: string }>,
      },
      escrow: {
        title: '“四流合一”智能托管与多方自动分润台',
        flowEntityPrefix: '主体生成',
        flowTaxPrefix: '税务路由',
        flowCapitalPrefix: '资金清算',
        flowLogisticsPrefix: '物理履约',
        siteSelectAria: '选择发起托管的零售或品牌站点',
        amountAria: '托管订单金额 USDF',
        siteOptions: {
          hmm: 'hmm.sale (跨境商城)',
          sheng: 'sheng.sale (省手特卖)',
          dezi: 'dezi.life (嘚滋供应链)',
          dcdy: 'dcdy.life (肚肠得意火锅)',
          lookplum: 'lookplum.com (望梅饮品)',
        },
        createBtn: '发起跨站托管单',
        emptyState: '当前暂无处于托管或分润状态的跨境/供应链订单',
        formatCreateSuccess: (site: string, orderNo: string, amt: number) =>
          `已为 [${site}] 创建四流合一托管单 ${orderNo}，锁定 ${amt.toLocaleString()} USDF，等待 UptoYes 履约签收`,
        formatSettleSuccess: (orderNo: string, count: number, amt: number) =>
          `订单 ${orderNo} 四流对齐完毕！已向 ${count} 方实时划转 ${amt.toLocaleString()} USDF`,
        card: {
          sourcePrefix: '来源:',
          settledBadge: '已完成四流分润',
          pendingBadge: '待末端签收对齐',
          step1: '1. 主体流 (setupyes.com)',
          step2: '2. 税务流 (taxyesai.com)',
          step3: '3. 资金流 (xpayes.com)',
          step4: '4. 履约流 (uptoyes.com)',
          pendingEntity: '待核验',
          pendingTax: '待匹配',
          pendingCapital: '待锁定',
          pendingLogistics: '等待无人机入窗签收...',
          settlingBtn: '原子分润中...',
          settleBtn: '回传 UptoYes 签收并触发四流分润',
        },
      },
      swap: {
        title: 'USDF ⇄ uUSDF 零滑点闪兑与各站点账本实时余额舱',
        subtitlePrefix: '恒定汇率',
        subtitleRate: '1 USDF = 1,000,000 uUSDF',
        subtitleSuffix: '，支持各矩阵站点一键补充微粒化 AI 算力燃料',
        emptyAccounts: '当前暂无已初始化的站点总账账户',
        stableLabel: '稳定币 (USDF):',
        gasLabel: '算力燃料 (uUSDF):',
        siteLabel: '操作站点账户',
        directionLabel: '闪兑方向 (Zero-Slippage)',
        dirUsdfToUusdf: 'USDF 稳定币 → uUSDF 燃料 (×10⁶)',
        dirUusdfToUsdf: 'uUSDF 燃料 → USDF 稳定币 (÷10⁶)',
        amountPrefix: '输入数量',
        loadingMsg: '正在执行原子级双账本闪兑...',
        submitBtn: '执行零滑点闪兑',
        formatForwardSuccess: (amt: number, conv: number) =>
          `闪兑成功！${amt.toLocaleString()} USDF → ${conv.toLocaleString()} uUSDF 算力燃料`,
        formatReverseSuccess: (amt: number, conv: number) =>
          `反向闪兑成功！${amt.toLocaleString()} uUSDF → ${conv.toLocaleString()} USDF 稳定币`,
      },
      vault: {
        title: '铸币、赎回与 PoR 储备金透明舱',
        subtitlePrefix: '联动',
        subtitleMid: '法币备付金池与',
        subtitleEnd: '多签金库，100%+ 足额 Merkle 审计',
        ratioPrefix: 'PoR 储备率:',
        emptyReserves: '暂无储备金托管池快照数据',
        weightPrefix: '权重',
        merklePrefix: 'Merkle:',
        formTitle: '执行 1:1 跨站铸造 / 赎回指令',
        mintTab: '铸造 USDF',
        redeemTab: '赎回 USD',
        siteLabel: '目标生态站点',
        siteSofayes: 'sofayes.com (母舰)',
        siteHmm: 'hmm.sale (跨境商城)',
        siteDezi: 'dezi.life (嘚滋供应链)',
        siteSheng: 'sheng.sale (省手特卖)',
        channelLabel: '清算储备通道',
        channelXpayes: 'XPayes vIBAN 法币网关',
        channelItiscoin: 'ItisCoin 链上稳定币池',
        amountLabel: '金额 (USD / USDF)',
        loadingMsg: '正在同步复式记账总账与 Merkle 树...',
        submitBtn: '立即执行清算',
        formatMintSuccess: (amt: number, hash: string) =>
          `已完成 ${amt.toLocaleString()} USDF 1:1 储备铸造，哈希: ${hash}`,
        formatRedeemSuccess: (amt: number, hash: string) =>
          `已完成 ${amt.toLocaleString()} USDF 1:1 赎回销毁，哈希: ${hash}`,
        assetNames: {
          'RES-XPAY-01': 'USD 离岸银行活期备付金 & 短期美债',
          'RES-ITIS-02': 'USDF / ItisCoin 链上超额流动性池',
        } as Record<string, string>,
      },
      federation: {
        title: 'ShineMight OS 跨项目联邦清算总线与数据交流中心',
        subtitle: '打通 29+ 矩阵站点双向数据报文（gRPC Stream / State Channel / HMAC Webhook），毫秒级对账',
        onlineBadgePrefix: '在线联邦节点:',
        clusters: {
          ALL: '全部矩阵 (20+ 节点)',
          SUPER_APP: '流量母舰 (SofaYes)',
          FINTECH_CRYPTO: '金控清算 (XPayes/Itis)',
          B2B_INFRA_SKILLS: '企服基建 (Yes家族)',
          AI_VERTICALS: 'AI 垂直集群',
          RETAIL_BRANDS: '电商与餐饮品牌',
          HOLDING_LAB: '控股与实验室',
        },
        emptyNodes: '当前筛选集群下暂无已连接的跨站联邦节点',
        simTitle: '跨项目实时数据交流模拟器 (Inbound Webhook & HMAC-SHA256 验签)',
        tamperLabel: '模拟篡改 HMAC 签名 (测试安全拦截)',
        sourceLabel: '发起方项目',
        sourceSofayes: 'sofayes.com (流量母舰)',
        sourceHmm: 'hmm.sale (跨境商城)',
        sourceDezi: 'dezi.life (嘚滋餐饮SaaS)',
        targetLabel: '接收方项目',
        targetIdles: 'idles.site (GPU算力集群)',
        targetTaxyes: 'taxyesai.com (全球节税路由)',
        targetUptoyes: 'uptoyes.com (跨境集运/无人机)',
        targetTocads: 'tocads.com (AI投流Agent)',
        targetDcdy: 'dcdy.life (肚肠得意火锅)',
        protocolLabel: '数据协议类型',
        evCompute: '算力切片实时结算',
        evMall: '跨境/餐饮集采分账',
        evTax: '1039合规节税路由清算',
        evSkill: 'AI Skill 流式微支付',
        amountLabel: '清算金额 (USDF)',
        loadingMsg: '正在校验跨站 HMAC 签名并写入复式记账总账...',
        submitBtn: '发送跨站数据报文并清算',
        payloadSummaryDefault: '跨项目实时数据交流与自动清算包',
        formatSuccess: (src: string, dst: string, amt: number, tx: string) =>
          `跨站报文验签通过！[${src} → ${dst}] 已清算 ${amt.toLocaleString()} USDF (流水: ${tx})`,
      },
      chain: {
        title: 'Rust 状态通道内核 & Solana Anchor 智能合约 & 真 Merkle PoR 校验舱',
        subtitlePrefix: '双管齐下架构（方案 C）：链下',
        subtitleMid: 'u128 高频流式扣费 + 链上',
        subtitleEnd: '刚性托管分润',
        specBadge: 'FIPS 180-4 SHA-256 · u128 定点数',
        offchainBadge: '链下高频状态通道',
        offchainDesc1: '采用 Rust',
        offchainDesc2: '定点数（',
        offchainDesc3: '）彻底消除浮点数误差，内置纯 Rust FIPS 180-4 SHA-256 Merkle Tree 状态根生成器。',
        onchainBadge: '链上 Anchor 智能合约',
        onchainDesc1: '实现链上',
        onchainDesc2: '1:1 铸币指令、',
        onchainDesc3: '算力燃烧上链存证，以及',
        onchainDesc4: '四流合一原子分润合约。',
        verifyTitle: '实时生成并校验账户 SHA-256 Merkle 树储备包含性证明 (Inclusion Proof)',
        selectAria: '选择要生成 Merkle 证明的站点账户',
        computingBtn: '计算哈希树中...',
        generateBtn: '生成真实 Merkle 证明',
        loadingMsg: '正在对全网账户叶子节点执行 SHA-256 哈希配对与路径回溯...',
        verifiedTitlePrefix: '密码学校验通过',
        slotHeightPrefix: '区块高度 Slot #',
        u128Prefix: 'u128 借贷恒等:',
        leafPayloadLabel: '账户叶子明文 (u128 序列化):',
        leafHashLabel: '账户叶子 SHA-256 (Leaf Hash):',
        stateRootLabel: '全网状态根 (Merkle State Root):',
        blockHashLabel: '最新链式区块头哈希 (Block Hash):',
      },
      developer: {
        title: '跨站开发者 SDK 网关 & T+0 试算平衡审计控制台',
        subtitle: '为 29+ 矩阵站点颁发最小权限 API Key，提供 T+0 借贷试算平衡表与真实 HMAC-SHA256 报文签名生成',
        variancePrefix: 'T+0 借贷差额:',
        secretPrefix: '密钥脱敏:',
        signerTitle: '跨站 Webhook HMAC-SHA256 签名计算与 cURL 生成器',
        sourceAria: '签名发起站点',
        targetAria: '签名目标站点',
        amountAria: '签名金额 USDF',
        signBtn: '生成签名',
        loadingMsg: '正在使用 OpenSSL HMAC-SHA256 计算签名...',
        signedPrefix: 'HMAC-SHA256 签名已生成:',
      },
      ledgerStream: {
        title: '不可篡改复式记账分录流 (Double-Entry Ledger Stream)',
        invariantOk: 'DEBIT === CREDIT 恒等校验通过',
        emptyState: '当前暂无复式记账流水记录',
      },
      canvas: {
        title: '超光速清算脉冲引擎',
        fpsBadge: '60 FPS',
        speedLabel: '脉冲速率 (Speed)',
        trailLabel: '光子拖尾 (Trail)',
        densityLabel: '并发密度 (Density)',
        toggleAria: '切换超光速脉冲引擎控制面板',
        toggleLabel: '脉冲引擎控制',
      },
    },
  },
  en: {
    localeToggleLabel: 'ZH',
    localeBadge: 'EN',
    console: {
      badge: 'ShineMight OS · USDFirm Issuance Core',
      pegPill: '1 USDF = $1.00 USD (100%+ Audited Reserve Backed)',
      subtitle:
        'Compliance Firewall Segregation: Dedicated USDF Mint/Burn & Multi-Sig PoR transparency layer. Liquidity streams exclusively to xpayes.com and ring-fenced buffers, isolated from exchange matching.',
      pageTitleSub: 'USD Stablecoin Issuance Protocol · PoR Attestation & Multi-Sig Treasury',
      syncLedger: 'Sync Live Ledger',
      liveTelemetryTag: 'Cloudflare DO Live Consensus',
      viewScope: 'Workspace:',
      loadingSnapshot: 'Fetching T+0 trial balance snapshot from USDFirm reserve core...',
      errorAlertTitle: 'Live Alert (Zero-Fake Policy): Cross-Site Clearing Node Disconnected',
      reconnectBtn: 'Reconnect Clearing Channel',
      metricCircTitle: 'Circulating USDF Supply',
      metricCircSub: 'Backed 1:1 by audited T-Bills & USD cash',
      metricTrialOk: 'Trial Balance Verified',
      metricTrialErr: 'Imbalance Alert',
      metricPorTitle: 'PoR Reserve Backing Ratio',
      metricPorSubPrefix: 'Total Reserves',
      metricPorBadge: '>= 100% Fully Backed',
      metricBurnTitle: 'AI Skill Fuel Burned',
      metricBurnSub: 'Real-time per-token / ms settlement burn',
      metricBurnUnit: 'uUSDF',
      metricBurnBadge: 'Deflationary Split',
      metricFlowTitle: '4-Flow Compliance Alignment',
      metricFlowSubPrefix: 'Live Throughput',
      metricFlowUnit: 'ALIGNED',
      metricFlowBadge: 'Entity+Tax+Cash+Cargo',
      tabs: {
        ALL: 'Full Cockpit (All)',
        USDFIRM: 'USDFirm Stablecoin Protocol',
        RUST_CHAIN: 'Rust Core & Merkle PoR',
        FEDERATION: '29+ Site Federation Bus',
        VAULT_SWAP: 'PoR Vault & Dual Swap',
        SKILLS: 'AI Skill Fuel Matrix',
        ESCROW: '4-Flow Smart Escrow',
        DEVELOPER: 'Developer SDK & Recon',
        LEDGER: 'Double-Entry Ledger',
      },
    },
    dedicatedPage: {
      firewallBadge: 'Web2.5 Compliance Firewall · Segregated Stablecoin Issuer',
      pegBadge: '1 USDF = $1.00 USD (100%+ Backed)',
      subtitle: 'Institutional Reserve Attestation, Timelock Issuance & Liquidity Protocol',
      backHome: 'USDFirm Clearing Console',
    },
    hub: {
      protocolBadge: 'USDFirm.com Protocol',
      protocolDesc: 'Segregated Dollar-Pegged Stablecoin Issuance, PoR Oracle & Multi-Sig Treasury Layer',
      wsLive: 'WSS Live',
      wsConnecting: 'WSS Connecting...',
      wsReconnecting: 'WSS Reconnecting...',
      onlineNodes: 'Live Clients',
      refreshOracle: 'Refresh Oracle',
      dedicatedPortal: 'Dedicated Portal (/usdfirm)',
      loadingState: 'Synchronizing USDFirm.com Cryptographic Reserve & Multi-Sig State...',
      workerErrorTitle: 'Live Protocol Worker Unreachable (Zero-Fake Policy)',
      retryWorker: 'Retry Worker Sync',
    },
    por: {
      title: 'Real-Time Proof of Reserves (PoR) Attestation',
      subtitle: 'Independent cryptographic verification of USDF dollar backing via Durable Object PoR Oracle',
      backingRatio: 'Backing Ratio',
      epochRound: 'Epoch',
      totalReserves: 'Total Audited Reserves',
      totalReservesSub: 'Custodied at BNY Mellon, Citi & Fedwire RRP',
      circulatingUsdf: 'Total Circulating USDF',
      circulatingSub: 'Net segregated issuance across vaults',
      surplusBuffer: 'Surplus Overcollateralization',
      surplusSub: '100% Segregated Safety Buffer',
      breakdownTitle: 'Audited Reserve Asset Breakdown',
      updatedAt: 'Updated',
      marketValue: 'Market Value:',
      weight: 'Weight',
      apy: 'APY',
      merkleLabel: 'Cryptographic SHA-256 Merkle Root:',
      oracleFeed: 'Chainlink PoR Feed Round',
      answerMicro: 'Answer (microUSD)',
      viewCert: 'View Independent Auditor Certificate',
      assetTypes: {
        TREASURY: 'US TREASURY BILL',
        US_TREASURY_BILL: 'US TREASURY BILL',
        CASH: 'USD CASH DEPOSIT',
        FDIC_CASH_DEPOSIT: 'CUSTODIAL CASH DEPOSIT',
        OVERNIGHT_REPO: 'FED OVERNIGHT REPO',
      },
    },
    mintBurn: {
      title: 'Institutional USDF Mint & Burn Engine',
      subtitle: 'OFAC screening + Multi-Sig Timelock queue on Mints > $2,000,000 USD · Exchange liquidity uses the $20M segregated bridge',
      mintTab: 'Mint USDF',
      burnTab: 'Burn & Redeem',
      partnerLabel: 'Authorized Channel Partner',
      partnerXpayes: 'xpayes.com (Payment Gateway On-Ramp)',
      partnerUsdfirm: 'usdfirm.com (Protocol Custody Issuance)',
      partnerDirect: 'institutional_direct (Prime Treasury)',
      reserveLabel: 'Backing Reserve Pool',
      reserveCash: 'RSV-CASH (Tier-1 Custodial USD Cash)',
      reserveTbill: 'RSV-TBILL (0-3M US Treasury Bills)',
      amountLabelMint: 'Amount (USD Deposit)',
      amountLabelBurn: 'Amount (USDF Burn)',
      addressLabel: 'Recipient / Burner EVM Address or Counterparty',
      testOfacBtn: 'Fill OFAC Sanctioned Address',
      refLabel: 'Wire / Gateway Settlement Reference',
      sigLabel: 'EIP-712 Burn Authorization Signature',
      presetInstant: '$250K (Instant)',
      presetTimelock: '$2.5M (Triggers Multi-Sig Timelock)',
      executing: 'Executing...',
      submitMint: 'Issue USDF',
      submitBurn: 'Burn USDF',
      feeLabel: 'Protocol Fee',
      timelockQueued: 'Large mint queued in 3-of-5 Multi-Sig Timelock',
      recentOrders: 'Recent Issuance & Redemption Orders',
      emptyOrders: 'No recent mint/burn orders',
      orderTypeMint: 'MINT',
      orderTypeBurn: 'BURN',
      txHashLabel: 'TxHash',
      traceIdLabel: 'Trace ID',
      statusLabels: {
        SETTLED: 'SETTLED',
        EXECUTED: 'EXECUTED',
        QUEUED_TIMELOCK: 'QUEUED TIMELOCK',
        PENDING: 'PENDING',
        REJECTED: 'REJECTED',
      },
    },
    multisig: {
      title: 'Multi-Sig Treasury Timelock Governance',
      subtitle: 'Enforces hardware quorum and mandatory timelock delay against single-key compromise',
      minDelayBadge: 'Min Delay: 24h / DO Enforced',
      activeSigner: 'Active Committee Signer Key (HSM)',
      queueAction: 'Queue Large Mint Tranche (>$2M USDF)',
      queueBtn: 'Queue',
      confirmations: 'Confirmations:',
      unlocked: 'Unlocked',
      timelocked: 'Timelocked',
      etaLabel: 'ETA',
      signBtn: 'Sign',
      executeBtn: 'Execute',
      emptyProposals: 'No multi-sig proposals queued',
      statusPending: 'PENDING',
      statusReady: 'READY',
      statusExecuted: 'EXECUTED',
    },
    bridge: {
      title: 'Liquidity Bridges (xpayes.com & Segregated MM Buffer)',
      subtitle: 'HMAC-SHA256 authenticated webhooks & ring-fenced liquidity buffer preventing risk spillover',
      firewallBadge: 'Compliance Firewall: Segregated',
      gaugeTitle: 'Live $20M Segregated Market-Maker Buffer Gauge',
      gaugeSubtitle: 'Hard Cap $20,000,000 USDF · Isolates external volatility from PoR reserves',
      allocatedLabel: 'Allocated USDF',
      remainingLabel: 'Buffer Remaining',
      capLabel: 'Hard Cap',
      utilizationLabel: 'Utilization',
      xpayesPoolLabel: 'XPayes Clearing Custody Pool:',
      segregatedLabel: 'Firewall Segregation',
      segregatedYes: 'ACTIVE & ISOLATED',
      segregatedNo: 'SEGREGATION ALERT',
      capTagSuffix: 'M USDF CAP',
      xpayesTitle: 'xpayes.com Payment Gateway Bridge',
      xpayesTag: 'vIBAN On-Ramp',
      xpayesDesc: 'T+0 fiat-to-USDF settlement with paymentRef idempotency and strict HMAC-SHA256 verification.',
      xpayesValidBtn: 'Submit Signed Webhook',
      xpayesBadBtn: 'Test Forged HMAC Rejection',
      segregatedMmTitle: 'Segregated Market-Maker Liquidity Bridge',
      segregatedMmDesc: 'Protected by $20M segregated buffer cap and HMAC isolation; unauthenticated callers are blocked.',
      segregatedMmBridgeBtn: 'Bridge +$500K Liquidity',
      segregatedMmRedeemBtn: 'Reclaim -$250K Buffer',
      xpayesSettledPrefix: 'SETTLED XPayes Ref',
      segregatedMmCommittedPrefix: 'COMMITTED Segregated Buffer',
      txPrefix: 'Tx',
      orderMintLiquidity: 'MINT LIQUIDITY',
      orderBurnRedeem: 'RECLAIM BUFFER',
    },
    firewall: {
      title: 'Safe Cryptographic Firewall Self-Check',
      subtitle: 'Zero-secret diagnostic: fires an intentionally forged HMAC signature against the live DO Worker to prove HTTP 401 enforcement',
      secretGuard: 'Zero CLEARING_HMAC_SECRET Exposure · Live Sandbox Probe',
      runBtn: 'Run Forged-Signature Firewall Check',
      runningBtn: 'Probing Cloudflare DO...',
      idleHint: 'Click above to execute a real forged-signature request against /api/bridge/xpayes-settlement and verify live 401 rejection.',
      verdictPassed: 'FIREWALL ENFORCED · HTTP 401',
      verdictFailed: 'FIREWALL CHECK FAILED',
      endpointLabel: 'Target Endpoint',
      httpStatusLabel: 'HTTP Status',
      httpPrefix: 'HTTP',
      errorCodeLabel: 'Worker Error Code',
      latencyLabel: 'Round-Trip Latency',
      tracePrefix: 'Trace ID',
    },
    trace: {
      title: 'Unified 4-Hop chainTraceId Clearing Inspector',
      subtitle: 'Queries live DO clearing_traces storage to audit multi-hop cross-site clearing receipts and Merkle commitments',
      placeholder: 'Enter traceId (e.g. trc_e2e_1794670409)',
      inspectBtn: 'Inspect Trace',
      showAllBtn: 'Show Latest',
      quickPicks: 'Recent Trace IDs:',
      loading: 'Querying live DO clearing trace records...',
      empty: 'No clearing trace hops matched. Select a recent Trace ID above or execute a mint/clearing action.',
      hopStage1: 'Hop 1 · Origin & Subject Check',
      hopStage2: 'Hop 2 · USDFirm Clearing Bridge',
      hopStage3: 'Hop 3 · PoR & Risk Verification',
      hopStage4: 'Hop 4 · Final Settlement Receipt',
      awaitingHop: 'Awaiting upstream/downstream hop receipt',
      receiptHash: 'Receipt Hash',
      formatHopBadge: (seq: number) => `Hop #${seq}`,
      actionLabels: {
        MINT_SETTLED: 'MINT SETTLED',
        BURN_SETTLED: 'BURN SETTLED',
        XPAYES_WEBHOOK_MINT: 'XPAYES WEBHOOK MINT',
        BRIDGE_SEGREGATED_LIQUIDITY: 'SEGREGATED LIQUIDITY BRIDGE',
        TIMELOCK_PROPOSED: 'TIMELOCK PROPOSED',
        TIMELOCK_EXECUTED: 'TIMELOCK EXECUTED',
      },
      statusLabels: {
        FINALIZED: 'FINALIZED',
        SETTLED: 'SETTLED',
        VERIFIED: 'VERIFIED',
        TIMELOCKED: 'TIMELOCKED',
        BLOCKED: 'BLOCKED',
      },
    },
    risk: {
      title: 'Automated Risk Sentinel & SHA-256 Hash-Chain Audit Trail',
      subtitle: 'Real-time peg deviation monitoring, $25M daily mint cap, and emergency circuit breaker',
      statusPrefix: 'STATUS:',
      pegLabel: 'Secondary Market Peg',
      deltaPrefix: 'Delta:',
      breakerLabel: 'Circuit Breaker',
      breakerFrozen: 'FROZEN',
      breakerActive: 'ACTIVE',
      breakerRule: 'Auto-freeze < $0.9900',
      segregationLabel: 'Exchange Segregation',
      segregatedYes: 'ISOLATED',
      segregatedNo: 'BREACHED',
      segregationSub: 'Zero contagion to PoR',
      velocityLabel: '24h Mint Velocity',
      usedSuffix: 'Used',
      freezeBtn: 'Emergency Freeze',
      resumeBtn: 'Restore Peg & Resume',
      stressLabel: 'Depeg Stress Test:',
      simulateBtn: 'Simulate Peg',
      auditTitle: 'Immutable Cryptographic Audit Trail (SHA-256 Chained)',
      chainVerified: 'Chain Verified',
      emptyLogs: 'No audit trail records available',
      levelLabels: {
        NORMAL: 'NORMAL',
        WARNING: 'WARNING',
        CRITICAL: 'CRITICAL',
      },
      actionLabels: {
        CIRCUIT_BREAKER_PAUSE: 'CIRCUIT BREAKER PAUSE',
        CIRCUIT_BREAKER_RESUME: 'CIRCUIT BREAKER RESUME',
        TIMELOCK_PROPOSE: 'TIMELOCK PROPOSE',
        TIMELOCK_EXECUTE: 'TIMELOCK EXECUTE',
        MINT_ORDER: 'MINT ORDER',
        BURN_ORDER: 'BURN ORDER',
        BRIDGE_XPAYES: 'XPAYES BRIDGE',
        BRIDGE_SEGREGATED_MM: 'SEGREGATED MM BRIDGE',
      },
      reasonPause: 'Manual emergency circuit breaker drill',
      reasonResume: 'Restore normal peg & unfreeze minting',
      reasonDepeg: 'Stress test oracle depeg',
    },
    dashboard: {
      skills: {
        title: 'AI Business Skills Fuel Matrix (Skill_01 ~ Skill_06)',
        subtitlePrefix: 'All cross-site business skill invocations burn',
        subtitleSuffix: 'per token / ms in real time with automated provider splits & deflationary burn',
        burnedBadgePrefix: 'Cumulative Burned:',
        emptyState: 'No registered AI Business Skill endpoints active',
        unitPricePrefix: 'Unit Rate',
        splitLabel: 'Split / Burn Ratio',
        providerLabel: 'Provider',
        burnLabel: 'Burned',
        callingBtn: 'Streaming Metered Burn...',
        invokeBtn: 'Invoke 10 Orchestrated Units',
        loadingMsg: 'Executing sub-ms compute billing across XPayes + USDFirm state channel...',
        formatSuccessMsg: (domain: string, total: number, prov: number, burned: number) =>
          `Invoked [${domain}]: burned ${total.toLocaleString()} uUSDF (Provider Split ${prov.toLocaleString()} / Deflationary Burn ${burned.toLocaleString()})`,
        skillMeta: {
          SKILL_01_SETUPYES: {
            name: 'SetupYes · Global Incorporation',
            unitLabel: 'Per entity filing / license verification',
            description: 'Global company formation, registered agent, licensing & tax ID issuance API',
          },
          SKILL_02_TAXYES: {
            name: 'TaxYes AI · Global Tax Routing',
            unitLabel: 'Per 1K tokens tax modeling & compliance',
            description: 'Cross-border transfer pricing, IP box structuring & compliant tax park routing',
          },
          SKILL_03_UPTOYES: {
            name: 'UptoYes · Smart Cross-Border Logistics',
            unitLabel: 'Per parcel DDP customs / UWB drone leg',
            description: 'Cross-border consolidation, DDP customs clearance & last-mile drone window delivery',
          },
          SKILL_04_FITJOB: {
            name: 'FitJob · Global EOR & Background Check',
            unitLabel: 'Per verification / EOR payroll settlement',
            description: 'AI hiring, cross-store background verification & compliant global EOR payroll',
          },
          SKILL_05_TOCADS: {
            name: 'TocAds · Conversational Ad Agent',
            unitLabel: 'Per 1K live bids & tax-deductible receipt',
            description: 'AI ad campaign generation & conversational media buying synced with pre-tax receipts',
          },
          SKILL_06_IDLES: {
            name: 'Idles · Idle GPU Compute Grid',
            unitLabel: 'GPU VRAM sec-slice (A100/H100)',
            description: 'Distributed idle GPU monetization & high-concurrency AI inference / 60fps rendering cluster',
          },
        } as Record<string, { name: string; unitLabel: string; description: string }>,
      },
      escrow: {
        title: '4-Flow Aligned Smart Escrow & Multi-Party Split Console',
        flowEntityPrefix: 'Entity',
        flowTaxPrefix: 'Tax Route',
        flowCapitalPrefix: 'Capital Clearing',
        flowLogisticsPrefix: 'Fulfillment',
        siteSelectAria: 'Select origin retail or brand domain for escrow lock',
        amountAria: 'Escrow order amount in USDF',
        siteOptions: {
          hmm: 'hmm.sale (Cross-Border Mall)',
          sheng: 'sheng.sale (ShengSale Deals)',
          dezi: 'dezi.life (Dezi Supply Chain)',
          dcdy: 'dcdy.life (DCDY Fresh Hotpot)',
          lookplum: 'lookplum.com (LookPlum Beverage)',
        },
        createBtn: 'Create Cross-Site Escrow',
        emptyState: 'No active or settled cross-border escrow orders available',
        formatCreateSuccess: (site: string, orderNo: string, amt: number) =>
          `Created 4-flow escrow ${orderNo} for [${site}], locked ${amt.toLocaleString()} USDF awaiting UptoYes POD`,
        formatSettleSuccess: (orderNo: string, count: number, amt: number) =>
          `Order ${orderNo} 4-flow aligned! Atomically settled ${amt.toLocaleString()} USDF across ${count} recipients`,
        card: {
          sourcePrefix: 'Origin:',
          settledBadge: '4-Flow Split Settled',
          pendingBadge: 'Awaiting POD Alignment',
          step1: '1. Entity Flow (setupyes.com)',
          step2: '2. Tax Flow (taxyesai.com)',
          step3: '3. Capital Flow (xpayes.com)',
          step4: '4. Fulfillment Flow (uptoyes.com)',
          pendingEntity: 'Pending Entity',
          pendingTax: 'Pending Route',
          pendingCapital: 'Pending Lock',
          pendingLogistics: 'Awaiting UWB drone window POD...',
          settlingBtn: 'Settling Split...',
          settleBtn: 'Submit UptoYes POD & Settle 4-Flow Split',
        },
      },
      swap: {
        title: 'USDF <-> uUSDF Zero-Slippage Swap & Live Site Account Vaults',
        subtitlePrefix: 'Fixed Rate',
        subtitleRate: '1 USDF = 1,000,000 uUSDF',
        subtitleSuffix: ', enabling instant micro-metered AI compute fuel top-ups across matrix sites',
        emptyAccounts: 'No initialized general ledger site accounts found',
        stableLabel: 'Stablecoin (USDF):',
        gasLabel: 'Compute Fuel (uUSDF):',
        siteLabel: 'Site Account',
        directionLabel: 'Swap Direction (Zero-Slippage)',
        dirUsdfToUusdf: 'USDF Stablecoin -> uUSDF Fuel (x10^6)',
        dirUusdfToUsdf: 'uUSDF Fuel -> USDF Stablecoin (/10^6)',
        amountPrefix: 'Input Amount',
        loadingMsg: 'Executing atomic dual-ledger swap...',
        submitBtn: 'Execute Zero-Slippage Swap',
        formatForwardSuccess: (amt: number, conv: number) =>
          `Swap settled! ${amt.toLocaleString()} USDF -> ${conv.toLocaleString()} uUSDF compute fuel`,
        formatReverseSuccess: (amt: number, conv: number) =>
          `Reverse swap settled! ${amt.toLocaleString()} uUSDF -> ${conv.toLocaleString()} USDF`,
      },
      vault: {
        title: '100%+ Audited PoR Reserve Vault & Custody Mint/Redeem',
        subtitlePrefix: 'Integrated with',
        subtitleMid: 'fiat liquidity vaults and',
        subtitleEnd: 'multi-sig treasury, 100%+ Merkle audited',
        ratioPrefix: 'PoR Backing:',
        emptyReserves: 'No custodial reserve holdings found',
        weightPrefix: 'Weight',
        merklePrefix: 'Merkle:',
        formTitle: 'Execute 1:1 Cross-Site Custody Mint / Redeem',
        mintTab: 'Mint USDF',
        redeemTab: 'Redeem USD',
        siteLabel: 'Target Ecosystem Site',
        siteSofayes: 'sofayes.com (Super App)',
        siteHmm: 'hmm.sale (Cross-Border Mall)',
        siteDezi: 'dezi.life (Dezi Supply Chain)',
        siteSheng: 'sheng.sale (ShengSale Deals)',
        channelLabel: 'Clearing Custody Channel',
        channelXpayes: 'XPayes vIBAN Fiat Gateway',
        channelItiscoin: 'ItisCoin On-Chain Liquidity Vault',
        amountLabel: 'Amount (USD / USDF)',
        loadingMsg: 'Synchronizing double-entry ledger and Merkle state tree...',
        submitBtn: 'Execute Clearing Settlement',
        formatMintSuccess: (amt: number, hash: string) =>
          `Completed ${amt.toLocaleString()} USDF 1:1 reserve mint, Tx: ${hash}`,
        formatRedeemSuccess: (amt: number, hash: string) =>
          `Completed ${amt.toLocaleString()} USDF 1:1 redemption burn, Tx: ${hash}`,
        assetNames: {
          'RES-XPAY-01': 'USD Offshore Custodial Cash & Short-Term US T-Bills',
          'RES-ITIS-02': 'USDF / ItisCoin On-Chain Overcollateralized Liquidity Pool',
        } as Record<string, string>,
      },
      federation: {
        title: 'ShineMight OS Cross-Project Federation Clearing Bus',
        subtitle: 'Connects 29+ matrix domains over gRPC Stream, State Channel & HMAC Webhooks with ms reconciliation',
        onlineBadgePrefix: 'Online Federation Nodes:',
        clusters: {
          ALL: 'All Matrix (20+ Nodes)',
          SUPER_APP: 'Super App (SofaYes)',
          FINTECH_CRYPTO: 'FinTech Core (XPayes/Itis)',
          B2B_INFRA_SKILLS: 'B2B Infra (Yes-Family)',
          AI_VERTICALS: 'AI Verticals',
          RETAIL_BRANDS: 'Retail & Catering',
          HOLDING_LAB: 'Holding & Labs',
        },
        emptyNodes: 'No connected cross-site federation nodes match this cluster filter',
        simTitle: 'Cross-Site Live Data Clearing Simulator (Inbound Webhook & HMAC-SHA256)',
        tamperLabel: 'Forge HMAC Signature (Test Firewall Rejection)',
        sourceLabel: 'Origin Domain',
        sourceSofayes: 'sofayes.com (Super App)',
        sourceHmm: 'hmm.sale (Cross-Border Mall)',
        sourceDezi: 'dezi.life (Dezi Catering SaaS)',
        targetLabel: 'Recipient Domain',
        targetIdles: 'idles.site (GPU Compute Grid)',
        targetTaxyes: 'taxyesai.com (Global Tax Router)',
        targetUptoyes: 'uptoyes.com (DDP Logistics / Drone)',
        targetTocads: 'tocads.com (AI Ad Agent)',
        targetDcdy: 'dcdy.life (DCDY Fresh Hotpot)',
        protocolLabel: 'Protocol Event Type',
        evCompute: 'GPU Compute Slice Settlement',
        evMall: 'Cross-Border / Catering Split',
        evTax: 'Compliant Tax-Route Clearing',
        evSkill: 'AI Skill Micro-Payment Stream',
        amountLabel: 'Clearing Amount (USDF)',
        loadingMsg: 'Verifying cross-site HMAC signature and posting double-entry ledger...',
        submitBtn: 'Dispatch Signed Payload & Settle',
        payloadSummaryDefault: 'Cross-project live telemetry & automated clearing payload',
        formatSuccess: (src: string, dst: string, amt: number, tx: string) =>
          `HMAC verified! [${src} -> ${dst}] settled ${amt.toLocaleString()} USDF (Tx: ${tx})`,
      },
      chain: {
        title: 'Rust State Channel Core & Solana Anchor Contract & True Merkle PoR',
        subtitlePrefix: 'Dual-track architecture (Option C): off-chain',
        subtitleMid: 'u128 sub-ms billing + on-chain',
        subtitleEnd: 'atomic escrow settlement',
        specBadge: 'FIPS 180-4 SHA-256 · u128 Fixed-Point',
        offchainBadge: 'Off-Chain State Channel',
        offchainDesc1: 'Uses Rust',
        offchainDesc2: 'fixed-point arithmetic (',
        offchainDesc3: ') eliminating floating-point drift, with FIPS 180-4 SHA-256 Merkle root generation.',
        onchainBadge: 'On-Chain Anchor Contract',
        onchainDesc1: 'Implements on-chain',
        onchainDesc2: '1:1 mint instructions,',
        onchainDesc3: 'compute burn rollups, and',
        onchainDesc4: '4-flow atomic split settlement.',
        verifyTitle: 'Generate & Verify Account SHA-256 Merkle Inclusion Proof',
        selectAria: 'Select site account for Merkle proof generation',
        computingBtn: 'Computing Merkle Tree...',
        generateBtn: 'Generate True Merkle Proof',
        loadingMsg: 'Hashing all account leaves with SHA-256 and traversing sibling path...',
        verifiedTitlePrefix: 'Cryptographic Proof Verified',
        slotHeightPrefix: 'Block Slot #',
        u128Prefix: 'u128 Trial Invariant:',
        leafPayloadLabel: 'Account Leaf Preimage (u128):',
        leafHashLabel: 'Account Leaf SHA-256:',
        stateRootLabel: 'Global Merkle State Root:',
        blockHashLabel: 'Latest Chained Block Hash:',
      },
      developer: {
        title: 'Cross-Site Developer SDK Gateway & T+0 Trial Balance Audit',
        subtitle: 'Least-privilege API keys for 29+ matrix domains, T+0 trial balance audit & live HMAC-SHA256 webhook signer',
        variancePrefix: 'T+0 Trial Variance:',
        secretPrefix: 'Secret:',
        signerTitle: 'Cross-Site Webhook HMAC-SHA256 Signer & cURL Generator',
        sourceAria: 'Signing origin domain',
        targetAria: 'Signing target domain',
        amountAria: 'Signing amount in USDF',
        signBtn: 'Sign Payload',
        loadingMsg: 'Computing OpenSSL HMAC-SHA256 signature...',
        signedPrefix: 'HMAC-SHA256 Signature Generated:',
      },
      ledgerStream: {
        title: 'Immutable Double-Entry Ledger Stream',
        invariantOk: 'DEBIT === CREDIT Invariant Verified',
        emptyState: 'No double-entry journal postings recorded',
      },
      canvas: {
        title: 'Hyperspace Clearing Pulse Engine',
        fpsBadge: '60 FPS',
        speedLabel: 'Pulse Velocity (Speed)',
        trailLabel: 'Photon Trail (Trail)',
        densityLabel: 'Stream Density',
        toggleAria: 'Toggle hyperspace clearing engine controls',
        toggleLabel: 'Pulse Controls',
      },
    },
  },
} as const;

interface UsdfirmLocaleContextValue {
  locale: UsdfirmLocale;
  setLocale: (next: UsdfirmLocale) => void;
  toggleLocale: () => void;
  copy: (typeof USDFIRM_UI_COPY)['zh'] | (typeof USDFIRM_UI_COPY)['en'];
  resolveError: (errorCode?: string | null, fallbackMsg?: string | null) => string;
}

const UsdfirmLocaleContext = createContext<UsdfirmLocaleContextValue | null>(null);

const STORAGE_KEY = 'usdfirm_locale';

export function UsdfirmLocaleProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocaleState] = useState<UsdfirmLocale>('zh');

  useEffect(() => {
    try {
      const saved = window.localStorage.getItem(STORAGE_KEY);
      if (saved === 'zh' || saved === 'en') {
        setLocaleState(saved);
        document.documentElement.lang = saved === 'zh' ? 'zh-CN' : 'en';
      }
    } catch {
      // Ignore storage access restrictions
    }
  }, []);

  const setLocale = useCallback((next: UsdfirmLocale) => {
    setLocaleState(next);
    if (typeof window !== 'undefined') {
      try {
        window.localStorage.setItem(STORAGE_KEY, next);
      } catch {
        // Ignore storage errors
      }
      document.documentElement.lang = next === 'zh' ? 'zh-CN' : 'en';
    }
  }, []);

  const toggleLocale = useCallback(() => {
    setLocale(locale === 'zh' ? 'en' : 'zh');
  }, [locale, setLocale]);

  const resolveError = useCallback(
    (errorCode?: string | null, fallbackMsg?: string | null) =>
      resolveUsdfirmError(errorCode, fallbackMsg, locale),
    [locale]
  );

  return (
    <UsdfirmLocaleContext.Provider
      value={{
        locale,
        setLocale,
        toggleLocale,
        copy: USDFIRM_UI_COPY[locale],
        resolveError,
      }}
    >
      {children}
    </UsdfirmLocaleContext.Provider>
  );
}

export function useUsdfirmLocale(): UsdfirmLocaleContextValue {
  const ctx = useContext(UsdfirmLocaleContext);
  if (ctx) return ctx;
  return {
    locale: 'zh',
    setLocale: () => {},
    toggleLocale: () => {},
    copy: USDFIRM_UI_COPY.zh,
    resolveError: (errorCode?: string | null, fallbackMsg?: string | null) =>
      resolveUsdfirmError(errorCode, fallbackMsg, 'zh'),
  };
}

export function UsdfirmLocaleToggle({ className = '' }: { className?: string }) {
  const { locale, setLocale } = useUsdfirmLocale();
  return (
    <div
      role="group"
      aria-label="Language switcher"
      className={`inline-flex items-center rounded-xl border border-white/10 bg-zinc-950/90 p-1 text-xs font-mono ${className}`}
    >
      <button
        type="button"
        onClick={() => setLocale('zh')}
        className={`rounded-lg px-2.5 py-1 transition ${
          locale === 'zh'
            ? 'bg-emerald-500 text-zinc-950 font-bold'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        中文
      </button>
      <button
        type="button"
        onClick={() => setLocale('en')}
        className={`rounded-lg px-2.5 py-1 transition ${
          locale === 'en'
            ? 'bg-emerald-500 text-zinc-950 font-bold'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        EN
      </button>
    </div>
  );
}
