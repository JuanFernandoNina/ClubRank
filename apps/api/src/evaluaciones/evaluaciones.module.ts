import { Module } from '@nestjs/common';
import { EvaluacionesService } from './evaluaciones.service.js';
import { EvaluacionesController, EvaluacionesStaffController } from './evaluaciones.controller.js';

@Module({
  controllers: [EvaluacionesController, EvaluacionesStaffController],
  providers: [EvaluacionesService],
})
export class EvaluacionesModule {}