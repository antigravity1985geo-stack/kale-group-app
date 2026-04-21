import crypto from 'node:crypto';

const TTL_MS = 24 * 60 * 60 * 1000;

function getSecret(): string {
  const s = process.env.ORDER_STATUS_TOKEN_SECRET;
  if (!s || s.length < 32) {
    throw new Error(
      'ORDER_STATUS_TOKEN_SECRET must be set and at least 32 chars. ' +
      'Generate with: openssl rand -base64 48'
    );
  }
  return s;
}

export function signOrderStatusToken(orderId: string): string {
  const exp = Date.now() + TTL_MS;
  const payload = `${orderId}.${exp}`;
  const sig = crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
  return `${exp}.${sig}`;
}

export function verifyOrderStatusToken(orderId: string, token: string): boolean {
  if (!token || typeof token !== 'string') return false;

  const dotIdx = token.indexOf('.');
  if (dotIdx === -1) return false;
  const expStr = token.slice(0, dotIdx);
  const sig = token.slice(dotIdx + 1);

  const exp = Number(expStr);
  if (!Number.isFinite(exp) || Date.now() > exp) return false;

  const expected = crypto
    .createHmac('sha256', getSecret())
    .update(`${orderId}.${exp}`)
    .digest('base64url');

  const sigBuf = Buffer.from(sig);
  const expBuf = Buffer.from(expected);
  if (sigBuf.length !== expBuf.length) return false;

  return crypto.timingSafeEqual(sigBuf, expBuf);
}
