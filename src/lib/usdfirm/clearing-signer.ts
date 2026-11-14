import { createHmac } from 'node:crypto';

export function signClearingEnvelopeServer(params: {
  caller: string;
  traceId: string;
  timestamp: string;
  idempotencyKey: string;
  rawBody: string;
  secret: string;
}): string {
  const canonical = `${params.caller}:${params.traceId}:${params.timestamp}:${params.idempotencyKey}:${params.rawBody}`;
  return (
    'sha256=' +
    createHmac('sha256', params.secret).update(canonical).digest('hex')
  );
}
