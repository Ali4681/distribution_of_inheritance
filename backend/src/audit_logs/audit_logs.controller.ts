import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import { Role } from '@prisma/client';
import { Roles } from '../auth/decorator/roles.decorator';
import { JwtAuthGuard } from '../auth/guard/jwt.guard';
import { RolesGuard } from '../auth/guard/roles.guard';
import { ListAuditLogsQueryDto } from './dto/list-audit-logs-query.dto';
import { AuditLogsService } from './audit_logs.service';

@Controller('audit-logs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles(Role.ADMIN)
export class AuditLogsController {
  constructor(private readonly auditLogsService: AuditLogsService) {}

  @Get()
  findAll(@Query() query: ListAuditLogsQueryDto) {
    return this.auditLogsService.findAll(query);
  }
}
