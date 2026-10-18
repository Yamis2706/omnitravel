/**
 * Tipos del esquema OmniTravel en Supabase (proyecto de la BD del equipo).
 *
 * Reflejan las tablas reales verificadas en el proyecto
 * "sarafaustino's Project" (org OmniTravel, ref `scpwrozsjpittiypvwxj`):
 * `usuario`, `rol`, `poi`, `caracteristica_accesibilidad`,
 * `valor_accesibilidad_poi`, `retroalimentacion`, entre otras.
 *
 * Nota de dominio: los roles dejaron de ser los del front web de transporte
 * (`estudiante`/`pasajero`/`superadmin`); corresponden al catálogo OmniTravel
 * del doc ADR-007 (viajero, colaborador, establecimiento, moderador,
 * administrador).
 */

export type Rol =
  'viajero' | 'colaborador' | 'establecimiento' | 'moderador' | 'administrador';

export type EstadoCuenta = 'activo' | 'suspendido';

/** Fila de la tabla `rol` (catálogo de roles del dominio). */
export interface FilaRol {
  id_rol: number;
  nombre_rol: Rol;
}

/** Fila de la tabla `usuario` del proyecto OmniTravel. */
export interface UsuarioOmniTravel {
  id_usuario: number;
  email: string;
  /** Hash de contrasena (SHA-256) guardado para trazabilidad del front web. */
  password_hash: string;
  rol_id: number;
  fecha_registro: string;
  estado_cuenta: EstadoCuenta;
  /** UUID del usuario en Supabase Auth (auth.users.id) cuando está vinculado. */
  auth_user_id: string | null;
}

/** Datos de registro de una cuenta viajero desde la app móvil (U03). */
export interface DatosRegistro {
  nombre: string;
  email: string;
  contrasena: string;
}

/** Resultado del registro contra Supabase Auth + tabla `usuario`. */
export interface ResultadoRegistro {
  email: string;
  /** UUID en auth.users cuando Supabase Auth aceptó la cuenta. */
  idAuthSupabase: string | null;
  /** Fila de `usuario` creada; null si la política INSERT de RLS está pendiente. */
  perfil: UsuarioOmniTravel | null;
  /** Aviso informativo (p. ej. RLS pendiente) — no es un error. */
  aviso?: string;
}

/** Resultado del inicio de sesión contra Supabase Auth. */
export interface ResultadoSesion {
  /** Fila de `usuario` si pudo leerse; null si la política SELECT está pendiente. */
  perfil: UsuarioOmniTravel | null;
  /** Aviso informativo (p. ej. RLS pendiente) — no es un error. */
  aviso?: string;
}
