import { Controller, Get, UseGuards, Request } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DirectorService } from './director.service.js';

@Controller('director')
export class DirectorController {
  constructor(private readonly service: DirectorService) {}

  @Get('resultados')
  @UseGuards(AuthGuard('jwt'))
  misResultados(@Request() req: { user: { id: string } }) {
    return this.service.misResultados(req.user.id);
  }

  @Get('club')
  @UseGuards(AuthGuard('jwt'))
  miClub(@Request() req: { user: { id: string } }) {
    return this.service.misMiembros(req.user.id);
  }
}