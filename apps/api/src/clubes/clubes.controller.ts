import {
  Controller,
  Post,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  UploadedFile,
  UseInterceptors,
  Res,
  BadRequestException,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import type { Response } from 'express';

interface ArchivoSubido {
  buffer?: Buffer;
}
import { AuthGuard } from '@nestjs/passport';
import { Roles } from '../auth/roles.decorator.js';
import { RolesGuard } from '../auth/guards.js';
import { ClubesService } from './clubes.service.js';
import { ClubesImportService } from './clubes-import.service.js';
import { CrearClubDto, CrearMiembroDto } from '../dtos.js';

@Controller()
export class ClubesController {
  constructor(
    private readonly service: ClubesService,
    private readonly importService: ClubesImportService,
  ) {}

  @Get('organizaciones/:orgId/clubes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  listar(@Param('orgId') orgId: string) {
    return this.service.listar(orgId);
  }

  @Post('organizaciones/:orgId/clubes')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  crear(@Param('orgId') orgId: string, @Body() dto: CrearClubDto) {
    return this.service.crear(orgId, dto);
  }

  @Patch('clubes/:clubId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  actualizar(@Param('clubId') clubId: string, @Body() dto: CrearClubDto) {
    return this.service.actualizar(clubId, dto);
  }

  @Delete('clubes/:clubId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  eliminar(@Param('clubId') clubId: string) {
    return this.service.eliminar(clubId);
  }

  // ---- Miembros ----

  @Get('clubes/:clubId/miembros')
  @UseGuards(AuthGuard('jwt'))
  listarMiembros(@Param('clubId') clubId: string) {
    return this.service.listarMiembros(clubId);
  }

  @Post('clubes/:clubId/miembros')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  crearMiembro(@Param('clubId') clubId: string, @Body() dto: CrearMiembroDto) {
    return this.service.crearMiembro(clubId, dto);
  }

  @Patch('miembros/:miembroId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  actualizarMiembro(@Param('miembroId') miembroId: string, @Body() dto: CrearMiembroDto) {
    return this.service.actualizarMiembro(miembroId, dto);
  }

  @Delete('miembros/:miembroId')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  eliminarMiembro(@Param('miembroId') miembroId: string) {
    return this.service.eliminarMiembro(miembroId);
  }

  // ---- Miembros: plantilla e importación Excel ----

  @Get('clubes/:clubId/plantilla')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  async plantilla(@Res() res: Response) {
    const buf = await this.importService.generarPlantilla();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="plantilla-miembros.xlsx"',
    );
    res.send(buf);
  }

  @Post('clubes/:clubId/miembros/importar')
  @UseGuards(AuthGuard('jwt'), RolesGuard)
  @Roles('admin')
  @UseInterceptors(FileInterceptor('archivo'))
  async importar(
    @Param('clubId') clubId: string,
    @UploadedFile() archivo?: ArchivoSubido,
  ) {
    if (!archivo || !archivo.buffer) {
      throw new BadRequestException('Enviá el archivo en el campo "archivo"');
    }
    return this.importService.importar(clubId, archivo.buffer);
  }
}