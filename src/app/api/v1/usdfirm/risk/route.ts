import { NextResponse } from 'next/server';
import { z } from 'zod';
import { UsdfRiskMonitor } from '@/lib/usdfirm/risk-monitor';
import { UsdfAuditTrail } from '@/lib/usdfirm/audit-trail';

export const dynamic = 'force-dynamic';

const RiskActionSchema = z.object({
  action: z.enum(['PAUSE', 'RESUME', 'SIMULATE_DEPEG']),
  actor: z.string().min(2),
  reason: z.string().min(4),
  targetPeg: z.number().optional(),
});

export async function GET() {
  const riskMonitor = UsdfRiskMonitor.getInstance();
  const telemetry = riskMonitor.getTelemetry();
  const recentLogs = UsdfAuditTrail.getInstance().getRecentLogs(15);

  return NextResponse.json({
    success: true,
    data: {
      telemetry,
      recentLogs,
    },
  });
}

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const parsed = RiskActionSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        {
          success: false,
          error: {
            code: 'VALIDATION_ERROR',
            message: 'Invalid risk action payload',
            details: parsed.error.flatten().fieldErrors,
          },
        },
        { status: 400 }
      );
    }

    const riskMonitor = UsdfRiskMonitor.getInstance();
    if (parsed.data.action === 'PAUSE') {
      riskMonitor.setCircuitBreaker(true, parsed.data.reason, parsed.data.actor);
    } else if (parsed.data.action === 'RESUME') {
      riskMonitor.setCircuitBreaker(false, parsed.data.reason, parsed.data.actor);
      riskMonitor.resetPeg();
    } else if (parsed.data.action === 'SIMULATE_DEPEG' && parsed.data.targetPeg) {
      riskMonitor.simulateDepegTest(parsed.data.targetPeg);
    }

    return NextResponse.json({
      success: true,
      data: {
        telemetry: riskMonitor.getTelemetry(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Risk telemetry operation error';
    return NextResponse.json(
      { success: false, error: { code: 'RISK_OP_ERROR', message } },
      { status: 500 }
    );
  }
}
