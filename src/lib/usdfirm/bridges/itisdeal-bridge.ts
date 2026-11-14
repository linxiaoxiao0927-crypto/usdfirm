import { createHmac } from 'node:crypto';
import { UsdfAuditTrail } from '../audit-trail';

export interface ItisDealLiquidityRequest {
  poolId: string;
  orderType: 'MINT_LIQUIDITY' | 'BURN_REDEEM';
  amountUsdf: number;
  marketMakerId: string;
  exchangeNonce: number;
  vaultDepositRef: string;
}

export class ItisDealBridge {
  private static instance: ItisDealBridge;
  private readonly sharedSecret = 'itisdeal_exchange_usdfirm_segregated_secret';
  private allocatedExchangeBufferUsdf = 15_000_000; // $15M liquidity buffer
  private maxAllowedBufferUsdf = 20_000_000; // Hard cap preventing spillover
  private processedNonces = new Set<number>();

  private constructor() {}

  public static getInstance(): ItisDealBridge {
    if (!ItisDealBridge.instance) {
      ItisDealBridge.instance = new ItisDealBridge();
    }
    return ItisDealBridge.instance;
  }

  public verifySignature(req: ItisDealLiquidityRequest, signature: string): boolean {
    const raw = `${req.poolId}|${req.orderType}|${req.amountUsdf}|${req.marketMakerId}|${req.exchangeNonce}`;
    const expected = 'sha256=' + createHmac('sha256', this.sharedSecret).update(raw).digest('hex');
    return expected.toLowerCase() === signature.toLowerCase();
  }

  public executeLiquidityOperation(
    req: ItisDealLiquidityRequest,
    signature: string
  ): { status: 'COMMITTED'; bufferRemaining: number; txHash: string } {
    if (!this.verifySignature(req, signature)) {
      throw new Error('ITISDEAL_INVALID_SIGNATURE: Liquidity bridge HMAC verification failed');
    }
    if (this.processedNonces.has(req.exchangeNonce)) {
      throw new Error(`ITISDEAL_NONCE_REPLAY: Exchange nonce ${req.exchangeNonce} already consumed`);
    }

    if (req.orderType === 'MINT_LIQUIDITY') {
      if (this.allocatedExchangeBufferUsdf + req.amountUsdf > this.maxAllowedBufferUsdf) {
        throw new Error(
          `ITISDEAL_EXCHANGE_RISK_LIMIT: Segregation breach prevented. Buffer limit $${this.maxAllowedBufferUsdf.toLocaleString()} exceeded`
        );
      }
      this.allocatedExchangeBufferUsdf += req.amountUsdf;
    } else {
      if (this.allocatedExchangeBufferUsdf < req.amountUsdf) {
        throw new Error('ITISDEAL_BUFFER_UNDERFLOW: Redeem exceeds active exchange buffer');
      }
      this.allocatedExchangeBufferUsdf -= req.amountUsdf;
    }

    this.processedNonces.add(req.exchangeNonce);
    const txHash = '0x' + createHmac('sha256', this.sharedSecret)
      .update(`ITISDEAL_LIQ_${req.exchangeNonce}_${Date.now()}`)
      .digest('hex');

    UsdfAuditTrail.getInstance().append(
      'ITISDEAL_EXCHANGE_BRIDGE',
      'EXCHANGE_LIQUIDITY_BRIDGED',
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

  public generateSignatureForTesting(req: ItisDealLiquidityRequest): string {
    const raw = `${req.poolId}|${req.orderType}|${req.amountUsdf}|${req.marketMakerId}|${req.exchangeNonce}`;
    return 'sha256=' + createHmac('sha256', this.sharedSecret).update(raw).digest('hex');
  }
}
