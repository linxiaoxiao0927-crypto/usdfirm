import { createHash } from 'node:crypto';
import type { UsdfReserveAssetItem, UsdfPoRAttestation } from './types';
import { UsdfAuditTrail } from './audit-trail';

export class UsdfReserveEngine {
  private static instance: UsdfReserveEngine;
  private reserves: UsdfReserveAssetItem[] = [];
  private circulatingUsdf = 120_000_000; // $120M circulating USDF

  private constructor() {
    this.seedInstitutionalReserves();
  }

  public static getInstance(): UsdfReserveEngine {
    if (!UsdfReserveEngine.instance) {
      UsdfReserveEngine.instance = new UsdfReserveEngine();
    }
    return UsdfReserveEngine.instance;
  }

  private seedInstitutionalReserves(): void {
    this.reserves = [
      {
        cusip: '912797HY7',
        name: 'US Treasury Bill 4-Week (Mat. 2026-11-26)',
        assetType: 'US_TREASURY_BILL',
        custodian: 'BNY Mellon Institutional Custody',
        maturityDate: '2026-11-26T16:00:00Z',
        notionalUsd: 45_000_000,
        marketUsd: 44_865_000,
        yieldApy: 4.85,
        lastAuditDate: new Date().toISOString(),
      },
      {
        cusip: '912797HZ4',
        name: 'US Treasury Bill 13-Week (Mat. 2026-12-31)',
        assetType: 'US_TREASURY_BILL',
        custodian: 'State Street Global Custody',
        maturityDate: '2026-12-31T16:00:00Z',
        notionalUsd: 40_000_000,
        marketUsd: 39_810_000,
        yieldApy: 4.92,
        lastAuditDate: new Date().toISOString(),
      },
      {
        cusip: 'CASH-BNY-FED-01',
        name: 'Fed Overnight Reverse Repo (RRP) Cash',
        assetType: 'OVERNIGHT_REPO',
        custodian: 'Federal Reserve Bank of New York',
        maturityDate: null,
        notionalUsd: 25_000_000,
        marketUsd: 25_000_000,
        yieldApy: 4.75,
        lastAuditDate: new Date().toISOString(),
      },
      {
        cusip: 'CASH-FDIC-SWEEP-02',
        name: 'FDIC-Insured Multi-Bank Cash Sweep Account',
        assetType: 'FDIC_CASH_DEPOSIT',
        custodian: 'JPMorgan Chase / Citigroup Segregated',
        maturityDate: null,
        notionalUsd: 15_000_000,
        marketUsd: 15_000_000,
        yieldApy: 4.50,
        lastAuditDate: new Date().toISOString(),
      },
    ];
  }

  public getReserves(): UsdfReserveAssetItem[] {
    return [...this.reserves];
  }

  public getTotalReserveMarketValue(): number {
    return this.reserves.reduce((sum, r) => sum + r.marketUsd, 0);
  }

  public getCirculatingUsdf(): number {
    return this.circulatingUsdf;
  }

  public adjustCirculatingSupply(delta: number): void {
    this.circulatingUsdf += delta;
  }

  public computeMerkleRoot(): string {
    const leaves = this.reserves.map((r) => {
      const data = `${r.cusip}|${r.assetType}|${r.custodian}|${r.marketUsd}|${r.lastAuditDate}`;
      return createHash('sha256').update(data).digest('hex');
    });

    if (leaves.length === 0) return '0x' + '0'.repeat(64);

    let layer = leaves;
    while (layer.length > 1) {
      const next: string[] = [];
      for (let i = 0; i < layer.length; i += 2) {
        const left = layer[i];
        const right = i + 1 < layer.length ? layer[i + 1] : left;
        const combined = createHash('sha256')
          .update(Buffer.from(left + right, 'hex'))
          .digest('hex');
        next.push(combined);
      }
      layer = next;
    }
    return '0x' + layer[0];
  }

  public generatePoRAttestation(roundId = 1): UsdfPoRAttestation {
    const totalReservesUsd = this.getTotalReserveMarketValue();
    const circulatingUsdf = this.getCirculatingUsdf();
    const reserveRatioPct = (totalReservesUsd / circulatingUsdf) * 100;
    const merkleRoot = this.computeMerkleRoot();
    const now = new Date();

    const attestation: UsdfPoRAttestation = {
      roundId,
      timestamp: now.toISOString(),
      totalReservesUsd,
      circulatingUsdf,
      reserveRatioPct: Number(reserveRatioPct.toFixed(2)),
      merkleRoot,
      auditorFirm: 'Grant Thornton LLP & Chainlink Oracle Node',
      attestationReportUrl: 'https://usdfirm.com/attestation/GT-2026-USDF-R1.pdf',
      isCompliant: reserveRatioPct >= 100,
      chainlinkRoundData: {
        roundId,
        answerMicro: (BigInt(Math.round(totalReservesUsd)) * 1_000_000n).toString(),
        updatedAt: Math.floor(now.getTime() / 1000),
      },
    };

    UsdfAuditTrail.getInstance().append(
      'CHAINLINK_ORACLE_NODE',
      'POR_ATTESTATION_GENERATED',
      `Round #${roundId}: Reserves $${totalReservesUsd.toLocaleString()} | USDF $${circulatingUsdf.toLocaleString()} | Ratio ${attestation.reserveRatioPct}%`
    );

    return attestation;
  }
}
