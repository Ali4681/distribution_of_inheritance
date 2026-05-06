import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit_logs/audit_logs.module';
import { CasesService } from './cases.service';
import { CasesController } from './cases.controller';

@Module({
  imports: [AuditLogsModule],
  controllers: [CasesController],
  providers: [CasesService],
})
export class CasesModule {}
