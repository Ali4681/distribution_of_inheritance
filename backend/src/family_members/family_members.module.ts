import { Module } from '@nestjs/common';
import { FamilyMembersService } from './family_members.service';
import { FamilyMembersController } from './family_members.controller';

@Module({
  controllers: [FamilyMembersController],
  providers: [FamilyMembersService],
})
export class FamilyMembersModule {}
