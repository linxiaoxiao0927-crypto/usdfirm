import { NextResponse } from 'next/server';
import { z } from 'zod';
import { getLedgerSnapshot } from '@/lib/ledger-engine';
import {
  SHINEMIGHT_SDK_CREDENTIALS,
  generateTrialBalanceAudit,
  computeSiteHmacSignature,
  type SiteSdkCredential,
  type TrialBalanceAuditReport,
} from '@/lib/developer-audit';

export const dynamic = 'force-dynamic';

const SignPayloadSchema = z.object({
  sourceSite: z.string().min(3).max(64),
  targetSite: z.string().min(3).max(64),
  eventType: z.enum([
    'SKILL_STREAM_SETTLE',
    'CROSS_MALL_ORDER_LOCK',
    'TAX_ROUTE_REBATE',
    'COMPUTE_LEASE_PAYOUT',
  ]),
  amountAsdS: z.number().positive().max(1_000_000),
  idempotencyKey: z.string().min(6).max(128),
});

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; errorCode?: string; message: string; details?: unknown };
};

export async function GET(_request: Request) {
  try {
    const snapshot = getLedgerSnapshot();
    const trialBalance = generateTrialBalanceAudit(snapshot);
    return NextResponse.json<
      ApiResponse<{
        trialBalance: TrialBalanceAuditReport;
        sdkCredentials: SiteSdkCredential[];
      }>
    >(
      {
        success: true,
        data: {
          trialBalance,
          sdkCredentials: SHINEMIGHT_SDK_CREDENTIALS,
        },
      },
      { status: 200 }
    );
  } catch (err) {
    console.error('[API_ERROR]', err);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          errorCode: 'ERR_LEDGER_AUDIT_FETCH',
          message: 'ERR_LEDGER_AUDIT_FETCH',
        },
      },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = SignPayloadSchema.safeParse(body);
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

    const signed = computeSiteHmacSignature(parsed.data);
    return NextResponse.json<
      ApiResponse<{
        hmacSignature: string;
        canonicalString: string;
        curlSnippet: string;
      }>
    >({ success: true, data: signed }, { status: 200 });
  } catch (err) {
    console.error('[API_ERROR]', err);
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: 'INTERNAL_ERROR',
          errorCode: 'ERR_HMAC_SIGN_FAILED',
          message: 'ERR_HMAC_SIGN_FAILED',
        },
      },
      { status: 500 }
    );
  }
}
