import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  Min,
} from 'class-validator';

export class CrearMotivoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  descripcion?: string;

  @IsInt()
  @Min(1)
  puntosDescuento: number;
}

export class AplicarPenalizacionDto {
  @IsOptional()
  @IsString()
  clubId?: string;

  @IsString()
  @IsNotEmpty()
  motivoId: string;

  @IsOptional()
  @IsString()
  @MaxLength(300)
  comentario?: string;
}