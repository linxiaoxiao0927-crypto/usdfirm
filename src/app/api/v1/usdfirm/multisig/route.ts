import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UsdfMultiSigTimelock } from '@/lib/usdfirm/multisig-timelock';

const ActionSchema = z.discriminatedUnion('action', [
  z.object({
    action: z.literal('PROPOSE'),
    targetAction: z.string().min(4),
    proposer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
    delaySeconds: z.number().int().min(86400).max(2592000).default(86400),
  }),
  z.object({
    action: z.literal('CONFIRM'),
    proposalId: z.string(),
    signer: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  }),
  z.object({
    action: z.literal('EXECUTE'),
    proposalId: z.string(),
    executor: z.string().regex(/^0x[a-fA-F0-9]{40}$/),
  }),
]);

export async function GET() {
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
            message: 'Invalid multi-sig proposal action',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
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
    const message = err instanceof Error ? err.message : 'MultiSig operation error';
    return NextResponse.json(
      { success: false, error: { code: 'MULTISIG_REJECTED', message } },
      { status: 422 }
    );
  }
}
