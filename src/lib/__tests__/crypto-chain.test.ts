import { describe, expect, it, beforeEach } from 'vitest';
import {
  resetLedgerStoreForTesting,
  getLedgerSnapshot,
  executeMintOrRedeem,
} from '@/lib/ledger-engine';
import {
  generateMerkleInclusionProof,
  verifyMerkleInclusionProof,
  getChainRollupStatus,
} from '@/lib/crypto-chain-engine';

describe('ASDCoin Real SHA-256 Merkle PoR & Rust Chain Bridge', () => {
  beforeEach(() => {
    resetLedgerStoreForTesting();
  });

  it('computes real 256-bit SHA-256 Merkle roots and verifies account inclusion proofs', () => {
    const snap = getLedgerSnapshot();
    const proof = generateMerkleInclusionProof(
      snap.accounts,
      'sofayes.com'
    );

    expect(proof.merkleRoot.startsWith('0x')).toBe(true);
    expect(proof.merkleRoot.length).toBe(66);
    expect(proof.leafHash.length).toBe(66);
    expect(proof.siblings.length).toBeGreaterThan(0);

    const isValid = verifyMerkleInclusionProof(
      proof.leafHash,
      proof.siblings,
      proof.merkleRoot
    );
    expect(isValid).toBe(true);

    // Tampering with the leaf hash must fail cryptographic verification
    const tamperedLeaf =
      proof.leafHash.slice(0, 65) +
      (proof.leafHash.endsWith('0') ? '1' : '0');
    expect(
      verifyMerkleInclusionProof(
        tamperedLeaf,
        proof.siblings,
        proof.merkleRoot
      )
    ).toBe(false);
  });

  it('produces real chained SHA-256 transaction hashes on ledger mutations', () => {
    const res1 = executeMintOrRedeem({
      action: 'MINT',
      ownerSite: 'sofayes.com',
      ownerEntity: 'ENT-SOFA-CORE',
      amountUsd: 10000,
      channel: 'XPAYES_VIBAN',
      idempotencyKey: 'idem-chain-hash-01',
    });

    expect(res1.entry.txHash.startsWith('0x')).toBe(true);
    expect(res1.entry.txHash.length).toBe(66);

    const chainStatus = getChainRollupStatus(res1.snapshot);
    expect(chainStatus.stateRootHex.length).toBe(66);
    expect(chainStatus.latestBlockHash.length).toBe(66);
    expect(chainStatus.u128InvariantOk).toBe(true);
  });
});
