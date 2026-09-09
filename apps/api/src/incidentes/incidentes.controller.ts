import {
  Controller,
  Post,
  Get,
  Patch,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/guards.js';
import { IncidentesService } from './incidentes.service.js';
import { ReportarIncidenteDto, ActualizarIncidenteDto } from './incidentes.dtos.js';

@Controller()
export class IncidentesController {
  constructor(private readonly service: IncidentesService) {}

  @Post('eventos/:id/incidentes')
  @UseGuards(AuthGuard('jwt'))
  reportar(
    @Param('id') id: string,
    @Body() dto: ReportarIncidenteDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.reportar(id, dto, req.user.id);
  }

  @Get('eventos/:id/incidentes')
  @UseGuards(AuthGuard('jwt'))
  listarDeEvento(@Param('id') id: string) {
    return this.service.listarDeEvento(id);
  }

  @Get('organizaciones/:orgId/incidentes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listar(
    @Param('orgId') orgId: string,
    @Query() query: { evento?: string; club?: string; estado?: string; gravedad?: string },
  ) {
    return this.service.listar(orgId, query);
  }

  @Patch('incidentes/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  cambiarEstado(@Param('id') id: string, @Body() dto: ActualizarIncidenteDto) {
    return this.service.cambiarEstado(id, dto);
  }
}