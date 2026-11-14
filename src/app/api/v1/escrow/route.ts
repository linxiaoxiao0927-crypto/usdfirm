import { NextResponse } from 'next/server';
import {
  EscrowCreateSchema,
  EscrowSettleSchema,
} from '@/lib/schemas/ledger-schemas';
import {
  executeEscrowCreate,
  executeEscrowSettlement,
} from '@/lib/ledger-engine';
import type {
  FourFlowEscrowRecord,
  LedgerEntryRecord,
  LedgerSnapshot,
} from '@/types/ledger';

export const dynamic = 'force-dynamic';

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; errorCode?: string; message: string; details?: unknown };
};

export async function POST(request: Request) {
  try {
    const body = await request.json();

    if (body && body.action === 'CREATE') {
      const parsedCreate = EscrowCreateSchema.safeParse(body);
      if (!parsedCreate.success) {
        return NextResponse.json<ApiResponse<never>>(
          {
            success: false,
            error: {
              code: 'VALIDATION_ERROR',
              errorCode: 'ERR_VALIDATION_FAILED',
              message: 'ERR_VALIDATION_FAILED',
              details: parsedCreate.error.flatten().fieldErrors,
            },
          },
          { status: 400 }
        );
      }
      const created = executeEscrowCreate(parsedCreate.data);
      return NextResponse.json<
        ApiResponse<{
          escrow: FourFlowEscrowRecord;
          splitEntries: LedgerEntryRecord[];
          snapshot: LedgerSnapshot;
        }>
      >(
        {
          success: true,
          data: {
            escrow: created.escrow,
            splitEntries: [],
            snapshot: created.snapshot,
          },
        },
        { status: 200 }
      );
    }

    const parsedSettle = EscrowSettleSchema.safeParse(body);
    if (!parsedSettle.success) {
      return NextResponse.json<ApiResponse<never>>(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            errorCode: 'ERR_VALIDATION_FAILED',
            message: 'ERR_VALIDATION_FAILED',
            details: parsedSettle.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const result = executeEscrowSettlement(parsedSettle.data);
    return NextResponse.json<
      ApiResponse<{
        escrow: FourFlowEscrowRecord;
        splitEntries: LedgerEntryRecord[];
        snapshot: LedgerSnapshot;
      }>
    >({ success: true, data: result }, { status: 200 });
  } catch (err) {
    console.error('[API_ERROR]', err);
    const rawMsg = err instanceof Error ? err.message : '';
    const errCode = rawMsg.includes('IDEMPOTENCY_CONFLICT')
      ? 'ERR_IDEMPOTENCY_CONFLICT'
      : rawMsg.includes('ESCROW_DUPLICATE')
        ? 'ERR_ESCROW_DUPLICATE'
        : rawMsg.includes('ESCROW_NOT_FOUND')
          ? 'ERR_ESCROW_NOT_FOUND'
          : rawMsg.includes('ESCROW_ALREADY_SETTLED')
            ? 'ERR_ESCROW_ALREADY_SETTLED'
            : rawMsg.includes('INSUFFICIENT_')
              ? 'ERR_INSUFFICIENT_USDF_BALANCE'
              : 'ERR_INTERNAL_SERVER';
    const isBusinessErr = errCode !== 'ERR_INTERNAL_SERVER';
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: isBusinessErr ? 'ESCROW_REJECTED' : 'INTERNAL_ERROR',
          errorCode: errCode,
          message: errCode,
        },
      },
      { status: isBusinessErr ? 422 : 500 }
    );
  }
}
