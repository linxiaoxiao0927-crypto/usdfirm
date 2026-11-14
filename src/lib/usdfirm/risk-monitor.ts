import type { UsdfRiskTelemetrySnapshot } from './types';
import { UsdfReserveEngine } from './reserve-engine';
import { UsdfAuditTrail } from './audit-trail';

export class UsdfRiskMonitor {
  private static instance: UsdfRiskMonitor;
  private circuitBreakerActive = false;
  private currentPegUsd = 1.0001; // $1.0001
  private dailyMintVolumeUsd = 4_250_000;
  private dailyMintCapUsd = 25_000_000;

  private constructor() {}

  public static getInstance(): UsdfRiskMonitor {
    if (!UsdfRiskMonitor.instance) {
      UsdfRiskMonitor.instance = new UsdfRiskMonitor();
    }
    return UsdfRiskMonitor.instance;
  }

  public getTelemetry(): UsdfRiskTelemetrySnapshot {
    const reserveEngine = UsdfReserveEngine.getInstance();
    const totalReserves = reserveEngine.getTotalReserveMarketValue();
    const circulating = reserveEngine.getCirculatingUsdf();
    const reserveRatioPct = Number(((totalReserves / circulating) * 100).toFixed(2));

    const depegDeltaBps = Math.round(Math.abs(this.currentPegUsd - 1.0) * 10000);

    let alertLevel: 'NORMAL' | 'WARNING' | 'EMERGENCY_FREEZE' = 'NORMAL';
    if (reserveRatioPct < 100.0 || this.circuitBreakerActive) {
      alertLevel = 'EMERGENCY_FREEZE';
    } else if (reserveRatioPct < 101.0 || depegDeltaBps > 50) {
      alertLevel = 'WARNING';
    }

    return {
      circuitBreakerActive: this.circuitBreakerActive,
      reserveRatioPct,
      depegDeltaBps,
      currentPegUsd: this.currentPegUsd,
      dailyMintVolumeUsd: this.dailyMintVolumeUsd,
      dailyMintCapUsd: this.dailyMintCapUsd,
      isExchangeRiskSegregated: true,
      lastCheckTimestamp: new Date().toISOString(),
      alertLevel,
    };
  }

  public recordMintVolume(amount: number): void {
    if (this.circuitBreakerActive) {
      throw new Error('RISK_CIRCUIT_BREAKER_ACTIVE: Protocol paused due to risk telemetry trigger');
    }
    if (this.dailyMintVolumeUsd + amount > this.dailyMintCapUsd) {
      throw new Error(
        `RISK_DAILY_CAP_EXCEEDED: Daily limit $${this.dailyMintCapUsd.toLocaleString()} USD exceeded`
      );
    }
    this.dailyMintVolumeUsd += amount;
  }

  public setCircuitBreaker(active: boolean, reason: string, actor: string): void {
    this.circuitBreakerActive = active;
    UsdfAuditTrail.getInstance().append(
      actor,
      active ? 'CIRCUIT_BREAKER_TRIPPED' : 'CIRCUIT_BREAKER_RESTORED',
      `Circuit breaker set to ${active}. Reason: ${reason}`
    );
  }

  public simulateDepegTest(targetPeg: number): void {
    this.currentPegUsd = targetPeg;
    if (targetPeg < 0.990 || targetPeg > 1.010) {
      this.circuitBreakerActive = true;
    }
  }

  public resetPeg(): void {
    this.currentPegUsd = 1.0001;
    this.circuitBreakerActive = false;
  }
}
