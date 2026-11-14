import { createHash } from 'node:crypto';
import type { UsdfAuditLogRecord } from './types';

export class UsdfAuditTrail {
  private static instance: UsdfAuditTrail;
  private logs: UsdfAuditLogRecord[] = [];

  private constructor() {
    this.seedGenesisLog();
  }

  public static getInstance(): UsdfAuditTrail {
    if (!UsdfAuditTrail.instance) {
      UsdfAuditTrail.instance = new UsdfAuditTrail();
    }
    return UsdfAuditTrail.instance;
  }

  private seedGenesisLog(): void {
    const genesisHash = '0x' + '0'.repeat(64);
    const currHash = this.computeHash(0, genesisHash, 'PROTOCOL_GENESIS', 'SYSTEM', 'USDFirm protocol genesis');
    this.logs.push({
      sequenceNum: 0,
      prevHash: genesisHash,
      currHash,
      actor: 'SYSTEM_ROOT',
      action: 'PROTOCOL_GENESIS',
      payloadSummary: 'USDFirm Dollar-Pegged Stablecoin Architecture Initialized',
      timestamp: new Date().toISOString(),
    });
  }

  private computeHash(
    seq: number,
    prev: string,
    action: string,
    actor: string,
    payload: string
  ): string {
    const raw = `${seq}|${prev}|${action}|${actor}|${payload}`;
    return '0x' + createHash('sha256').update(raw).digest('hex');
  }

  public append(actor: string, action: string, payloadSummary: string): UsdfAuditLogRecord {
    const last = this.logs[this.logs.length - 1];
    const sequenceNum = last.sequenceNum + 1;
    const prevHash = last.currHash;
    const currHash = this.computeHash(sequenceNum, prevHash, action, actor, payloadSummary);

    const record: UsdfAuditLogRecord = {
      sequenceNum,
      prevHash,
      currHash,
      actor,
      action,
      payloadSummary,
      timestamp: new Date().toISOString(),
    };

    this.logs.push(record);
    return record;
  }

  public getRecentLogs(limit = 20): UsdfAuditLogRecord[] {
    return [...this.logs].slice(-limit).reverse();
  }

  public verifyIntegrity(): boolean {
    for (let i = 1; i < this.logs.length; i++) {
      const prev = this.logs[i - 1];
      const curr = this.logs[i];
      if (curr.prevHash !== prev.currHash) return false;
      const expected = this.computeHash(
        curr.sequenceNum,
        curr.prevHash,
        curr.action,
        curr.actor,
        curr.payloadSummary
      );
      if (expected !== curr.currHash) return false;
    }
    return true;
  }
}
