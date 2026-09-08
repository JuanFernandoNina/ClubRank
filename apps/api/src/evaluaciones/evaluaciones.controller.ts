import {
  Controller,
  Post,
  Get,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { EvaluacionesService } from './evaluaciones.service.js';
import { GuardarEvaluacionDto } from './evaluaciones.dtos.js';

@Controller('staff')
export class EvaluacionesStaffController {
  constructor(private readonly service: EvaluacionesService) {}

  /** RF-16: eventos con clubes asignados al staff autenticado */
  @Get('eventos')
  @UseGuards(AuthGuard('jwt'))
  misEventos(@Request() req: { user: { id: string } }) {
    return this.service.misEventos(req.user.id);
  }
}

@Controller('eventos/:id')
export class EvaluacionesController {
  constructor(private readonly service: EvaluacionesService) {}

  @Get('clubes')
  @UseGuards(AuthGuard('jwt'))
  clubes(
    @Param('id') id: string,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.clubesAsignados(id, req.user.id);
  }

  @Post('evaluaciones')
  @UseGuards(AuthGuard('jwt'))
  guardar(
    @Param('id') id: string,
    @Body() dto: GuardarEvaluacionDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.guardar(id, dto, req.user.id);
  }
}