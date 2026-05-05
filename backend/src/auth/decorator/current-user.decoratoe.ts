import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import type { AuthUser } from '../auth-user';
import type { AuthenticatedRequest } from '../auth-request';

export const currentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthUser => {
    const request = ctx.switchToHttp().getRequest<AuthenticatedRequest>();
    return request.user;
  },
);
