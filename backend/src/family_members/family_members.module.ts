import { Module } from '@nestjs/common';
import { AuditLogsModule } from '../audit_logs/audit_logs.module';
import { FamilyMembersService } from './family_members.service';
import { FamilyMembersController } from './family_members.controller';

@Module({
  imports: [AuditLogsModule],
  controllers: [FamilyMembersController],
  providers: [FamilyMembersService],
})
export class FamilyMembersModule {}
