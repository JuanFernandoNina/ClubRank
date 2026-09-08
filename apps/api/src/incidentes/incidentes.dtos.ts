import {
  IsIn,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
} from 'class-validator';

export class ReportarIncidenteDto {
  @IsOptional()
  @IsString()
  clubId?: string;

  @IsString()
  @IsNotEmpty()
  @MaxLength(60)
  tipo: string;

  @IsIn(['baja', 'media', 'alta'])
  gravedad: 'baja' | 'media' | 'alta';

  @IsString()
  @IsNotEmpty()
  @MaxLength(1000)
  descripcion: string;
}

export class ActualizarIncidenteDto {
  @IsIn(['abierto', 'en_revision', 'resuelto'])
  estado: 'abierto' | 'en_revision' | 'resuelto';
}