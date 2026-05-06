import {
  Controller,
  Get,
  Param,
  Post,
  Query,
  Req,
  Res,
  UseGuards,
} from '@nestjs/common';
import { Language } from '@prisma/client';
import type { Request, Response } from 'express';
import { AuthUser } from '../auth/auth-user';
import { getRequestIp } from '../common/request-ip';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { ReportsService } from './reports.service';

@Controller('reports')
@UseGuards(JwtAuthGuard)
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get()
  findAll(
    @Req() request: Request & { user: AuthUser },
    @Query('caseId') caseId?: string,
  ) {
    return this.reportsService.findAll(request.user, caseId);
  }

  @Post('cases/:caseId/pdf')
  async generatePdf(
    @Param('caseId') caseId: string,
    @Query('language') language: Language = Language.AR,
    @Req() request: Request & { user: AuthUser },
    @Res() response: Response,
  ) {
    const result = await this.reportsService.generatePdf(
      caseId,
      request.user,
      language,
      getRequestIp(request),
    );

    response.setHeader('Content-Type', 'application/pdf');
    response.setHeader(
      'Content-Disposition',
      `attachment; filename="inheritance-report.pdf"; filename*=UTF-8''${encodeURIComponent(result.filename)}`,
    );
    response.send(result.buffer);
  }
}
