import { Controller, Get, Patch, Param, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/guards.js';
import { ReportesService } from './reportes.service.js';

@Controller()
export class ReportesController {
  constructor(private readonly service: ReportesService) {}

  @Get('eventos/:id/actividad-staff')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  actividadStaff(@Param('id') id: string) {
    return this.service.actividadStaff(id);
  }

  @Get('notificaciones')
  @UseGuards(AuthGuard('jwt'))
  notificaciones(@Request() req: { user: { id: string } }) {
    return this.service.misNotificaciones(req.user.id);
  }

  @Patch('notificaciones/leer')
  @UseGuards(AuthGuard('jwt'))
  marcarLeidas(@Request() req: { user: { id: string } }) {
    return this.service.marcarLeidas(req.user.id);
  }

  @Get('auditoria')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  auditoria(@Request() req: { user: { organizacionId: string | null } }) {
    return this.service.auditoria(req.user.organizacionId);
  }
}