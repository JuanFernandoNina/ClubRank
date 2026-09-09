import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  Param,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { Roles } from './roles.decorator.js';
import { RolesGuard } from './guards.js';
import { RegistrarAdminDto, LoginDto, RegistrarStaffDirectorDto, ActualizarUsuarioDto } from '../dtos.js';

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('registro')
  registrarAdmin(@Body() dto: RegistrarAdminDto) {
    return this.auth.registrarAdmin(dto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  login(@Body() dto: LoginDto) {
    return this.auth.login(dto);
  }

  @Post('usuarios')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async registrarUsuario(
    @Request() req: { user: { rol: string; organizacionId: string; id: string } },
    @Body() dto: RegistrarStaffDirectorDto,
  ) {
    if (!req.user.organizacionId) {
      throw new BadRequestException('Admin sin organización asociada');
    }
    const result = await this.auth.registroStaffDirector(dto, req.user.organizacionId);
    const { usuario, ...resto } = result;
    return { usuario: { id: usuario.id, username: usuario.username, nombre: usuario.nombre, rol: usuario.rol }, ...resto };
  }

  @Get('organizaciones/:orgId/usuarios')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listarUsuarios(@Param('orgId') orgId: string) {
    return this.auth.listarUsuarios(orgId);
  }

  @Patch('usuarios/:id')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  actualizarUsuario(
    @Param('id') id: string,
    @Request() req: { user: { organizacionId: string | null } },
    @Body() dto: ActualizarUsuarioDto,
  ) {
    if (!req.user.organizacionId) {
      throw new BadRequestException('Admin sin organización asociada');
    }
    return this.auth.actualizarUsuario(id, req.user.organizacionId, dto);
  }
}