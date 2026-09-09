import { Module } from '@nestjs/common';
import { ClubesService } from './clubes.service.js';
import { ClubesController } from './clubes.controller.js';
import { ClubesImportService } from './clubes-import.service.js';

@Module({
  controllers: [ClubesController],
  providers: [ClubesService, ClubesImportService],
  exports: [ClubesService],
})
export class ClubesModule {}