import { Module } from '@nestjs/common';
import { DirectorService } from './director.service.js';
import { DirectorController } from './director.controller.js';

@Module({
  controllers: [DirectorController],
  providers: [DirectorService],
})
export class DirectorModule {}