import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLedgerSnapshot } from '@/lib/ledger-engine';
import {
  generateMerkleInclusionProof,
  getChainRollupStatus,
  type MerkleInclusionProof,
  type ChainRollupStatus,
} from '@/lib/crypto-chain-engine';

export const dynamic = 'force-dynamic';

const MerkleVerifySchema = z.object({
  targetSite: z.string().min(3).max(64),
});

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; errorCode?: string; message: string; details?: unknown };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = MerkleVerifySchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            errorCode: 'ERR_VALIDATION_FAILED',
            message: 'ERR_VALIDATION_FAILED',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const snapshot = getLedgerSnapshot();
    const proof = generateMerkleInclusionProof(
      snapshot.accounts,
      parsed.data.targetSite
    );
    const chainStatus = getChainRollupStatus(snapshot);

    return NextResponse.json<
      ApiResponse<{
        proof: MerkleInclusionProof;
        chainStatus: ChainRollupStatus;
      }>
    >({ success: true, data: { proof, chainStatus } }, { status: 200 });
  } catch (err) {
    console.error('[API_ERROR]', err);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          errorCode: 'ERR_MERKLE_ENGINE',
          message: 'ERR_MERKLE_ENGINE',
        },
      },
      { status: 500 }
    );
  }
}
