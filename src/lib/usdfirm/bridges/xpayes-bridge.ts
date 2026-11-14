import { createHmac } from 'node:crypto';
import { UsdfAuditTrail } from '../audit-trail';

export interface XPayesSettlementPayload {
  merchantId: string;
  depositCurrency: 'USD' | 'EUR' | 'GBP';
  depositAmount: number;
  usdfPayoutAmount: number;
  vIbanAccount: string;
  paymentRef: string;
  timestamp: string;
}

export class XPayesBridge {
  private static instance: XPayesBridge;
  private readonly sharedSecret = 'xpayes_usdfirm_gateway_hmac_secret_2026';
  private processedRefs = new Set<string>();

  private constructor() {}

  public static getInstance(): XPayesBridge {
    if (!XPayesBridge.instance) {
      XPayesBridge.instance = new XPayesBridge();
    }
    return XPayesBridge.instance;
  }

  public verifySignature(payload: XPayesSettlementPayload, signature: string): boolean {
    const raw = `${payload.merchantId}|${payload.depositCurrency}|${payload.depositAmount}|${payload.usdfPayoutAmount}|${payload.paymentRef}`;
    const expected = 'sha256=' + createHmac('sha256', this.sharedSecret).update(raw).digest('hex');
    return expected.toLowerCase() === signature.toLowerCase();
  }

  public processSettlement(
    payload: XPayesSettlementPayload,
    signature: string
  ): { status: 'SETTLED'; txHash: string } {
    if (!this.verifySignature(payload, signature)) {
      throw new Error('XPAYES_INVALID_SIGNATURE: Webhook signature authentication failed');
    }
    if (this.processedRefs.has(payload.paymentRef)) {
      throw new Error(`XPAYES_IDEMPOTENCY_CONFLICT: Payment ref ${payload.paymentRef} already processed`);
    }

    this.processedRefs.add(payload.paymentRef);
    const txHash = '0x' + createHmac('sha256', this.sharedSecret)
      .update(`XPAYES_TX_${payload.paymentRef}_${Date.now()}`)
      .digest('hex');

    UsdfAuditTrail.getInstance().append(
      'XPAYES_GATEWAY',
      'XPAYES_SETTLEMENT_PROCESSED',
      `Merchant: ${payload.merchantId} | Deposit: ${payload.depositAmount} ${payload.depositCurrency} -> Minted ${payload.usdfPayoutAmount} USDF | Ref: ${payload.paymentRef}`
    );

    return { status: 'SETTLED', txHash };
  }

  public generateSignatureForTesting(payload: XPayesSettlementPayload): string {
    const raw = `${payload.merchantId}|${payload.depositCurrency}|${payload.depositAmount}|${payload.usdfPayoutAmount}|${payload.paymentRef}`;
    return 'sha256=' + createHmac('sha256', this.sharedSecret).update(raw).digest('hex');
  }
}
