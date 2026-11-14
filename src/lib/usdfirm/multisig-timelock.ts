import { createHash } from 'node:crypto';
import type { TimelockProposalRecord } from './types';
import { UsdfAuditTrail } from './audit-trail';

export class UsdfMultiSigTimelock {
  private static instance: UsdfMultiSigTimelock;
  private proposals: TimelockProposalRecord[] = [];
  public readonly requiredConfirmations = 3;
  public readonly signers: string[] = [
    '0x71bE63f3384f5fb989954511666383774cdAC97a', // BNY Custody Officer
    '0x2546BcD3c84621e976D8185a91A922aE77ECEc30', // Chief Compliance Director
    '0xbDA5747bFD65F08deb54cb465eB87D40e51B197E', // XPayes Ecosystem Representative
    '0xdD2FD4581271e230360230F9337D5c0430Bf44C0', // SecOps Multi-Sig Key
    '0x8626f6940E2eb28930eFb4CeF49B2d1F2C9C1199', // Independent Risk Officer
  ];

  private constructor() {
    this.seedSampleProposals();
  }

  public static getInstance(): UsdfMultiSigTimelock {
    if (!UsdfMultiSigTimelock.instance) {
      UsdfMultiSigTimelock.instance = new UsdfMultiSigTimelock();
    }
    return UsdfMultiSigTimelock.instance;
  }

  private seedSampleProposals(): void {
    const eta1 = new Date(Date.now() + 18 * 3600 * 1000).toISOString();
    this.proposals.push({
      proposalId: 'PROP-2026-001',
      targetAction: 'INCREASE_DAILY_MINT_CAP_TO_50M',
      proposer: this.signers[0],
      delaySeconds: 86400,
      eta: eta1,
      status: 'QUEUED',
      confirmCount: 2,
      requiredConfirmations: 3,
      signers: [this.signers[0], this.signers[1]],
      executionTx: null,
      createdAt: new Date(Date.now() - 6 * 3600 * 1000).toISOString(),
    });
  }

  public getProposals(): TimelockProposalRecord[] {
    return [...this.proposals];
  }

  public proposeOperation(
    targetAction: string,
    proposer: string,
    delaySeconds = 86400
  ): TimelockProposalRecord {
    if (!this.signers.includes(proposer)) {
      throw new Error('TIMELOCK_UNAUTHORIZED: Proposer is not an authorized multi-sig signer');
    }

    const proposalId = `PROP-${Date.now().toString(36).toUpperCase()}`;
    const eta = new Date(Date.now() + delaySeconds * 1000).toISOString();

    const proposal: TimelockProposalRecord = {
      proposalId,
      targetAction,
      proposer,
      delaySeconds,
      eta,
      status: 'QUEUED',
      confirmCount: 1,
      requiredConfirmations: this.requiredConfirmations,
      signers: [proposer],
      executionTx: null,
      createdAt: new Date().toISOString(),
    };

    this.proposals.unshift(proposal);
    UsdfAuditTrail.getInstance().append(
      proposer,
      'TIMELOCK_OPERATION_QUEUED',
      `Proposal ${proposalId}: ${targetAction} | Delay: ${delaySeconds}s | ETA: ${eta}`
    );

    return proposal;
  }

  public confirmProposal(proposalId: string, signer: string): TimelockProposalRecord {
    if (!this.signers.includes(signer)) {
      throw new Error('TIMELOCK_UNAUTHORIZED: Signer is not in authorized committee');
    }

    const prop = this.proposals.find((p) => p.proposalId === proposalId);
    if (!prop) throw new Error('TIMELOCK_NOT_FOUND: Proposal not found');
    if (prop.status !== 'QUEUED') throw new Error('TIMELOCK_INVALID_STATE: Proposal is not queued');
    if (prop.signers.includes(signer)) {
      throw new Error('TIMELOCK_DUPLICATE_SIGN: Signer has already confirmed this proposal');
    }

    prop.signers.push(signer);
    prop.confirmCount = prop.signers.length;

    UsdfAuditTrail.getInstance().append(
      signer,
      'TIMELOCK_CONFIRMATION_RECEIVED',
      `Proposal ${proposalId} signed (${prop.confirmCount}/${this.requiredConfirmations})`
    );

    return prop;
  }

  public executeProposal(proposalId: string, executor: string): TimelockProposalRecord {
    const prop = this.proposals.find((p) => p.proposalId === proposalId);
    if (!prop) throw new Error('TIMELOCK_NOT_FOUND: Proposal not found');
    if (prop.status !== 'QUEUED') throw new Error('TIMELOCK_ALREADY_RESOLVED');
    if (prop.confirmCount < this.requiredConfirmations) {
      throw new Error('TIMELOCK_THRESHOLD_UNMET: Quorum (3 of 5) required before execution');
    }

    const etaTimestamp = new Date(prop.eta).getTime();
    if (Date.now() < etaTimestamp) {
      throw new Error('TIMELOCK_STILL_LOCKED: Timelock delay period has not expired yet');
    }

    prop.status = 'EXECUTED';
    prop.executionTx = '0x' + createHash('sha256').update(proposalId + executor + Date.now()).digest('hex');

    UsdfAuditTrail.getInstance().append(
      executor,
      'TIMELOCK_OPERATION_EXECUTED',
      `Proposal ${proposalId} executed on-chain. Tx: ${prop.executionTx}`
    );

    return prop;
  }
}
