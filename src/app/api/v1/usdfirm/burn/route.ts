import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UsdfMintBurnEngine } from '@/lib/usdfirm/mint-burn-engine';

const BurnSchema = z.object({
  partnerSite: z.enum(['xpayes.com', 'itisdeal.com', 'institutional_direct']),
  requesterPubkey: z.string().regex(/^0x[a-fA-F0-9]{40}$/, 'Invalid address'),
  amountUsdf: z.number().positive(),
  burnAuthorizationSignature: z.string().min(10, 'Authorization signature required'),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = BurnSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid burn payload parameters',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const order = UsdfMintBurnEngine.getInstance().requestBurn(parsed.data);
    return NextResponse.json({ success: true, data: { order } }, { status: 200 });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Burn processing error';
    const isClientErr =
      message.includes('INSUFFICIENT_') || message.includes('COMPLIANCE_');
    return NextResponse.json(
      {
        success: false,
        error: { code: isClientErr ? 'REJECTED' : 'INTERNAL_ERROR', message },
      },
      { status: isClientErr ? 422 : 500 }
    );
  }
}
