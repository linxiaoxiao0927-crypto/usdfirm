import { z } from 'zod';

export const SkillCodeSchema = z.enum([
  'SKILL_01_SETUPYES',
  'SKILL_02_TAXYES',
  'SKILL_03_UPTOYES',
  'SKILL_04_FITJOB',
  'SKILL_05_TOCADS',
  'SKILL_06_IDLES',
]);

export const MintOrRedeemSchema = z.object({
  action: z.enum(['MINT', 'REDEEM']),
  ownerSite: z
    .string()
    .min(3, '站点域名至少3个字符')
    .max(64),
  ownerEntity: z
    .string()
    .min(2, '主体标识至少2个字符')
    .max(64),
  amountUsd: z
    .number()
    .positive('金额必须大于 0')
    .max(10_000_000, '单笔上限 10,000,000 USD'),
  channel: z.enum(['XPAYES_VIBAN', 'ITISCOIN_CHAIN']),
  idempotencyKey: z
    .string()
    .min(6, '幂等键长度至少为6位')
    .max(128),
});

export type MintOrRedeemInput = z.infer<typeof MintOrRedeemSchema>;

export const SkillGasBurnSchema = z.object({
  callerSite: z.string().min(3).max(64),
  callerEntity: z.string().min(2).max(64),
  skillCode: SkillCodeSchema,
  units: z
    .number()
    .positive('调用数量必须大于 0')
    .max(1_000_000),
  idempotencyKey: z.string().min(6).max(128),
});

export type SkillGasBurnInput = z.infer<typeof SkillGasBurnSchema>;

export const EscrowSettleSchema = z.object({
  action: z.literal('SETTLE').optional(),
  orderNo: z.string().min(4).max(64),
  setupyesEntity: z.string().min(4, '缺少 SetupYes 主体凭证'),
  taxyesRouteId: z.string().min(4, '缺少 TaxYes 节税路由ID'),
  xpayesPayment: z.string().min(4, '缺少 XPayes 资金流水号'),
  uptoyesWaybill: z.string().min(4, '缺少 UptoYes 履约运单号'),
  idempotencyKey: z.string().min(6).max(128),
});

export type EscrowSettleInput = z.infer<typeof EscrowSettleSchema>;

export const EscrowCreateSchema = z.object({
  action: z.literal('CREATE').optional(),
  orderNo: z.string().min(4).max(64),
  sourceSite: z.string().min(3).max(64),
  buyerEntity: z.string().min(2).max(64),
  totalAmountAsd: z.number().positive().max(5_000_000),
  setupyesEntity: z.string().min(4),
  taxyesRouteId: z.string().min(4),
  xpayesPayment: z.string().min(4),
  uptoyesWaybill: z.string().optional(),
  idempotencyKey: z.string().min(6).max(128),
});

export type EscrowCreateInput = z.infer<typeof EscrowCreateSchema>;

export const TokenSwapSchema = z.object({
  ownerSite: z.string().min(3).max(64),
  ownerEntity: z.string().min(2).max(64),
  direction: z.enum(['USDF_TO_UUSDF', 'UUSDF_TO_USDF']),
  amount: z.number().positive('ERR_INVALID_AMOUNT').max(100_000_000_000),
  idempotencyKey: z.string().min(6).max(128),
});

export type TokenSwapInput = z.infer<typeof TokenSwapSchema>;

export const FederationEventSchema = z.object({
  sourceSite: z.string().min(3).max(64),
  targetSite: z.string().min(3).max(64),
  eventType: z.enum([
    'SKILL_STREAM_SETTLE',
    'CROSS_MALL_ORDER_LOCK',
    'TAX_ROUTE_REBATE',
    'COMPUTE_LEASE_PAYOUT',
  ]),
  amountAsdS: z.number().positive().max(1_000_000),
  hmacSignature: z.string().min(10, '缺少跨站 HMAC 签名摘要'),
  payloadSummary: z.string().min(4).max(200),
  idempotencyKey: z.string().min(6).max(128),
});

export type FederationEventInput = z.infer<typeof FederationEventSchema>;
