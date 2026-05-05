import { Module } from '@nestjs/common';
import { BlockedHeirsService } from './blocked_heirs.service';
import { BlockedHeirsController } from './blocked_heirs.controller';

@Module({
  controllers: [BlockedHeirsController],
  providers: [BlockedHeirsService],
})
export class BlockedHeirsModule {}
