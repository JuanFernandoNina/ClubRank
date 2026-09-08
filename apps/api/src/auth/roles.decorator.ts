import { SetMetadata } from '@nestjs/common';

export const ROLES_KEY = 'roles';

/** Roles permitidos en un endpoint. Combinar con @UseGuards(JwtAuthGuard, RolesGuard) */
export const Roles = (...roles: string[]) => SetMetadata(ROLES_KEY, roles);