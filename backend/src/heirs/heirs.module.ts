import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit_logs/audit_logs.module';
import { HeirsService } from './heirs.service';
import { HeirsController } from './heirs.controller';

@Module({
  imports: [AuditLogsModule],
  controllers: [HeirsController],
  providers: [HeirsService],
})
export class HeirsModule {}
