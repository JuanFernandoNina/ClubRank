export interface JwtPayload {
  sub: string; // usuario id
  username: string;
  rol: 'admin' | 'staff' | 'director';
  organizacionId: string | null;
}