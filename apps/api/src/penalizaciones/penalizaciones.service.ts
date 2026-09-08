import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  CrearMotivoDto,
  AplicarPenalizacionDto,
} from './penalizaciones.dtos.js';

@Injectable()
export class PenalizacionesService {
  constructor(private readonly prisma: PrismaService) {}

  // ---- Motivos (RF-35) ----

  listarMotivos(orgId: string) {
    return this.prisma.motivoPenalizacion.findMany({
      where: { organizacionId: orgId },
      orderBy: { nombre: 'asc' },
    });
  }

  crearMotivo(orgId: string, dto: CrearMotivoDto) {
    return this.prisma.motivoPenalizacion.create({
      data: { ...dto, organizacionId: orgId },
    });
  }

  async actualizarMotivo(motivoId: string, dto: CrearMotivoDto) {
    const m = await this.prisma.motivoPenalizacion.findUnique({ where: { id: motivoId } });
    if (!m) throw new NotFoundException('Motivo no encontrado');
    return this.prisma.motivoPenalizacion.update({ where: { id: motivoId }, data: dto });
  }

  async desactivarMotivo(motivoId: string) {
    const m = await this.prisma.motivoPenalizacion.findUnique({ where: { id: motivoId } });
    if (!m) throw new NotFoundException('Motivo no encontrado');
    return this.prisma.motivoPenalizacion.update({
      where: { id: motivoId },
      data: { activo: false },
    });
  }

  // ---- Aplicar (RF-36/37/38) ----

  async aplicar(eventoId: string, dto: AplicarPenalizacionDto & { clubId: string }, usuarioId: string) {
    const evento = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!evento) throw new NotFoundException('Evento no encontrado');
    if (evento.cerrado) throw new ForbiddenException('Evento cerrado, no se puede aplicar');

    // Solo motivos del catálogo de la misma organización (RN-11)
    const motivo = await this.prisma.motivoPenalizacion.findFirst({
      where: { id: dto.motivoId, organizacionId: evento.organizacionId, activo: true },
    });
    if (!motivo) throw new NotFoundException('Motivo de penalización no válido');

    const ec = await this.prisma.eventoClub.findUnique({
      where: { eventoId_clubId: { eventoId, clubId: dto.clubId } },
    });
    if (!ec) throw new NotFoundException('El club no participa en el evento');

    return this.prisma.penalizacionAplicada.create({
      data: {
        comentario: dto.comentario,
        motivoId: motivo.id,
        eventoClubId: ec.id,
        usuarioId,
      },
    });
  }

  /** RF-40: anular solo por Admin (con auditoría) */
  async anular(penalizacionId: string, adminId: string) {
    const p = await this.prisma.penalizacionAplicada.findUnique({
      where: { id: penalizacionId },
    });
    if (!p) throw new NotFoundException('Penalización no encontrada');
    if (p.anulada) throw new ForbiddenException('La penalización ya fue anulada');

    await this.prisma.auditoria.create({
      data: {
        usuarioId: adminId,
        accion: 'anular',
        detalle: `Penalización ${penalizacionId} anulada`,
      },
    });
    return this.prisma.penalizacionAplicada.update({
      where: { id: penalizacionId },
      data: { anulada: true },
    });
  }

  /** RF-39: reporte de penalizaciones aplicadas */
  reporte(orgId: string, filtros: { evento?: string; club?: string; staff?: string; motivo?: string }) {
    return this.prisma.penalizacionAplicada.findMany({
      where: {
        eventoClub: { evento: { organizacionId: orgId } },
        ...(filtros.evento ? { eventoClub: { eventoId: filtros.evento } } : {}),
        ...(filtros.club ? { eventoClub: { clubId: filtros.club } } : {}),
        ...(filtros.staff ? { usuarioId: filtros.staff } : {}),
        ...(filtros.motivo ? { motivoId: filtros.motivo } : {}),
      },
      include: {
        motivo: true,
        eventoClub: {
          include: {
            club: true,
            evento: { select: { id: true, nombre: true } },
          },
        },
        usuario: { select: { id: true, nombre: true, username: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
  }
}