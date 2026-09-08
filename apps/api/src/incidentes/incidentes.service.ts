import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { EstadosIncidente } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service.js';
import { ReportarIncidenteDto, ActualizarIncidenteDto } from './incidentes.dtos.js';

@Injectable()
export class IncidentesService {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-29: Staff reporta incidente (sin foto en MVP, RF-32 difiere a futuro) */
  async reportar(eventoId: string, dto: ReportarIncidenteDto, usuarioId: string) {
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (evento.cerrado) throw new ForbiddenException('Evento cerrado, no se puede reportar');

    let eventoClubId: string | null = null;
    if (dto.clubId) {
      const ec = await this.prisma.eventoClub.findUnique({
        where: { eventoId_clubId: { eventoId, clubId: dto.clubId } },
      });
      if (!ec) throw new NotFoundException('El club no participa en el evento');
      eventoClubId = ec.id;
    }

    const incidente = await this.prisma.incidente.create({
      data: {
        tipo: dto.tipo,
        gravedad: dto.gravedad,
        descripcion: dto.descripcion,
        eventoId,
        eventoClubId,
        usuarioId,
      },
    });

    // RF-31: notificación in-app al Admin si gravedad alta
    if (dto.gravedad === 'alta') {
      const admins = await this.prisma.usuario.findMany({
        where: { organizacionId: evento.organizacionId, rol: 'admin' },
      });
      for (const adm of admins) {
        await this.prisma.notificacion.create({
          data: {
            usuarioId: adm.id,
            tipo: 'incidente_grave',
            mensaje: `Incidente de gravedad alta reportado en el evento "${evento.nombre}"`,
          },
        });
      }
    }
    return incidente;
  }

  /** RF-30: listar con filtros */
  listar(orgId: string, filtros: { evento?: string; club?: string; estado?: string; gravedad?: string }) {
    return this.prisma.incidente.findMany({
      where: {
        evento: {
          organizacionId: orgId,
          ...(filtros.evento ? { id: filtros.evento } : {}),
        },
        ...(filtros.club ? { eventoClub: { clubId: filtros.club } } : {}),
        ...(filtros.estado ? { estado: filtros.estado as EstadosIncidente } : {}),
        ...(filtros.gravedad ? { gravedad: filtros.gravedad } : {}),
      },
      include: {
        evento: { select: { id: true, nombre: true } },
        eventoClub: { include: { club: { select: { id: true, nombre: true } } } },
        usuario: { select: { id: true, nombre: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }

  /** RF-30: transición abierto -> en_revision -> resuelto */
  async cambiarEstado(incidenteId: string, dto: ActualizarIncidenteDto) {
    const incidente = await this.prisma.incidente.findUnique({
      where: { id: incidenteId },
    });
    if (!incidente) throw new NotFoundException('Incidente no encontrado');

    const permitidos: Record<string, string[]> = {
      abierto: ['en_revision', 'resuelto'],
      en_revision: ['resuelto'],
      resuelto: [],
    };
    if (!permitidos[incidente.estado].includes(dto.estado)) {
      throw new ForbiddenException(
        `No se puede pasar de "${incidente.estado}" a "${dto.estado}"`,
      );
    }
    return this.prisma.incidente.update({
      where: { id: incidenteId },
      data: { estado: dto.estado as EstadosIncidente },
    });
  }
}