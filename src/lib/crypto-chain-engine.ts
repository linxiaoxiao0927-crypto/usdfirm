import { createHash } from 'node:crypto';
import type {
  LedgerAccountRecord,
  LedgerSnapshot,
} from '@/types/ledger';

export interface MerkleProofSibling {
  position: 'LEFT' | 'RIGHT';
  hash: string;
}

export interface MerkleInclusionProof {
  targetSite: string;
  accountId: string;
  leafPayload: string;
  leafHash: string;
  siblings: MerkleProofSibling[];
  merkleRoot: string;
  verified: boolean;
}

export interface ChainRollupStatus {
  slotHeight: number;
  stateRootHex: string;
  latestBlockHash: string;
  u128InvariantOk: boolean;
  rustWorkspacePath: string;
  solanaProgramPath: string;
  executionEngineMode: 'RUST_NATIVE_WASM' | 'OPENSSL_SHA256_U128_FALLBACK';
}

export function sha256Hex(payload: string): string {
  const digest = createHash('sha256').update(payload, 'utf8').digest('hex');
  return `0x${digest}`;
}

function hashPairHex(leftHex: string, rightHex: string): string {
  const cleanLeft = leftHex.replace(/^0x/, '');
  const cleanRight = rightHex.replace(/^0x/, '');
  const combined = Buffer.concat([
    Buffer.from(cleanLeft, 'hex'),
    Buffer.from(cleanRight, 'hex'),
  ]);
  return `0x${createHash('sha256').update(combined).digest('hex')}`;
}

export function formatAccountLeafPayload(acc: LedgerAccountRecord): string {
  const stableMicro = (BigInt(Math.round(acc.asdStableBal * 100)) * 10000n).toString();
  const gasUnits = BigInt(Math.round(acc.asdGasBal)).toString();
  return `${acc.id}:${acc.ownerSite}:${stableMicro}:${gasUnits}:${acc.version}`;
}

export function computeChainedTxHash(
  prevTxHash: string,
  idempotencyKey: string,
  debitAccId: string,
  creditAccId: string,
  amount: number
): string {
  return sha256Hex(
    `${prevTxHash}|${idempotencyKey}|${debitAccId}|${creditAccId}|${amount}`
  );
}

export function generateMerkleInclusionProof(
  accounts: LedgerAccountRecord[],
  targetSite: string
): MerkleInclusionProof {
  if (accounts.length === 0) {
    throw new Error('MERKLE_EMPTY_ACCOUNTS: 账本账户列表为空');
  }

  let targetIdx = accounts.findIndex((a) => a.ownerSite === targetSite);
  if (targetIdx === -1) targetIdx = 0;

  const targetAcc = accounts[targetIdx];
  const leafPayload = formatAccountLeafPayload(targetAcc);
  const leaves = accounts.map((a) => sha256Hex(formatAccountLeafPayload(a)));
  const leafHash = leaves[targetIdx];

  const siblings: MerkleProofSibling[] = [];
  let currentLayer = [...leaves];
  let idx = targetIdx;

  while (currentLayer.length > 1) {
    const nextLayer: string[] = [];
    for (let i = 0; i < currentLayer.length; i += 2) {
      const left = currentLayer[i];
      const right = i + 1 < currentLayer.length ? currentLayer[i + 1] : left;

      if (i === idx || i + 1 === idx) {
        if (idx % 2 === 0) {
          siblings.push({ position: 'RIGHT', hash: right });
        } else {
          siblings.push({ position: 'LEFT', hash: left });
        }
        idx = Math.floor(i / 2);
      }

      nextLayer.push(hashPairHex(left, right));
    }
    currentLayer = nextLayer;
  }

  const merkleRoot = currentLayer[0];
  const verified = verifyMerkleInclusionProof(leafHash, siblings, merkleRoot);

  return {
    targetSite: targetAcc.ownerSite,
    accountId: targetAcc.id,
    leafPayload,
    leafHash,
    siblings,
    merkleRoot,
    verified,
  };
}

export function verifyMerkleInclusionProof(
  leafHash: string,
  siblings: MerkleProofSibling[],
  expectedRoot: string
): boolean {
  let computed = leafHash;
  for (const sib of siblings) {
    if (sib.position === 'LEFT') {
      computed = hashPairHex(sib.hash, computed);
    } else {
      computed = hashPairHex(computed, sib.hash);
    }
  }
  return computed.toLowerCase() === expectedRoot.toLowerCase();
}

export function getChainRollupStatus(
  snapshot: LedgerSnapshot
): ChainRollupStatus {
  const proof = generateMerkleInclusionProof(
    snapshot.accounts,
    'sofayes.com'
  );
  const topTxHash =
    snapshot.recentEntries[0]?.txHash ??
    sha256Hex('GENESIS_USDFIRM_BLOCK_0');
  const slotHeight = 18_420_000 + snapshot.recentEntries.length;
  const latestBlockHash = sha256Hex(
    `${proof.merkleRoot}|${topTxHash}|${slotHeight}`
  );

  // Verify u128 BigInt fixed-point invariant across accounts
  const reserveAcc = snapshot.accounts.find(
    (a) => a.accountType === 'ASSET_RESERVE'
  );
  const nonReserve = snapshot.accounts.filter(
    (a) => a.accountType !== 'ASSET_RESERVE'
  );
  const sumStableMicro = nonReserve.reduce(
    (acc, a) => acc + BigInt(Math.round(a.asdStableBal * 1_000_000)),
    0n
  );
  const reserveStableMicro = reserveAcc
    ? BigInt(Math.round(reserveAcc.asdStableBal * 1_000_000))
    : 0n;

  return {
    slotHeight,
    stateRootHex: proof.merkleRoot,
    latestBlockHash,
    u128InvariantOk: sumStableMicro === reserveStableMicro,
    rustWorkspacePath: 'rust-core/src/lib.rs',
    solanaProgramPath: 'programs/usdfirm_escrow/src/lib.rs',
    executionEngineMode: 'OPENSSL_SHA256_U128_FALLBACK',
  };
}
