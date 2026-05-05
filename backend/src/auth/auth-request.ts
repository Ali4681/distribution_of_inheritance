import type { Request } from 'express';
import type { AuthUser } from './auth-user';

export type AuthRequest = Request & {
  user?: AuthUser;
};

export type AuthenticatedRequest = Request & {
  user: AuthUser;
};
