import { Injectable, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';

@Injectable()
export class DirectorService {
  constructor(private readonly prisma: PrismaService) {}

  /** RF-24: eventos y resultados del club del Director autenticado */
  async misResultados(usuarioId: string) {
    const director = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { clubDirector: true },
    });
    if (!director?.clubDirectorId) {
      throw new ForbiddenException('No tienes un club asociado');
    }

    const clubes = await this.prisma.eventoClub.findMany({
      where: { clubId: director.clubDirectorId },
      include: {
        evento: { include: { criterios: true } },
        evaluaciones: {
          include: { puntajes: true },
        },
        penalizaciones: { where: { anulada: false }, include: { motivo: true } },
        principal: { select: { id: true, nombre: true } },
      },
      orderBy: { evento: { fecha: 'desc' } },
    });

    return clubes.map((ec) => {
      let bruto = 0;
      if (ec.principal && ec.evaluaciones?.length) {
        const ev = ec.evaluaciones.find((e) => e.usuarioId === ec.principal!.id);
        if (ev) {
          const criterios = ec.evento.criterios ?? [];
          for (const c of criterios) {
            const p = ev.puntajes.find((pj) => pj.criterioId === c.id);
            if (p) bruto += (p.valor * c.peso) / 100;
          }
          bruto = (bruto * ec.evento.puntajeMaximo) / 100;
        }
      }
      const penalizaciones = ec.penalizaciones.reduce((s, p) => s + p.motivo.puntosDescuento, 0);
      return {
        eventoId: ec.evento.id,
        evento: ec.evento.nombre,
        fecha: ec.evento.fecha,
        cerrado: ec.evento.cerrado,
        puntaje: Math.round((bruto - penalizaciones) * 100) / 100,
        penalizaciones,
      };
    });
  }

  /** RF-08: ver miembros de su club */
  async misMiembros(usuarioId: string) {
    const director = await this.prisma.usuario.findUnique({
      where: { id: usuarioId },
      include: { clubDirector: { include: { miembros: { orderBy: { nombre: 'asc' } } } } },
    });
    if (!director?.clubDirectorId) {
      throw new ForbiddenException('No tienes un club asociado');
    }
    return director.clubDirector;
  }
}