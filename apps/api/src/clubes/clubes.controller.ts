import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/guards.js';
import { ClubesService } from './clubes.service.js';
import { CrearClubDto, CrearMiembroDto } from '../dtos.js';

@Controller()
export class ClubesController {
  constructor(private readonly service: ClubesService) {}

  @Get('organizaciones/:orgId/clubes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listar(@Param('orgId') orgId: string) {
    return this.service.listar(orgId);
  }

  @Post('organizaciones/:orgId/clubes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  crear(@Param('orgId') orgId: string, @Body() dto: CrearClubDto) {
    return this.service.crear(orgId, dto);
  }

  @Patch('clubes/:clubId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  actualizar(@Param('clubId') clubId: string, @Body() dto: CrearClubDto) {
    return this.service.actualizar(clubId, dto);
  }

  @Delete('clubes/:clubId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  eliminar(@Param('clubId') clubId: string) {
    return this.service.eliminar(clubId);
  }

  // ---- Miembros ----

  @Get('clubes/:clubId/miembros')
  @UseGuards(AuthGuard('jwt'))
  listarMiembros(@Param('clubId') clubId: string) {
    return this.service.listarMiembros(clubId);
  }

  @Post('clubes/:clubId/miembros')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  crearMiembro(@Param('clubId') clubId: string, @Body() dto: CrearMiembroDto) {
    return this.service.crearMiembro(clubId, dto);
  }

  @Delete('miembros/:miembroId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  eliminarMiembro(@Param('miembroId') miembroId: string) {
    return this.service.eliminarMiembro(miembroId);
  }
}