import { Module } from '@nestjs/common';
import { ClubesService } from './clubes.service.js';
import { ClubesController } from './clubes.controller.js';

@Module({
  controllers: [ClubesController],
  providers: [ClubesService],
  exports: [ClubesService],
})
export class ClubesModule {}