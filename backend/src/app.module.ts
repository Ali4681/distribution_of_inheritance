import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { BlockedHeirsModule } from './blocked_heirs/blocked_heirs.module';
import { CasesModule } from './cases/cases.module';
import { FamilyMembersModule } from './family_members/family_members.module';
import { HeirsModule } from './heirs/heirs.module';
import { PrismaModule } from './prisma/prisma.module';
import { ReportsModule } from './reports/reports.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    PrismaModule,
    AuthModule,
    UsersModule,
    CasesModule,
    FamilyMembersModule,
    HeirsModule,
    BlockedHeirsModule,
    ReportsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
