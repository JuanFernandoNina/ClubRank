import {
  Controller,
  Post,
  Body,
  HttpCode,
  HttpStatus,
  UseGuards,
  Request,
  BadRequestException,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { AuthService } from './auth.service.js';
import { Roles } from './roles.decorator.js';
import { RegistrarAdminDto, LoginDto, RegistrarStaffDirectorDto } from '../dtos.js';

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
  @UseGuards(AuthGuard('jwt'))
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
}