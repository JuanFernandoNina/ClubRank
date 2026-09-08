import { Module } from '@nestjs/common';
import { IncidentesService } from './incidentes.service.js';
import { IncidentesController } from './incidentes.controller.js';

@Module({
  controllers: [IncidentesController],
  providers: [IncidentesService],
})
export class IncidentesModule {}