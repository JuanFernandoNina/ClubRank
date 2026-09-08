import { Module } from '@nestjs/common';
import { PenalizacionesService } from './penalizaciones.service.js';
import { PenalizacionesController } from './penalizaciones.controller.js';

@Module({
  controllers: [PenalizacionesController],
  providers: [PenalizacionesService],
})
export class PenalizacionesModule {}