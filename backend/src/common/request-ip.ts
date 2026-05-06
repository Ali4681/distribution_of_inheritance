import type { Request } from 'express';

export function getRequestIp(request: Request) {
  const forwardedFor = request.headers['x-forwarded-for'];

  if (typeof forwardedFor === 'string') {
    const firstIp = forwardedFor.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  if (Array.isArray(forwardedFor)) {
    const firstIp = forwardedFor[0]?.split(',')[0]?.trim();
    if (firstIp) {
      return firstIp;
    }
  }

  return request.ip ?? undefined;
}
