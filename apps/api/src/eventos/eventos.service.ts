import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { AuthService } from '../auth/auth.service.js';
import {
  CrearEventoDto,
  CrearCriterioDto,
  AsignarClubesDto,
  DesignarPrincipalDto,
  GenerarAccesoDto,
} from '../dtos.js';

@Injectable()
export class EventosService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly auth: AuthService,
  ) {}

  private async getEvento(eventoId: string) {
    const e = await this.prisma.evento.findUnique({ where: { id: eventoId } });
    if (!e) throw new NotFoundException('Evento no encontrado');
    return e;
  }

  /** Aislamiento multi-tenant (RF-06) */
  private async validarPertenece(eventoId: string, orgId: string | null) {
    const e = await this.getEvento(eventoId);
    if (e.organizacionId !== orgId) {
      throw new ForbiddenException('El evento no pertenece a tu organización');
    }
    return e;
  }

  // ---- CRUD evento (RF-11) ----

  listar(orgId: string) {
    return this.prisma.evento.findMany({
      where: { organizacionId: orgId },
      orderBy: { fecha: 'desc' },
    });
  }

  detalle(eventoId: string, orgId: string | null) {
    return this.validarPertenece(eventoId, orgId).then((e) =>
      this.prisma.evento.findUnique({
        where: { id: e.id },
        include: {
          criterios: { orderBy: { nombre: 'asc' } },
          clubes: {
            include: {
              club: true,
              principal: { select: { id: true, nombre: true, username: true } },
              asignaciones: { include: { usuario: { select: { id: true, nombre: true, username: true, rol: true } } } },
              evaluaciones: true,
            },
          },
        },
      }),
    );
  }

  async crear(orgId: string, dto: CrearEventoDto) {
    return this.prisma.evento.create({
      data: {
        nombre: dto.nombre,
        fecha: new Date(dto.fecha),
        lugar: dto.lugar,
        tipo: dto.tipo,
        temporada: dto.temporada,
        puntajeMaximo: dto.puntajeMaximo,
        organizacionId: orgId,
      },
    });
  }

  async eliminar(eventoId: string, orgId: string | null) {
    const e = await this.validarPertenece(eventoId, orgId);
    await this.prisma.evento.delete({ where: { id: e.id } });
    return { ok: true };
  }

  // ---- Criterios (RF-13/14, RN-01) ----

  async crearCriterio(eventoId: string, orgId: string | null, dto: CrearCriterioDto) {
    const e = await this.validarPertenece(eventoId, orgId);
    const criterios = await this.prisma.criterio.findMany({ where: { eventoId } });
    const sumaActual = criterios.reduce((s, c) => s + c.peso, 0);
    if (sumaActual + dto.peso > 100) {
      throw new BadRequestException(
        `La suma de pesos excedería 100% (actual ${sumaActual}%).`,
      );
    }
    if (sumaActual + dto.peso < 100 && criterios.length > 0) {
      // Se permite agregar mientras no supere 100; el cierre valida exactitud.
    }
    if (e.cerrado) throw new ForbiddenException('Evento cerrado: no se pueden modificar criterios');
    return this.prisma.criterio.create({ data: { ...dto, eventoId } });
  }

  async eliminarCriterio(criterioId: string, orgId: string | null) {
    const c = await this.prisma.criterio.findUnique({
      where: { id: criterioId },
      include: { evento: true },
    });
    if (!c) throw new NotFoundException('Criterio no encontrado');
    if (c.evento.organizacionId !== orgId) throw new ForbiddenException();
    if (c.evento.cerrado) throw new ForbiddenException('Evento cerrado');
    await this.prisma.criterio.delete({ where: { id: criterioId } });
    return { ok: true };
  }

  // ---- Clubes participantes (RF-12) ----

  async asignarClubes(eventoId: string, orgId: string | null, dto: AsignarClubesDto) {
    const e = await this.validarPertenece(eventoId, orgId);
    if (e.cerrado) throw new ForbiddenException('Evento cerrado');

    const clubesValidos = await this.prisma.club.count({
      where: { id: { in: dto.clubIds }, organizacionId: orgId! },
    });
    if (clubesValidos !== dto.clubIds.length) {
      throw new BadRequestException('Algunos clubes no pertenecen a tu organización');
    }

    for (const clubId of dto.clubIds) {
      await this.prisma.eventoClub.upsert({
        where: { eventoId_clubId: { eventoId: e.id, clubId } },
        create: { eventoId: e.id, clubId },
        update: {},
      });
    }
    return { ok: true };
  }

  async designarPrincipal(eventoId: string, clubId: string, orgId: string | null, dto: DesignarPrincipalDto) {
    const e = await this.validarPertenece(eventoId, orgId);
    const ec = await this.prisma.eventoClub.findUnique({
      where: { eventoId_clubId: { eventoId: e.id, clubId } },
      include: { evento: true },
    });
    if (!ec) throw new NotFoundException('El club no participa en el evento');
    if (e.cerrado) throw new ForbiddenException('Evento cerrado');

    // El principal debe ser staff asignado al evento (RF-42)
    const asignacion = await this.prisma.asignacion.findFirst({
      where: { usuarioId: dto.staffPrincipalId, eventoClubId: ec.id, rol: 'staff' },
    });
    if (!asignacion) {
      throw new BadRequestException(
        'El staff no está asignado como staff a este evento/club. Genere accesos primero.',
      );
    }
    return this.prisma.eventoClub.update({
      where: { id: ec.id },
      data: { principalId: dto.staffPrincipalId },
    });
  }

  // ---- Generar accesos masivos (RF-04) ----

  async generarAccesos(eventoId: string, orgId: string | null, accesos: GenerarAccesoDto[] | GenerarAccesoDto) {
    const lista = Array.isArray(accesos) ? accesos : [accesos];
    const e = await this.validarPertenece(eventoId, orgId);
    if (e.cerrado) throw new ForbiddenException('Evento cerrado');

    const resultados = [];
    for (const acc of lista) {
      // Reutiliza usuario global si existe en la org (RF-04)
      const { usuario, password } = await this.auth.registroStaffDirector(
        { nombre: acc.nombre, username: acc.username },
        orgId!,
      );

      // Determina eventoClub: director -> clubId obligatorio; staff -> clubId obligatorio
      if (acc.rol === 'director' && !acc.clubId) {
        throw new BadRequestException('El director requiere clubId');
      }
      if (acc.rol === 'staff' && !acc.clubId) {
        throw new BadRequestException('El staff requiere clubId');
      }
      const ec = await this.prisma.eventoClub.findUnique({
        where: { eventoId_clubId: { eventoId: e.id, clubId: acc.clubId! } },
      });
      if (!ec) {
        throw new BadRequestException(`El club ${acc.clubId} no participa en el evento`);
      }

      await this.prisma.asignacion.create({
        data: { usuarioId: usuario.id, eventoClubId: ec.id, rol: acc.rol },
      });

      if (acc.esPrincipal) {
        await this.prisma.eventoClub.update({
          where: { id: ec.id },
          data: { principalId: usuario.id },
        });
      }

      if (acc.rol === 'director') {
        await this.prisma.usuario.update({
          where: { id: usuario.id },
          data: { clubDirectorId: acc.clubId },
        });
      }

      resultados.push({
        id: usuario.id,
        username: usuario.username,
        rol: acc.rol,
        clubId: acc.clubId,
        esPrincipal: acc.esPrincipal ?? false,
        password: password ?? undefined, // visible solo la primera vez (RF-04)
      });
    }
    return resultados;
  }

  // ---- Pendientes y cierre (RF-33, RF-15) ----

  async pendientes(eventoId: string, orgId: string | null) {
    const e = await this.validarPertenece(eventoId, orgId);
    const clubes = await this.prisma.eventoClub.findMany({
      where: { eventoId: e.id },
      include: {
        club: true,
        principal: true,
        evaluaciones: { select: { usuarioId: true } },
      },
    });
    return clubes
      .filter((c) => !c.principal)
      .map((c) => ({
        clubId: c.clubId,
        club: c.club.nombre,
        motivo: 'Sin staff principal designado',
      }))
      .concat(
        clubes
          .filter(
            (c) =>
              c.principal &&
              !c.evaluaciones.some((ev) => ev.usuarioId === c.principal!.id),
          )
          .map((c) => ({
            clubId: c.clubId,
            club: c.club.nombre,
            staffPrincipal: c.principal!.nombre,
            motivo: 'Sin evaluación del staff principal',
          })),
      );
  }

  async cerrar(eventoId: string, orgId: string | null) {
    const e = await this.validarPertenece(eventoId, orgId);
    const pendientes = await this.pendientes(eventoId, orgId);
    if (pendientes.length > 0) {
      throw new BadRequestException({
        message: 'Existen evaluaciones pendientes',
        pendientes,
      });
    }
    const criterios = await this.prisma.criterio.findMany({ where: { eventoId: e.id } });
    const suma = criterios.reduce((s, c) => s + c.peso, 0);
    if (suma !== 100) {
      throw new BadRequestException(`La suma de pesos de criterios es ${suma}% (debe ser 100%)`);
    }
    const evento = await this.prisma.evento.update({
      where: { id: e.id },
      data: { cerrado: true },
    });
    await this.calcularRankingEvento(e.id);
    return evento;
  }

  /** RF-34: reabrir evento solo por Admin + auditoría */
  async reabrir(eventoId: string, orgId: string | null, adminId: string) {
    const e = await this.validarPertenece(eventoId, orgId);
    if (!e.cerrado) throw new BadRequestException('El evento ya está abierto');
    await this.prisma.auditoria.create({
      data: {
        usuarioId: adminId,
        accion: 'reabrir',
        detalle: `Evento "${e.nombre}" (${e.id}) reabierto`,
        organizacionId: orgId,
      },
    });
    return this.prisma.evento.update({ where: { id: e.id }, data: { cerrado: false } });
  }

  // ---- Rankings (RF-20/21/22/45/46, RN-03 y nueva RN-12) ----

  async calcularRankingEvento(eventoId: string) {
    const e = await this.getEvento(eventoId);
    const criterios = await this.prisma.criterio.findMany({
      where: { eventoId },
      orderBy: { peso: 'desc' },
    });
    const clubes = await this.prisma.eventoClub.findMany({
      where: { eventoId },
      include: {
        club: true,
        principal: { select: { id: true } },
        evaluaciones: {
          include: { puntajes: true },
        },
        penalizaciones: {
          where: { anulada: false },
          include: { motivo: true },
        },
      },
    });

    const rows = [];
    for (const ec of clubes) {
      if (!ec.principal) continue;
      const evaluacion = ec.evaluaciones.find((ev) => ev.usuarioId === ec.principal!.id);
      if (!evaluacion) continue;

      let puntajeBruto = 0;
      for (const c of criterios) {
        const p = evaluacion.puntajes.find((pj) => pj.criterioId === c.id);
        const valor = p ? p.valor : 0;
        puntajeBruto += (valor * c.peso) / 100;
      }
      const puntajeBrutoPts = (puntajeBruto * e.puntajeMaximo) / 100;
      const penalizaciones = ec.penalizaciones.reduce(
        (s, p) => s + p.motivo.puntosDescuento,
        0,
      );
      const puntajeFinal = Math.round((puntajeBrutoPts - penalizaciones) * 100) / 100;

      rows.push({
        eventoClubId: ec.id,
        clubId: ec.clubId,
        club: ec.club.nombre,
        puntajeBruto: Math.round(puntajeBrutoPts * 100) / 100,
        penalizaciones,
        puntaje: puntajeFinal,
        // Desempate RF-21: valor del criterio de mayor peso
        desempate: evaluacion.puntajes.find(
          (pj) => pj.criterioId === criterios[0]?.id,
        )?.valor ?? 0,
      });
    }
    rows.sort((a, b) => b.puntaje - a.puntaje || b.desempate - a.desempate);

    const resultado = rows.map((r, i) => ({
      posicion: i + 1,
      ...r,
    }));
    return { eventoId, ranking: resultado };
  }

  rankingEvento(eventoId: string, orgId: string | null) {
    return this.validarPertenece(eventoId, orgId).then(() =>
      this.calcularRankingEvento(eventoId),
    );
  }

  async rankingTemporada(temporada: string, orgId: string | null) {
    const eventos = await this.prisma.evento.findMany({
      where: { organizacionId: orgId ?? undefined, temporada },
    });
    const rankingEventos: Awaited<ReturnType<typeof this.calcularRankingEvento>>[] = [];
    for (const ev of eventos) {
      if (ev.cerrado) {
        rankingEventos.push(await this.calcularRankingEvento(ev.id));
      }
    }

    const porClub = new Map<string, { clubId: string; club: string; total: number; penalizaciones: number }>();
    for (const re of rankingEventos) {
      for (const fila of re.ranking) {
        const actual = porClub.get(fila.clubId) ?? {
          clubId: fila.clubId,
          club: fila.club,
          total: 0,
          penalizaciones: 0,
        };
        actual.total += fila.puntaje;
        actual.penalizaciones += fila.penalizaciones;
        porClub.set(fila.clubId, actual);
      }
    }
    const filas = [...porClub.values()]
      .map((f) => ({ ...f, total: Math.round(f.total * 100) / 100 }))
      .sort((a, b) => b.total - a.total)
      .map((f, i) => ({ posicion: i + 1, ...f }));
    return { temporada, ranking: filas };
  }
}