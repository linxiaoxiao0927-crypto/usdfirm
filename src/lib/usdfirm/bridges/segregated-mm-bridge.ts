import { createHmac } from 'node:crypto';
import { UsdfAuditTrail } from '../audit-trail';

export interface SegregatedMmLiquidityRequest {
  poolId: string;
  orderType: 'MINT_LIQUIDITY' | 'BURN_REDEEM';
  amountUsdf: number;
  marketMakerId: string;
  exchangeNonce: number;
  vaultDepositRef: string;
}

export class SegregatedMmBridge {
  private static instance: SegregatedMmBridge;
  private readonly sharedSecret = 'segregated_mm_desk_usdfirm_ringfenced_secret';
  private allocatedExchangeBufferUsdf = 8_500_000; // $8.5M initial liquidity buffer
  private maxAllowedBufferUsdf = 20_000_000; // Hard cap preventing spillover
  private processedNonces = new Set<number>();

  private constructor() {}

  public static getInstance(): SegregatedMmBridge {
    if (!SegregatedMmBridge.instance) {
      SegregatedMmBridge.instance = new SegregatedMmBridge();
    }
    return SegregatedMmBridge.instance;
  }

  public verifySignature(req: SegregatedMmLiquidityRequest, signature: string): boolean {
    const raw = `${req.poolId}|${req.orderType}|${req.amountUsdf}|${req.marketMakerId}|${req.exchangeNonce}`;
    const expected = 'sha256=' + createHmac('sha256', this.sharedSecret).update(raw).digest('hex');
    return expected.toLowerCase() === signature.toLowerCase();
  }

  public executeLiquidityOperation(
    req: SegregatedMmLiquidityRequest,
    signature: string
  ): { status: 'COMMITTED'; bufferRemaining: number; txHash: string } {
    if (!this.verifySignature(req, signature)) {
      throw new Error('SEGREGATED_MM_INVALID_SIGNATURE: Liquidity bridge HMAC verification failed');
    }
    if (this.processedNonces.has(req.exchangeNonce)) {
      throw new Error(`SEGREGATED_MM_NONCE_REPLAY: Desk nonce ${req.exchangeNonce} already consumed`);
    }

    if (req.orderType === 'MINT_LIQUIDITY') {
      if (this.allocatedExchangeBufferUsdf + req.amountUsdf > this.maxAllowedBufferUsdf) {
        throw new Error(
          `SEGREGATED_MM_RISK_LIMIT: Segregation breach prevented. Buffer limit $${this.maxAllowedBufferUsdf.toLocaleString()} exceeded`
        );
      }
      this.allocatedExchangeBufferUsdf += req.amountUsdf;
    } else {
      if (this.allocatedExchangeBufferUsdf < req.amountUsdf) {
        throw new Error('SEGREGATED_MM_BUFFER_UNDERFLOW: Redeem exceeds active segregated buffer');
      }
      this.allocatedExchangeBufferUsdf -= req.amountUsdf;
    }

    this.processedNonces.add(req.exchangeNonce);
    const txHash =
      '0x' +
      createHmac('sha256', this.sharedSecret)
        .update(`SEGREGATED_MM_LIQ_${req.exchangeNonce}_${Date.now()}`)
        .digest('hex');

    UsdfAuditTrail.getInstance().append(
      'SEGREGATED_MM_BRIDGE',
      'MM_LIQUIDITY_BRIDGED',
      `Action: ${req.orderType} | Amount: $${req.amountUsdf.toLocaleString()} USDF | Pool: ${req.poolId} | Segregated Buffer: $${this.allocatedExchangeBufferUsdf.toLocaleString()}`
    );

    return {
      status: 'COMMITTED',
      bufferRemaining: this.allocatedExchangeBufferUsdf,
      txHash,
    };
  }

  public getSegregatedBufferStatus(): { allocated: number; maxCap: number; isSegregated: boolean } {
    return {
      allocated: this.allocatedExchangeBufferUsdf,
      maxCap: this.maxAllowedBufferUsdf,
      isSegregated: true,
    };
  }

  public generateSignatureForTesting(req: SegregatedMmLiquidityRequest): string {
    const raw = `${req.poolId}|${req.orderType}|${req.amountUsdf}|${req.marketMakerId}|${req.exchangeNonce}`;
    return 'sha256=' + createHmac('sha256', this.sharedSecret).update(raw).digest('hex');
  }
}
