import type {
  SkillDefinition,
  LedgerAccountRecord,
  LedgerEntryRecord,
  FourFlowEscrowRecord,
  ReserveAssetItem,
} from '@/types/ledger';

export const SHINEMIGHT_SKILLS: SkillDefinition[] = [
  {
    code: 'SKILL_01_SETUPYES',
    name: 'SetupYes 全球极速注册',
    domain: 'setupyes.com',
    category: 'B2B_INFRA',
    unitLabel: '次主体生成/牌照核验',
    gasPerUnit: 25000,
    burnRatio: 0.12,
    providerRatio: 0.88,
    description: '全球公司注册、海外秘书地址、牌照与税号自动申领接口',
  },
  {
    code: 'SKILL_02_TAXYES',
    name: 'TaxYes AI 全球节税路由',
    domain: 'taxyesai.com',
    category: 'B2B_INFRA',
    unitLabel: '千Token节税推演/1039合规',
    gasPerUnit: 8000,
    burnRatio: 0.15,
    providerRatio: 0.85,
    description: '跨国转移定价、专利盒剥离、1039无票合规与园区核定匹配',
  },
  {
    code: 'SKILL_03_UPTOYES',
    name: 'UptoYes 智能跨境履约',
    domain: 'uptoyes.com',
    category: 'B2B_INFRA',
    unitLabel: '单包清关/UWB无人机航段',
    gasPerUnit: 12000,
    burnRatio: 0.10,
    providerRatio: 0.90,
    description: '跨境集运、包税清关及末端无人机厘米级悬停入窗派送',
  },
  {
    code: 'SKILL_04_FITJOB',
    name: 'FitJob 全球 EOR 与背调',
    domain: 'fitjob.ai',
    category: 'AI_COMPUTE',
    unitLabel: '次跨店背调/EOR合约清算',
    gasPerUnit: 15000,
    burnRatio: 0.15,
    providerRatio: 0.85,
    description: 'AI 招聘、跨店实训背调网与全球 EOR 灵活用工合规发薪',
  },
  {
    code: 'SKILL_05_TOCADS',
    name: 'TocAds 对话式投流 Agent',
    domain: 'tocads.com',
    category: 'AI_COMPUTE',
    unitLabel: '千次实时竞价与税前凭证',
    gasPerUnit: 6000,
    burnRatio: 0.18,
    providerRatio: 0.82,
    description: 'AI 广告营销生成与对话式全球投流，联动税前抵扣凭证',
  },
  {
    code: 'SKILL_06_IDLES',
    name: 'Idles 闲置 GPU 算力集群',
    domain: 'idles.site',
    category: 'AI_COMPUTE',
    unitLabel: 'GPU显存秒级切片 (A100/H100)',
    gasPerUnit: 4500,
    burnRatio: 0.15,
    providerRatio: 0.85,
    description: '分布式闲置算力变现与高并发 AI 推理/60fps音视频渲染集群',
  },
];

export function createInitialReserves(): ReserveAssetItem[] {
  return [
    {
      id: 'RES-XPAY-01',
      custodian: 'XPayes Global Treasury vIBAN',
      assetName: 'USD 离岸银行活期备付金 & 短期美债',
      channelDomain: 'xpayes.com',
      usdValue: 8450000,
      allocationPct: 65.0,
      merkleRoot: '0x9f84c2e1a7b389d04e5f1a2b3c4d5e6f7a8b9c0d',
      lastAuditedAt: '2026-10-30T02:00:00Z',
    },
    {
      id: 'RES-ITIS-02',
      custodian: 'ItisCoin Cold Multi-Sig Vault',
      assetName: 'USDT / USDC / ITIS 链上超额流动性池',
      channelDomain: 'itiscoin.com',
      usdValue: 4550000,
      allocationPct: 35.0,
      merkleRoot: '0x3b71d9e0f2a4c6e813579bdf2468ace019283746',
      lastAuditedAt: '2026-10-30T02:00:00Z',
    },
  ];
}

export function createInitialAccounts(): LedgerAccountRecord[] {
  const now = '2026-10-30T01:30:00Z';
  const rows: Array<
    [string, string, string, LedgerAccountRecord['accountType'], number, number]
  > = [
    ['ACC-RESERVE-POOL', 'usdfirm.com', 'RESERVE-VAULT-MASTER', 'ASSET_RESERVE', 12500000, 820000000],
    ['ACC-SOFAYES-CORE', 'sofayes.com', 'ENT-SOFA-CORE', 'USER_WALLET', 4200000, 450000000],
    ['ACC-HMM-MALL', 'hmm.sale', 'ENT-HMM-CROSSBORDER', 'USER_WALLET', 3150000, 120000000],
    ['ACC-DEZI-OS', 'dezi.life', 'ENT-DEZI-SUPPLY', 'USER_WALLET', 1850000, 65000000],
    ['ACC-SKILLS-POOL', 'shinemight.com', 'ENT-B2B-SKILLS-NODE', 'SKILL_GAS_POOL', 2100000, 150000000],
    ['ACC-ESCROW-VAULT', 'usdfirm.com', 'ESCROW-4FLOW-LOCK', 'ESCROW_VAULT', 1200000, 0],
    ['ACC-TREASURY-BURN', 'itiscoin.com', 'TREASURY-BURN-HOLE', 'TREASURY_BURN', 0, 35000000],
  ];
  return rows.map(([id, ownerSite, ownerEntity, accountType, asdStableBal, asdGasBal]) => ({
    id,
    ownerSite,
    ownerEntity,
    accountType,
    asdStableBal,
    asdGasBal,
    version: 1,
    updatedAt: now,
  }));
}

export function createInitialEntries(): LedgerEntryRecord[] {
  return [
    {
      id: 'TX-INIT-01',
      idempotencyKey: 'seed-idem-001',
      txHash: '0xusd88f1c9a02e34d5b6c7a89012f3e4d',
      debitAccId: 'ACC-SOFAYES-CORE',
      creditAccId: 'ACC-SKILLS-POOL',
      amount: 450000,
      tokenType: 'UUSDF',
      skillCode: 'SKILL_06_IDLES',
      memo: 'sofayes.com 60fps词级对齐与声音克隆实时算力清算',
      category: 'AI_COMPUTE',
      createdAt: '2026-10-30T01:55:12Z',
    },
    {
      id: 'TX-INIT-02',
      idempotencyKey: 'seed-idem-002',
      txHash: '0xusd77b2d8e91c45f6a1b2c3d4e5f6a7b',
      debitAccId: 'ACC-HMM-MALL',
      creditAccId: 'ACC-ESCROW-VAULT',
      amount: 68000,
      tokenType: 'USDF',
      skillCode: 'SKILL_03_UPTOYES',
      memo: 'hmm.sale 跨境严选批次 #882 四流合一托管锁定',
      category: 'RETAIL_BRANDS',
      createdAt: '2026-10-30T01:58:40Z',
    },
    {
      id: 'TX-INIT-03',
      idempotencyKey: 'seed-idem-003',
      txHash: '0xusd66a3f7c82b11e9d0a1b2c3d4e5f60',
      debitAccId: 'ACC-DEZI-OS',
      creditAccId: 'ACC-SKILLS-POOL',
      amount: 120000,
      tokenType: 'UUSDF',
      skillCode: 'SKILL_02_TAXYES',
      memo: 'dezi.life 嘚滋餐饮供应链园区核定与分润税务路由',
      category: 'B2B_INFRA',
      createdAt: '2026-10-30T02:02:05Z',
    },
  ];
}

export function createInitialEscrows(): FourFlowEscrowRecord[] {
  return [
    {
      id: 'ESC-01',
      orderNo: 'ORD-HMM-2026-8821',
      sourceSite: 'hmm.sale',
      buyerEntity: 'ENT-SOFA-CORE',
      totalAmountAsd: 68000,
      status: 'LOCKED_IN_TRANSIT',
      setupyesEntity: 'DID-SG-2026-99102',
      taxyesRouteId: 'TAX-1039-SZ-019',
      xpayesPayment: 'XPAY-SETTLE-99812',
      uptoyesWaybill: null,
      splitRules: [
        { recipientSite: 'hmm.sale', roleLabel: 'C2M 供应链货款', percentage: 78 },
        { recipientSite: 'uptoyes.com', roleLabel: '包税集运与无人机派送', percentage: 12 },
        { recipientSite: 'taxyesai.com', roleLabel: '1039 合规税务预提', percentage: 8 },
        { recipientSite: 'itiscoin.com', roleLabel: '财资清算燃烧回购池', percentage: 2 },
      ],
      settledAt: null,
      createdAt: '2026-10-30T01:58:40Z',
    },
    {
      id: 'ESC-02',
      orderNo: 'ORD-DEZI-2026-3319',
      sourceSite: 'dezi.life',
      buyerEntity: 'ENT-DEZI-SUPPLY',
      totalAmountAsd: 42000,
      status: 'SETTLED_SPLIT',
      setupyesEntity: 'DID-CN-CD-55120',
      taxyesRouteId: 'TAX-PARK-CD-004',
      xpayesPayment: 'XPAY-SETTLE-77410',
      uptoyesWaybill: 'UPTO-COLDCHAIN-6612',
      splitRules: [
        { recipientSite: 'dezi.life', roleLabel: '肚肠得意底料集采主款', percentage: 82 },
        { recipientSite: 'uptoyes.com', roleLabel: '冷链干线物流履约', percentage: 10 },
        { recipientSite: 'taxyesai.com', roleLabel: '园区合规节税托管', percentage: 6 },
        { recipientSite: 'itiscoin.com', roleLabel: '财资清算燃烧回购池', percentage: 2 },
      ],
      settledAt: '2026-10-30T01:40:00Z',
      createdAt: '2026-10-30T01:12:00Z',
    },
  ];
}
