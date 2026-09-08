import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/guards.js';
import { PenalizacionesService } from './penalizaciones.service.js';
import { CrearMotivoDto, AplicarPenalizacionDto } from './penalizaciones.dtos.js';

@Controller()
export class PenalizacionesController {
  constructor(private readonly service: PenalizacionesService) {}

  // Motivos (catálogo de la organización)
  @Get('organizaciones/:orgId/motivos-penalizacion')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listarMotivos(@Param('orgId') orgId: string) {
    return this.service.listarMotivos(orgId);
  }

  @Post('organizaciones/:orgId/motivos-penalizacion')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  crearMotivo(@Param('orgId') orgId: string, @Body() dto: CrearMotivoDto) {
    return this.service.crearMotivo(orgId, dto);
  }

  @Patch('motivos-penalizacion/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  actualizarMotivo(@Param('id') id: string, @Body() dto: CrearMotivoDto) {
    return this.service.actualizarMotivo(id, dto);
  }

  @Delete('motivos-penalizacion/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  desactivarMotivo(@Param('id') id: string) {
    return this.service.desactivarMotivo(id);
  }

  // Aplicar (solo Staff del evento)
  @Post('eventos/:id/clubes/:clubId/penalizaciones')
  @UseGuards(AuthGuard('jwt'))
  aplicar(
    @Param('id') id: string,
    @Param('clubId') clubId: string,
    @Body() dto: AplicarPenalizacionDto,
    @Request() req: { user: { id: string } },
  ) {
    return this.service.aplicar(
      id,
      { ...dto, clubId },
      req.user.id,
    );
  }

  // Anular (solo Admin)
  @Delete('penalizaciones/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  anular(@Param('id') id: string, @Request() req: { user: { id: string } }) {
    return this.service.anular(id, req.user.id);
  }

  // Reporte (Admin)
  @Get('organizaciones/:orgId/penalizaciones')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  reporte(
    @Param('orgId') orgId: string,
    @Query() query: { evento?: string; club?: string; staff?: string; motivo?: string },
  ) {
    return this.service.reporte(orgId, query);
  }
}