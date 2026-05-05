import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import type { AuthUser } from '../auth-user';
import type { AuthRequest } from '../auth-request';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<AuthRequest>();
    const authHeader = request.headers.authorization;

    if (!authHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException();
    }

    const token = authHeader.slice('Bearer '.length);

    try {
      request.user = await this.jwtService.verifyAsync<AuthUser>(token, {
        secret: process.env.JWT_SECRET ?? 'ali',
      });
    } catch {
      throw new UnauthorizedException();
    }

    return true;
  }
}
