import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service.js';
import { CrearClubDto, CrearMiembroDto } from '../dtos.js';

@Injectable()
export class ClubesService {
  constructor(private readonly prisma: PrismaService) {}

  private async validarOrg(orgId: string) {
    const org = await this.prisma.organizacion.findUnique({ where: { id: orgId } });
    if (!org) throw new NotFoundException('Organización no encontrada');
  }

  listar(orgId: string) {
    return this.prisma.club.findMany({
      where: { organizacionId: orgId },
      include: { _count: { select: { miembros: true } } },
      orderBy: { nombre: 'asc' },
    });
  }

  async crear(orgId: string, dto: CrearClubDto) {
    await this.validarOrg(orgId);
    return this.prisma.club.create({
      data: { nombre: dto.nombre, organizacionId: orgId },
    });
  }

  async actualizar(clubId: string, dto: CrearClubDto) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club no encontrado');
    return this.prisma.club.update({ where: { id: clubId }, data: { nombre: dto.nombre } });
  }

  async eliminar(clubId: string) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club no encontrado');
    await this.prisma.club.delete({ where: { id: clubId } });
    return { ok: true };
  }

  // ---- Miembros (RF-08) ----

  listarMiembros(clubId: string) {
    return this.prisma.miembro.findMany({
      where: { clubId },
      orderBy: { nombre: 'asc' },
    });
  }

  async crearMiembro(clubId: string, dto: CrearMiembroDto) {
    const club = await this.prisma.club.findUnique({ where: { id: clubId } });
    if (!club) throw new NotFoundException('Club no encontrado');
    return this.prisma.miembro.create({ data: { ...dto, clubId } });
  }

  async eliminarMiembro(miembroId: string) {
    const m = await this.prisma.miembro.findUnique({ where: { id: miembroId } });
    if (!m) throw new NotFoundException('Miembro no encontrado');
    await this.prisma.miembro.delete({ where: { id: miembroId } });
    return { ok: true };
  }
}