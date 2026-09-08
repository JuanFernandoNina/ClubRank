import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  Request,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/guards.js';
import { EventosService } from './eventos.service.js';
import {
  CrearEventoDto,
  CrearCriterioDto,
  AsignarClubesDto,
  DesignarPrincipalDto,
  GenerarAccesoDto,
} from '../dtos.js';

@Controller()
export class EventosController {
  constructor(private readonly service: EventosService) {}

  @Get('organizaciones/:orgId/eventos')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listar(@Param('orgId') orgId: string) {
    return this.service.listar(orgId);
  }

  @Post('organizaciones/:orgId/eventos')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  crear(@Param('orgId') orgId: string, @Body() dto: CrearEventoDto) {
    return this.service.crear(orgId, dto);
  }

  @Get('eventos/:id')
  @UseGuards(AuthGuard('jwt'))
  detalle(@Param('id') id: string, @Request() req: { user: { organizacionId: string | null } }) {
    return this.service.detalle(id, req.user.organizacionId);
  }

  @Delete('eventos/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  eliminar(@Param('id') id: string, @Request() req: { user: { organizacionId: string | null } }) {
    return this.service.eliminar(id, req.user.organizacionId);
  }

  // Criterios
  @Post('eventos/:id/criterios')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  crearCriterio(
    @Param('id') id: string,
    @Request() req: { user: { organizacionId: string | null } },
    @Body() dto: CrearCriterioDto,
  ) {
    return this.service.crearCriterio(id, req.user.organizacionId, dto);
  }

  @Delete('criterios/:criterioId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  eliminarCriterio(
    @Param('criterioId') criterioId: string,
    @Request() req: { user: { organizacionId: string | null } },
  ) {
    return this.service.eliminarCriterio(criterioId, req.user.organizacionId);
  }

  // Clubes participantes + staff principal
  @Post('eventos/:id/clubes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  asignarClubes(
    @Param('id') id: string,
    @Request() req: { user: { organizacionId: string | null } },
    @Body() dto: AsignarClubesDto,
  ) {
    return this.service.asignarClubes(id, req.user.organizacionId, dto);
  }

  @Patch('eventos/:id/clubes/:clubId/principal')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  designarPrincipal(
    @Param('id') id: string,
    @Param('clubId') clubId: string,
    @Request() req: { user: { organizacionId: string | null } },
    @Body() dto: DesignarPrincipalDto,
  ) {
    return this.service.designarPrincipal(id, clubId, req.user.organizacionId, dto);
  }

  // Generación masiva de accesos
  @Post('eventos/:id/generar-accesos')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  generarAccesos(
    @Param('id') id: string,
    @Request() req: { user: { organizacionId: string | null } },
    @Body() dto: GenerarAccesoDto[] | GenerarAccesoDto,
  ) {
    return this.service.generarAccesos(id, req.user.organizacionId, dto);
  }

  // Cierre y pendientes
  @Get('eventos/:id/pendientes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  pendientes(
    @Param('id') id: string,
    @Request() req: { user: { organizacionId: string | null } },
  ) {
    return this.service.pendientes(id, req.user.organizacionId);
  }

  @Post('eventos/:id/cerrar')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  cerrar(
    @Param('id') id: string,
    @Request() req: { user: { organizacionId: string | null } },
  ) {
    return this.service.cerrar(id, req.user.organizacionId);
  }

  @Post('eventos/:id/reabrir')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  reabrir(
    @Param('id') id: string,
    @Request() req: { user: { organizacionId: string | null; id: string } },
  ) {
    return this.service.reabrir(id, req.user.organizacionId, req.user.id);
  }

  // Rankings
  @Get('eventos/:id/ranking')
  @UseGuards(AuthGuard('jwt'))
  rankingEvento(
    @Param('id') id: string,
    @Request() req: { user: { organizacionId: string | null } },
  ) {
    return this.service.rankingEvento(id, req.user.organizacionId);
  }

  @Get('organizaciones/:orgId/temporadas/:temporada/ranking')
  @UseGuards(AuthGuard('jwt'))
  rankingTemporada(
    @Param('orgId') orgId: string,
    @Param('temporada') temporada: string,
    @Request() req: { user: { organizacionId: string | null } },
  ) {
    if (req.user.organizacionId !== orgId) {
      return Promise.reject(
        Object.assign(new Error('No tienes acceso a esta organización'), { status: 403 }),
      );
    }
    return this.service.rankingTemporada(temporada, req.user.organizacionId);
  }
}