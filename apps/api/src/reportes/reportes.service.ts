import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class ReportesService {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-44: actividad de staff por evento */
  async actividadStaff(eventoId: string) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      include: {
        clubes: {
          include: {
            club: true,
            principal: true,
            evaluaciones: { select: { usuarioId: true, updatedAt: true, comentario: true } },
          },
        },
      },
    });
    if (!evento) throw new Error('Evento no encontrado');

    return evento.clubes.map((ec) => ({
      clubId: ec.clubId,
      club: ec.club.nombre,
      staffPrincipal: ec.principal
        ? { id: ec.principal.id, nombre: ec.principal.nombre }
        : null,
      evaluado: ec.principal
        ? ec.evaluaciones.some((ev) => ev.usuarioId === ec.principal!.id)
        : false,
      ultimaEvaluacion: ec.principal
        ? ec.evaluaciones.find((ev) => ev.usuarioId === ec.principal!.id)?.updatedAt ?? null
        : null,
    }));
  }

  /** RF-27/31: notificaciones in-app del usuario + marcar leídas */
  async misNotificaciones(usuarioId: string) {
    return this.prisma.notificacion.findMany({
      where: { usuarioId },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
  }

  async marcarLeidas(usuarioId: string) {
    await this.prisma.notificacion.updateMany({
      where: { usuarioId, leida: false },
      data: { leida: true },
    });
    return { ok: true };
  }

  /** RF-26: auditoría (filtro por organización cuando aplica) */
  auditoria(organizacionId: string | null) {
    return this.prisma.auditoria.findMany({
      where: organizacionId
        ? { organizacionId }
        : { organizacionId: null },
      include: { usuario: { select: { nombre: true, username: true, rol: true } } },
      orderBy: { createdAt: 'desc' },
      take: 200,
    });
  }
}