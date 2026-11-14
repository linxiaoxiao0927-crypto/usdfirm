import { createHash } from 'node:crypto';
import type { UsdfMintBurnOrderRecord } from './types';
import { UsdfReserveEngine } from './reserve-engine';
import { UsdfRiskMonitor } from './risk-monitor';
import { UsdfMultiSigTimelock } from './multisig-timelock';
import { UsdfAuditTrail } from './audit-trail';

export interface InitiateMintRequest {
  partnerSite: 'xpayes.com' | 'itisdeal.com' | 'institutional_direct';
  requesterPubkey: string;
  amountUsd: number;
  xpayesRef?: string;
  itisdealRef?: string;
}

export interface InitiateBurnRequest {
  partnerSite: 'xpayes.com' | 'itisdeal.com' | 'institutional_direct';
  requesterPubkey: string;
  amountUsdf: number;
  burnAuthorizationSignature: string;
}

export class UsdfMintBurnEngine {
  private static instance: UsdfMintBurnEngine;
  private orders: UsdfMintBurnOrderRecord[] = [];
  private blacklistedAddresses = new Set<string>([
    '0x000000000000000000000000000000000000dead',
    '0x7f367cc41522ce07553e846bc1068009752d4791', // Tornado Cash sanction list (normalized lowercase)
  ]);

  private constructor() {
    this.seedRecentOrders();
  }

  public static getInstance(): UsdfMintBurnEngine {
    if (!UsdfMintBurnEngine.instance) {
      UsdfMintBurnEngine.instance = new UsdfMintBurnEngine();
    }
    return UsdfMintBurnEngine.instance;
  }

  private seedRecentOrders(): void {
    this.orders.push({
      orderNo: 'ORD-MINT-20261103-01',
      orderType: 'MINT',
      partnerSite: 'xpayes.com',
      requesterPubkey: '0x9965507D1a55bcC2695C58ba16FB37d819B0A4df',
      amountUsd: 500_000,
      feeUsd: 250,
      status: 'EXECUTED',
      txHash: '0x' + createHash('sha256').update('seed_mint_01').digest('hex'),
      xpayesRef: 'XPAY-WIRE-9921',
      itisdealRef: null,
      timelockEta: null,
      executedAt: new Date(Date.now() - 3600 * 1000).toISOString(),
      createdAt: new Date(Date.now() - 3650 * 1000).toISOString(),
    });
  }

  public getOrders(): UsdfMintBurnOrderRecord[] {
    return [...this.orders];
  }

  public requestMint(req: InitiateMintRequest): UsdfMintBurnOrderRecord {
    if (this.blacklistedAddresses.has(req.requesterPubkey.toLowerCase())) {
      throw new Error('COMPLIANCE_BLOCKED: Sanctioned or OFAC blacklisted recipient address');
    }
    if (req.amountUsd <= 0) {
      throw new Error('INVALID_AMOUNT: Mint amount must be greater than zero');
    }

    const riskMonitor = UsdfRiskMonitor.getInstance();
    riskMonitor.recordMintVolume(req.amountUsd);

    const orderNo = `ORD-MINT-${Date.now().toString(36).toUpperCase()}`;
    const feeUsd = Number((req.amountUsd * 0.0005).toFixed(2)); // 5 bps fee
    const isLargeTimelockRequired = req.amountUsd >= 1_000_000;

    let status: UsdfMintBurnOrderRecord['status'] = 'EXECUTED';
    let timelockEta: string | null = null;
    let txHash: string | null = null;
    let executedAt: string | null = null;

    if (isLargeTimelockRequired) {
      status = 'QUEUED_TIMELOCK';
      const delay = 86400; // 24 hours
      timelockEta = new Date(Date.now() + delay * 1000).toISOString();
      UsdfMultiSigTimelock.getInstance().proposeOperation(
        `LARGE_MINT_${req.amountUsd}_USDF_TO_${req.requesterPubkey.slice(0, 8)}`,
        '0x71bE63f3384f5fb989954511666383774cdAC97a',
        delay
      );
    } else {
      executedAt = new Date().toISOString();
      txHash = '0x' + createHash('sha256').update(orderNo + Date.now()).digest('hex');
      UsdfReserveEngine.getInstance().adjustCirculatingSupply(req.amountUsd);
    }

    const order: UsdfMintBurnOrderRecord = {
      orderNo,
      orderType: 'MINT',
      partnerSite: req.partnerSite,
      requesterPubkey: req.requesterPubkey,
      amountUsd: req.amountUsd,
      feeUsd,
      status,
      txHash,
      xpayesRef: req.xpayesRef ?? null,
      itisdealRef: req.itisdealRef ?? null,
      timelockEta,
      executedAt,
      createdAt: new Date().toISOString(),
    };

    this.orders.unshift(order);
    UsdfAuditTrail.getInstance().append(
      req.requesterPubkey,
      isLargeTimelockRequired ? 'MINT_QUEUED_TIMELOCK' : 'MINT_EXECUTED',
      `Order ${orderNo}: Mint $${req.amountUsd.toLocaleString()} USDF | Status: ${status}`
    );

    return order;
  }

  public requestBurn(req: InitiateBurnRequest): UsdfMintBurnOrderRecord {
    if (this.blacklistedAddresses.has(req.requesterPubkey.toLowerCase())) {
      throw new Error('COMPLIANCE_BLOCKED: Sanctioned burner address');
    }
    const reserveEngine = UsdfReserveEngine.getInstance();
    if (req.amountUsdf > reserveEngine.getCirculatingUsdf()) {
      throw new Error('INSUFFICIENT_CIRCULATION: Burn amount exceeds total circulating USDF');
    }

    const orderNo = `ORD-BURN-${Date.now().toString(36).toUpperCase()}`;
    const feeUsd = Number((req.amountUsdf * 0.0003).toFixed(2));
    const txHash = '0x' + createHash('sha256').update(orderNo + Date.now()).digest('hex');
    const executedAt = new Date().toISOString();

    reserveEngine.adjustCirculatingSupply(-req.amountUsdf);

    const order: UsdfMintBurnOrderRecord = {
      orderNo,
      orderType: 'BURN',
      partnerSite: req.partnerSite,
      requesterPubkey: req.requesterPubkey,
      amountUsd: req.amountUsdf,
      feeUsd,
      status: 'EXECUTED',
      txHash,
      xpayesRef: null,
      itisdealRef: null,
      timelockEta: null,
      executedAt,
      createdAt: executedAt,
    };

    this.orders.unshift(order);
    UsdfAuditTrail.getInstance().append(
      req.requesterPubkey,
      'BURN_EXECUTED',
      `Order ${orderNo}: Burn $${req.amountUsdf.toLocaleString()} USDF | Tx: ${txHash}`
    );

    return order;
  }
}
