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

export type ApiResponse<T> = {
  success: boolean;
  data?: T;
  error?: { code: string; message: string; details?: unknown };
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
              message: '创建四流合一托管单参数校验失败',
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
            message: '四流合一清算凭证校验失败',
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
    const message =
      err instanceof Error ? err.message : '四流合一分润引擎异常';
    const isBusinessErr =
      message.includes('IDEMPOTENCY_CONFLICT') ||
      message.includes('ESCROW_') ||
      message.includes('INSUFFICIENT_');
    return NextResponse.json<ApiResponse<never>>(
      {
        success: false,
        error: {
          code: isBusinessErr ? 'ESCROW_REJECTED' : 'INTERNAL_ERROR',
          message,
        },
      },
      { status: isBusinessErr ? 422 : 500 }
    );
  }
}
