import { Controller, Get, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth-user';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { BlockedHeirsService } from './blocked_heirs.service';

@Controller('blocked-heirs')
@UseGuards(JwtAuthGuard)
export class BlockedHeirsController {
  constructor(private readonly blockedHeirsService: BlockedHeirsService) {}

  @Get()
  findAll(
    @Req() request: Request & { user: AuthUser },
    @Query('caseId') caseId?: string,
  ) {
    if (caseId) {
      return this.blockedHeirsService.findByCase(caseId, request.user);
    }

    return this.blockedHeirsService.findAll(request.user);
  }
}
