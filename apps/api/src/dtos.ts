import {
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  MinLength,
  MaxLength,
  Min,
} from 'class-validator';

export class RegistrarAdminDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(40)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(6)
  password: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(2)
  @MaxLength(80)
  nombreOrganizacion: string;
}

export class LoginDto {
  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  @IsNotEmpty()
  password: string;
}

export class RegistrarStaffDirectorDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(50)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  @MinLength(3)
  @MaxLength(30)
  username: string;

  @IsOptional()
  @IsString()
  password?: string;

  @IsOptional()
  @IsString()
  rol?: 'staff' | 'director';

  @IsOptional()
  @IsString()
  clubId?: string;
}

export class ActualizarUsuarioDto {
  @IsOptional()
  @IsString()
  @MinLength(3)
  @MaxLength(50)
  nombre?: string;

  @IsOptional()
  @IsString()
  @MinLength(6)
  password?: string;

  @IsOptional()
  @IsString()
  rol?: 'staff' | 'director';

  @IsOptional()
  @IsString()
  clubId?: string | null;
}

export class CrearCriterioDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;

  @IsInt()
  @Min(1)
  peso: number;
}

export class CrearClubDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(80)
  nombre: string;
}

export class CrearMiembroDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsOptional()
  @IsInt()
  edad?: number;

  @IsOptional()
  @IsString()
  cargo?: string;

  @IsOptional()
  @IsInt()
  anioIngreso?: number;

  @IsOptional()
  @IsString()
  categoria?: string;
}

export class CrearEventoDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  nombre: string;

  @IsString()
  @IsNotEmpty()
  fecha: string; // ISO date

  @IsOptional()
  @IsString()
  lugar?: string;

  @IsOptional()
  @IsString()
  tipo?: string;

  @IsString()
  @IsNotEmpty()
  temporada: string;

  @IsInt()
  @Min(1)
  puntajeMaximo: number;
}

export class AsignarClubesDto {
  @IsString({ each: true })
  clubIds: string[];
}

export class DesignarPrincipalDto {
  @IsString()
  staffPrincipalId: string;
}

export class GenerarAccesoDto {
  @IsString()
  @IsNotEmpty()
  nombre: string;

  @IsString()
  @IsNotEmpty()
  username: string;

  @IsString()
  rol: 'staff' | 'director';

  @IsOptional()
  @IsString()
  clubId?: string;

  @IsOptional()
  esPrincipal?: boolean;
}