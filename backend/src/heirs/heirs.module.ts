import { Module } from '@nestjs/common';
import { HeirsService } from './heirs.service';
import { HeirsController } from './heirs.controller';

@Module({
  controllers: [HeirsController],
  providers: [HeirsService],
})
export class HeirsModule {}
