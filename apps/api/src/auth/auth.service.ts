import {
  Injectable,
  UnauthorizedException,
  ConflictException,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import * as bcrypt from 'bcryptjs';
import { PrismaService } from '../prisma/prisma.service.js';
import {
  RegistrarAdminDto,
  LoginDto,
  RegistrarStaffDirectorDto,
  ActualizarUsuarioDto,
} from '../dtos.js';
import { randomBytes } from 'crypto';

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  private hash(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async firmaToken(usuario: {
    id: string;
    username: string;
    rol: 'admin' | 'staff' | 'director';
    organizacionId: string | null;
  }) {
    const payload = {
      sub: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      organizacionId: usuario.organizacionId,
    };
    return this.jwt.signAsync(payload);
  }

  /** RF-01: auto-registro de Admin + creación simultánea de su organización */
  async registrarAdmin(dto: RegistrarAdminDto) {
    const existe = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
    });
    if (existe) throw new ConflictException('El nombre de usuario ya existe');

    const passwordHash = await this.hash(dto.password);

    const [usuario] = await this.prisma.$transaction([
      this.prisma.usuario.create({
        data: {
          nombre: dto.nombre,
          username: dto.username,
          passwordHash,
          rol: 'admin',
          organizacion: {
            create: { nombre: dto.nombreOrganizacion },
          },
          creadoPorAdmin: false,
        },
      }),
    ]);

    const organizacionId = (
      await this.prisma.usuario.findUniqueOrThrow({
        where: { id: usuario.id },
        select: { organizacionId: true },
      })
    ).organizacionId;

    const token = await this.firmaToken({
      id: usuario.id,
      username: usuario.username,
      rol: 'admin',
      organizacionId,
    });

    return { token, usuario: { id: usuario.id, rol: 'admin', organizacionId } };
  }

  /** RF-02: login unificado para Admin/Staff/Director */
  async login(dto: LoginDto) {
    const usuario = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
    });
    if (!usuario) throw new UnauthorizedException('Credenciales inválidas');

    const ok = await bcrypt.compare(dto.password, usuario.passwordHash);
    if (!ok) throw new UnauthorizedException('Credenciales inválidas');

    const token = await this.firmaToken({
      id: usuario.id,
      username: usuario.username,
      rol: usuario.rol,
      organizacionId: usuario.organizacionId,
    });

    return {
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        username: usuario.username,
        rol: usuario.rol,
        organizacionId: usuario.organizacionId,
        clubDirectorId: usuario.clubDirectorId,
      },
    };
  }

  /**
   * RF-04: crea Staff/Director (usuario global) dentro de la organización del Admin.
   * Si el username ya existe y es de la misma organización, se reutiliza (no se duplican credenciales).
   * Retorna la contraseña generada SOLO cuando el usuario es nuevo (solo se muestra una vez).
   */
  async registroStaffDirector(dto: RegistrarStaffDirectorDto, organizacionId: string) {
    const existente = await this.prisma.usuario.findUnique({
      where: { username: dto.username },
    });
    if (existente) {
      if (existente.organizacionId !== organizacionId) {
        throw new ConflictException('El nombre de usuario ya está en uso');
      }
      return { usuario: existente, password: null as string | null, reutilizado: true };
    }
    const password = dto.password ?? randomBytes(6).toString('base64url');
    const rol = dto.rol ?? 'staff';
    const usuario = await this.prisma.usuario.create({
      data: {
        nombre: dto.nombre,
        username: dto.username,
        passwordHash: await this.hash(password),
        rol,
        creadoPorAdmin: true,
        organizacionId,
        ...(rol === 'director' && dto.clubId ? { clubDirectorId: dto.clubId } : {}),
      },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        passwordHash: true,
      },
    });
    return { usuario, password, reutilizado: false };
  }

  /** Lista los usuarios de la organización (para la gestión de Admin) */
  listarUsuarios(organizacionId: string) {
    return this.prisma.usuario.findMany({
      where: { organizacionId },
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        creadoPorAdmin: true,
        clubDirector: { select: { id: true, nombre: true } },
      },
      orderBy: [{ rol: 'asc' }, { nombre: 'asc' }],
    });
  }

  /** Actualiza datos de un usuario (staff/director) de la organización. No permite editar el Admin. */
  async actualizarUsuario(
    usuarioId: string,
    organizacionId: string,
    dto: ActualizarUsuarioDto,
  ) {
    const usuario = await this.prisma.usuario.findUnique({ where: { id: usuarioId } });
    if (!usuario || usuario.organizacionId !== organizacionId) {
      throw new NotFoundException('Usuario no encontrado');
    }
    if (usuario.rol === 'admin') {
      throw new BadRequestException('No se puede editar la cuenta de administrador desde aquí');
    }
    const data: {
      nombre?: string;
      rol?: 'staff' | 'director';
      passwordHash?: string;
      clubDirectorId?: string | null;
    } = {};
    if (dto.nombre !== undefined) data.nombre = dto.nombre;
    if (dto.rol !== undefined) data.rol = dto.rol;
    if (dto.password !== undefined) data.passwordHash = await this.hash(dto.password);
    if (dto.rol === 'director') data.clubDirectorId = dto.clubId ?? null;
    if (dto.rol === 'staff') data.clubDirectorId = null;
    return this.prisma.usuario.update({
      where: { id: usuarioId },
      data,
      select: {
        id: true,
        username: true,
        nombre: true,
        rol: true,
        clubDirector: { select: { id: true, nombre: true } },
      },
    });
  }
}