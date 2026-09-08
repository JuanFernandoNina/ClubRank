import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class PuntajeDto {
  @IsString()
  @IsNotEmpty()
  criterioId: string;

  @IsInt()
  @Min(0)
  @Max(100)
  valor: number;
}

export class GuardarEvaluacionDto {
  @IsString()
  @IsNotEmpty()
  clubId: string;

  @IsOptional()
  @IsString()
  comentario?: string;

  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => PuntajeDto)
  puntajes: PuntajeDto[];
}