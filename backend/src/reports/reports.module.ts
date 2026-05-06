import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit_logs/audit_logs.module';
import { ReportsService } from './reports.service';
import { ReportsController } from './reports.controller';

@Module({
  imports: [AuditLogsModule],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
