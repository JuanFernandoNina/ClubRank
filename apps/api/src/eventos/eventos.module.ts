import { Module } from '@nestjs/common';
import { EventosService } from './eventos.service.js';
import { EventosController } from './eventos.controller.js';
import { AuthModule } from '../auth/auth.module.js';

@Module({
  imports: [AuthModule],
  controllers: [EventosController],
  providers: [EventosService],
  exports: [EventosService],
})
export class EventosModule {}