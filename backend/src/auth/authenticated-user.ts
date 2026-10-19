/**
 * Usuario autenticado tal como lo ven los módulos de pois, reports, users y
 * diagnóstico: datos de la tabla `usuario` y su rol, leídos de la base en
 * cada petición (un rol revocado deja de valer de inmediato, no al vencer el JWT).
 */
export interface AuthenticatedUser {
  id_usuario: string;
  email: string;
  estado_cuenta: string;
  rol_id: string;
  nombre_rol: string;
}
