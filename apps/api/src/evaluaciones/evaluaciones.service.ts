import {
  Injectable,
  NotFoundException,
  ForbiddenException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { GuardarEvaluacionDto } from './evaluaciones.dtos.js';

@Injectable()
export class EvaluacionesService {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-16: eventos del staff autenticado */
  async misEventos(usuarioId: string) {
    const asignaciones = await this.prisma.asignacion.findMany({
      where: { usuarioId, rol: 'staff' },
      include: {
        eventoClub: {
          include: {
            evento: true,
            club: { select: { id: true, nombre: true } },
          },
        },
      },
      orderBy: { eventoClub: { evento: { fecha: 'desc' } } },
    });
    const porEvento = new Map<
      string,
      { evento: (typeof asignaciones)[number]['eventoClub']['evento']; clubes: { id: string; nombre: string; esPrincipal: boolean }[] }
    >();
    for (const a of asignaciones) {
      const evId = a.eventoClub.eventoId;
      const actual = porEvento.get(evId) ?? {
        evento: a.eventoClub.evento,
        clubes: [],
      };
      actual.clubes.push({
        id: a.eventoClub.clubId,
        nombre: a.eventoClub.club.nombre,
        esPrincipal: a.eventoClub.principalId === usuarioId,
      });
      porEvento.set(evId, actual);
    }
    return [...porEvento.values()].map((e) => ({
      id: e.evento.id,
      nombre: e.evento.nombre,
      fecha: e.evento.fecha,
      cerrado: e.evento.cerrado,
      temporada: e.evento.temporada,
      clubes: e.clubes,
    }));
  }

  /** RF-16: clubes del evento asignado al staff */
  async clubesAsignados(eventoId: string, usuarioId: string) {
    const evento = await this.prisma.evento.findUnique({
      where: { id: eventoId },
      include: { criterios: { orderBy: { nombre: 'asc' } } },
    });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    const asignaciones = await this.prisma.asignacion.findMany({
      where: { usuarioId, eventoClub: { eventoId }, rol: 'staff' },
      include: {
        eventoClub: {
          include: {
            club: true,
            principal: { select: { id: true, nombre: true } },
          },
        },
      },
    });
    return {
      eventoId,
      cerrado: evento.cerrado,
      criterios: evento.criterios,
      clubes: asignaciones.map((a) => ({
        eventoClubId: a.eventoClubId,
        clubId: a.eventoClub.clubId,
        club: a.eventoClub.club.nombre,
        esPrincipal: a.eventoClub.principalId === usuarioId,
      })),
    };
  }

  /**
   * RF-17/18/19: guardar/editar evaluación.
   * Solo el Staff principal del club puede calificar; de lo contrario 403 (decisión tomada).
   */
  async guardar(eventoId: string, dto: GuardarEvaluacionDto, usuarioId: string) {
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (evento.cerrado) {
      throw new ForbiddenException('Evento cerrado, no se puede modificar');
    }

    const ec = await this.prisma.eventoClub.findUnique({
      where: { eventoId_clubId: { eventoId, clubId: dto.clubId } },
    });
    if (!ec) throw new NotFoundException('El club no participa en el evento');

    const asignacion = await this.prisma.asignacion.findFirst({
      where: { usuarioId, eventoClubId: ec.id, rol: 'staff' },
    });
    if (!asignacion) {
      throw new ForbiddenException('No estás asignado a este club en el evento');
    }
    if (ec.principalId !== usuarioId) {
      throw new ForbiddenException('Solo el Staff principal puede calificar a este club');
    }

    const criterios = await this.prisma.criterio.findMany({ where: { eventoId } });
    if (criterios.length === 0) {
      throw new BadRequestException('El evento no tiene criterios definidos');
    }

    // Validamos que vengan todos los criterios con valores 0-100 (RN-02)
    const mapa = new Map(dto.puntajes.map((p) => [p.criterioId, p.valor]));
    for (const c of criterios) {
      const valor = mapa.get(c.id);
      if (valor === undefined) {
        throw new BadRequestException(`Falta el puntaje del criterio "${c.nombre}"`);
      }
      if (valor < 0 || valor > 100) {
        throw new BadRequestException(`Valor fuera de rango (0-100) en criterio "${c.nombre}"`);
      }
    }

    const evaluacion = await this.prisma.evaluacion.upsert({
      where: { eventoClubId_usuarioId: { eventoClubId: ec.id, usuarioId } },
      create: {
        eventoClubId: ec.id,
        usuarioId,
        comentario: dto.comentario,
      },
      update: { comentario: dto.comentario },
    });

    for (const p of dto.puntajes) {
      await this.prisma.puntajeCriterio.upsert({
        where: { evaluacionId_criterioId: { evaluacionId: evaluacion.id, criterioId: p.criterioId } },
        create: { evaluacionId: evaluacion.id, criterioId: p.criterioId, valor: p.valor },
        update: { valor: p.valor },
      });
    }

    // Notificación in-app: nuevo resultado disponible (RF-27)
    const director = await this.prisma.usuario.findFirst({
      where: { clubDirectorId: ec.clubId, rol: 'director' },
    });
    if (director) {
      const club = await this.prisma.club.findUnique({ where: { id: ec.clubId } });
      await this.prisma.notificacion.create({
        data: {
          usuarioId: director.id,
          tipo: 'nuevo_resultado',
          mensaje: `Nuevo resultado disponible para "${club?.nombre ?? 'tu club'}" en el evento "${evento.nombre}"`,
        },
      });
    }

    return { ok: true, evaluacionId: evaluacion.id, eventoCerrado: evento.cerrado };
  }
}