import {
  Controller,
  Delete,
  Get,
  Param,
  Post,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import type { Request } from 'express';
import { AuthUser } from '../auth/auth-user';
import { getRequestIp } from '../common/request-ip';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { HeirsService } from './heirs.service';

@Controller('heirs')
@UseGuards(JwtAuthGuard)
export class HeirsController {
  constructor(private readonly heirsService: HeirsService) {}

  @Post('calculate/:caseId')
  calculate(
    @Param('caseId') caseId: string,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.heirsService.calculate(
      caseId,
      request.user,
      getRequestIp(request),
    );
  }

  @Get()
  findByCase(
    @Query('caseId') caseId: string,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.heirsService.findByCase(caseId, request.user);
  }

  @Get(':id')
  findOne(
    @Param('id') id: string,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.heirsService.findOne(id, request.user);
  }

  @Delete('case/:caseId')
  clearCase(
    @Param('caseId') caseId: string,
    @Req() request: Request & { user: AuthUser },
  ) {
    return this.heirsService.clearCase(
      caseId,
      request.user,
      getRequestIp(request),
    );
  }
}
