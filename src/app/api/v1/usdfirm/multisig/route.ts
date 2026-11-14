import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UsdfMultiSigTimelock } from '@/lib/usdfirm/multisig-timelock';
import {
  USDFIRM_WORKER_URL,
  fetchWorkerState,
  isVitestOffline,
  mapWorkerSnapshotToBundle,
  type WorkerSnapshotResponse,
} from '@/lib/usdfirm/worker-client';

export const dynamic = 'force-dynamic';

const SignerIdSchema = z.string().regex(/^(0x[a-fA-F0-9]{40}|[A-Za-z0-9_-]{4,64})$/);

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('PROPOSE'),
    targetAction: z.string().min(4),
    proposer: SignerIdSchema,
    delaySeconds: z.number().int().min(86400).max(2592000).default(86400),
    amountUsd: z.number().positive().optional(),
  }),
  z.object({
    action: z.literal('CONFIRM'),
    proposalId: z.string().min(2),
    signer: SignerIdSchema,
  }),
  z.object({
    action: z.literal('EXECUTE'),
    proposalId: z.string().min(2),
    executor: SignerIdSchema,
  }),
]);

export async function GET() {
  if (!isVitestOffline()) {
    const live = await fetchWorkerState();
    if (!live.ok) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: live.errorCode,
            errorCode: live.errorCode,
            message: live.errorCode,
          },
        },
        { status: live.status }
      );
    }
    return NextResponse.json({
      success: true,
      data: {
        proposals: live.bundle.proposals,
        signers: live.bundle.signers,
        requiredConfirmations: live.bundle.requiredConfirmations,
      },
    });
  }

  const timelock = UsdfMultiSigTimelock.getInstance();
  return NextResponse.json({
    success: true,
    data: {
      proposals: timelock.getProposals(),
      signers: timelock.signers,
      requiredConfirmations: timelock.requiredConfirmations,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = ActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            errorCode: 'VALIDATION_ERROR',
            message: 'VALIDATION_ERROR',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    if (!isVitestOffline()) {
      let endpoint = '/api/multisig/approve';
      let workerBody: Record<string, unknown> = {};

      if (parsed.data.action === 'PROPOSE') {
        endpoint = '/api/mint';
        workerBody = {
          amountUsdf: Math.max(2_000_001, parsed.data.amountUsd ?? 2_500_000),
          counterparty: parsed.data.targetAction,
        };
      } else if (parsed.data.action === 'CONFIRM') {
        endpoint = '/api/multisig/approve';
        workerBody = {
          proposalId: parsed.data.proposalId,
          signer: parsed.data.signer,
        };
      } else {
        endpoint = '/api/multisig/execute';
        workerBody = {
          proposalId: parsed.data.proposalId,
        };
      }

      const workerRes = await fetch(`${USDFIRM_WORKER_URL}${endpoint}`, {
        method: 'POST',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(workerBody),
      });
      const workerJson = (await workerRes.json()) as WorkerSnapshotResponse & {
        proposalId?: string;
        status?: string;
        errorCode?: string;
      };

      if (!workerRes.ok || !workerJson.ok) {
        const errCode = workerJson.errorCode || 'MULTISIG_REJECTED';
        return NextResponse.json(
          {
            success: false,
            error: {
              code: errCode,
              errorCode: errCode,
              message: errCode,
            },
          },
          { status: workerRes.status || 422 }
        );
      }

      const bundle = mapWorkerSnapshotToBundle(workerJson);
      const updatedProp =
        bundle.proposals.find((p) => p.proposalId === workerJson.proposalId) ??
        bundle.proposals[0] ??
        null;

      return NextResponse.json(
        {
          success: true,
          data: {
            ...(updatedProp ?? {}),
            proposalId: workerJson.proposalId,
            bundle,
          },
        },
        { status: 200 }
      );
    }

    const timelock = UsdfMultiSigTimelock.getInstance();
    let result;

    if (parsed.data.action === 'PROPOSE') {
      result = timelock.proposeOperation(
        parsed.data.targetAction,
        parsed.data.proposer,
        parsed.data.delaySeconds
      );
    } else if (parsed.data.action === 'CONFIRM') {
      result = timelock.confirmProposal(parsed.data.proposalId, parsed.data.signer);
    } else {
      result = timelock.executeProposal(parsed.data.proposalId, parsed.data.executor);
    }

    return NextResponse.json({ success: true, data: result }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'MULTISIG_REJECTED';
    return NextResponse.json(
      {
        success: false,
        error: {
          code: 'MULTISIG_REJECTED',
          errorCode: 'MULTISIG_REJECTED',
          message,
        },
      },
      { status: 422 }
    );
  }
}
