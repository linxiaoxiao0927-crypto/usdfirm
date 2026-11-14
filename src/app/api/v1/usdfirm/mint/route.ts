import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UsdfMintBurnEngine } from '@/lib/usdfirm/mint-burn-engine';

const MintSchema = z.object({
  partnerSite: z.enum(['xpayes.com', 'itisdeal.com', 'institutional_direct']),
  requesterPubkey: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid Ethereum address'),
  amountUsd: z.number().positive().max(50_000_000, 'Single mint cap is $50M'),
  xpayesRef: z.string().optional(),
  itisdealRef: z.string().optional(),
});

export async function GET() {
  const orders = UsdfMintBurnEngine.getInstance().getOrders();
  return NextResponse.json({ success: true, data: { orders } }, { status: 200 });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = MintSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid mint payload parameters',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const order = UsdfMintBurnEngine.getInstance().requestMint(parsed.data);
    return NextResponse.json({ success: true, data: { order } }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Mint processing error';
    const isComplianceOrRisk =
      message.includes('COMPLIANCE_BLOCKED') || message.includes('RISK_');
    return NextResponse.json(
      {
        success: false,
        error: { code: isComplianceOrRisk ? 'POLICY_REJECTED' : 'INTERNAL_ERROR', message },
      },
      { status: isComplianceOrRisk ? 422 : 500 }
    );
  }
}
