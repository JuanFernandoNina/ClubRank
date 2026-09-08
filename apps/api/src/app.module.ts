import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module.js';
import { AuthModule } from './auth/auth.module.js';
import { ClubesModule } from './clubes/clubes.module.js';
import { EventosModule } from './eventos/eventos.module.js';
import { EvaluacionesModule } from './evaluaciones/evaluaciones.module.js';
import { IncidentesModule } from './incidentes/incidentes.module.js';
import { PenalizacionesModule } from './penalizaciones/penalizaciones.module.js';
import { DirectorModule } from './director/director.module.js';
import { ReportesModule } from './reportes/reportes.module.js';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    PrismaModule,
    AuthModule,
    ClubesModule,
    EventosModule,
    EvaluacionesModule,
    IncidentesModule,
    PenalizacionesModule,
    DirectorModule,
    ReportesModule,
  ],
})
export class AppModule {}