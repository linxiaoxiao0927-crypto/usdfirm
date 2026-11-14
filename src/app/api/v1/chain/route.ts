import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLedgerSnapshot } from '@/lib/ledger-engine';
import {
  generateMerkleInclusionProof,
  getChainRollupStatus,
  type MerkleInclusionProof,
  type ChainRollupStatus,
} from '@/lib/crypto-chain-engine';

const MerkleVerifySchema = z.object({
  targetSite: z.string().min(3, '请输入有效的生态站点域名').max(64),
});

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
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
            message: 'Merkle 包含性证明查询参数无效',
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
    const message =
      err instanceof Error ? err.message : 'Merkle PoR 密码学引擎异常';
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: { code: 'INTERNAL_ERROR', message },
      },
      { status: 500 }
    );
  }
}
