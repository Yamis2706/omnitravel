import { supabase } from './client';
import type {
  DatosRegistro,
  ResultadoRegistro,
  ResultadoSesion,
  UsuarioOmniTravel,
} from './types';
import type { RolUsuario } from '../types';
import { hashearContrasena } from './hash';

const TABLA_USUARIOS = 'usuario';

/**
 * Catálogo de roles del dominio verificado en la BD del equipo
 * (`rol`: 1 viajero, 2 colaborador, 3 establecimiento, 4 moderador,
 * 5 administrador). Se usa para derivar el rol del perfil local al entrar.
 */
const ROLES_POR_ID: Record<number, RolUsuario> = {
  1: 'viajero',
  2: 'colaborador',
  3: 'establecimiento',
  4: 'moderador',
  5: 'administrador',
};

/** Deriva el rol del front desde `usuario.rol_id` (viajero si es desconocido). */
export function rolDeUsuarioId(rolId?: number | null): RolUsuario {
  if (rolId != null && ROLES_POR_ID[rolId]) {
    return ROLES_POR_ID[rolId];
  }
  return 'viajero';
}

/**
 * Respaldo del catálogo de roles (semilla verificada en la BD del equipo:
 * `rol` con nombre_rol='viajero' tiene id_rol=1). El valor se resuelve por
 * nombre con `idRolViajero()` cuando la política de lectura de `rol` permite
 * la consulta (aplicada 2026-10-17, ver docs/gestion/supabase-sara/).
 */
const ID_ROL_VIAJERO = 1;

/** Resuelve el id del rol 'viajero' desde el catálogo, con respaldo de semilla. */
async function idRolViajero(): Promise<number> {
  const { data, error } = await supabase
    .from('rol')
    .select('id_rol')
    .eq('nombre_rol', 'viajero')
    .maybeSingle();
  if (error || !data) {
    return ID_ROL_VIAJERO;
  }
  return data.id_rol;
}

interface ErrorSupabase {
  code?: string;
  message?: string;
}

/** Traduce los mensajes de Supabase a español operable por la UI. */
function mensajeErrorSupabase(error: ErrorSupabase): string {
  const mensaje = error.message ?? '';
  const code = error.code ?? '';

  if (
    code === 'user_already_exists' ||
    mensaje.includes('already registered')
  ) {
    return 'El correo electrónico ya está registrado.';
  }
  if (mensaje.includes('Invalid login credentials')) {
    return 'Correo o contraseña incorrectos.';
  }
  if (mensaje.includes('Email not confirmed')) {
    return 'Confirma tu correo electrónico antes de iniciar sesión.';
  }
  if (code === '42501' || mensaje.includes('row-level security')) {
    return 'La base de datos todavía no permite esta operación desde la app.';
  }
  if (code === '23505') {
    return 'El correo electrónico ya está registrado.';
  }
  return mensaje || 'Error de conexión con la base de datos.';
}

/**
 * Crea la cuenta en Supabase Auth (`auth.users`) y vincula el perfil en la
 * tabla `usuario` del proyecto OmniTravel (rol viajero, RNF-06/09).
 *
 * La vinculación falla en silencio (aviso, no error) mientras el equipo de
 * datos aprueba la política INSERT de RLS sobre `usuario`; la cuenta sigue
 * siendo válida en Supabase Auth.
 */
export async function registrarCuenta(
  datos: DatosRegistro,
): Promise<ResultadoRegistro> {
  const email = datos.email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signUp({
    email,
    password: datos.contrasena,
  });

  if (error) {
    throw new Error(mensajeErrorSupabase(error as ErrorSupabase));
  }

  const idAuth = data.user?.id ?? null;

  // Si el proyecto exige confirmación de correo (MAILER_AUTOCONFIRM fuera),
  // signUp no devuelve sesión: avisamos el paso pendiente sin bloquear la
  // vinculación del perfil (la política INSERT es pública).
  const avisos: string[] = [];
  if (!data.session) {
    avisos.push(
      'Tu cuenta fue creada. Revisa tu correo y confírmala antes de ' +
        'iniciar sesión.',
    );
  }

  // Vinculación del perfil de dominio (best-effort, requiere política RLS).
  let perfil: UsuarioOmniTravel | null = null;

  if (idAuth) {
    const [hash, rolId] = await Promise.all([
      hashearContrasena(datos.contrasena),
      idRolViajero(),
    ]);
    const { data: fila, error: errorInsert } = await supabase
      .from(TABLA_USUARIOS)
      .insert({
        email,
        password_hash: hash,
        rol_id: rolId,
        estado_cuenta: 'activo',
        auth_user_id: idAuth,
      })
      .select()
      .maybeSingle();

    if (errorInsert) {
      avisos.push(
        'La sincronización de tu perfil con la base de datos queda ' +
          'pendiente de una configuración del equipo (política RLS de ' +
          'usuario).',
      );
    } else {
      perfil = (fila as UsuarioOmniTravel | null) ?? null;
    }
  }

  return {
    email,
    idAuthSupabase: idAuth,
    perfil,
    aviso: avisos.length > 0 ? avisos.join(' ') : undefined,
  };
}

/**
 * Inicia sesión contra Supabase Auth y devuelve el perfil de dominio
 * (tabla `usuario`) vinculado por `auth_user_id`. Si la política SELECT de
 * RLS aún no está aprobada se entrega solo la sesión con un aviso.
 */
export async function iniciarSesionCuenta(
  email: string,
  contrasena: string,
): Promise<ResultadoSesion> {
  const correo = email.trim().toLowerCase();

  const { data, error } = await supabase.auth.signInWithPassword({
    email: correo,
    password: contrasena,
  });

  if (error) {
    throw new Error(mensajeErrorSupabase(error as ErrorSupabase));
  }

  const idAuth = data.user?.id ?? null;
  if (!idAuth) {
    return {
      perfil: null,
      idAuthSupabase: null,
      aviso: 'Sesión iniciada sin perfil asociado.',
    };
  }

  const { data: perfil, error: errorPerfil } = await supabase
    .from(TABLA_USUARIOS)
    .select('*')
    .eq('auth_user_id', idAuth)
    .maybeSingle();

  if (errorPerfil) {
    return {
      perfil: null,
      idAuthSupabase: idAuth,
      aviso:
        'Sesión iniciada. Tu perfil de la base de datos está pendiente de ' +
        'configuración del equipo (política RLS de usuario).',
    };
  }

  return {
    perfil: (perfil as UsuarioOmniTravel | null) ?? null,
    idAuthSupabase: idAuth,
  };
}

/** Obtiene la fila de `usuario` vinculada a un id de Supabase Auth. */
export async function obtenerPerfilPorIdAuth(
  idAuth: string,
): Promise<UsuarioOmniTravel | null> {
  const { data, error } = await supabase
    .from(TABLA_USUARIOS)
    .select('*')
    .eq('auth_user_id', idAuth)
    .maybeSingle();

  if (error) {
    throw new Error(mensajeErrorSupabase(error as ErrorSupabase));
  }
  return (data as UsuarioOmniTravel | null) ?? null;
}
