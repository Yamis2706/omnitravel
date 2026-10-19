/**
 * Ajustes de seguridad leídos del entorno, en un solo lugar y fáciles de probar.
 * Los valores por defecto mantienen el comportamiento de desarrollo actual.
 */

/** Orígenes web de Expo en desarrollo (`npx expo start --web`). */
export const ORIGENES_DESARROLLO = [
  'http://localhost:8081',
  'http://localhost:19006',
];

/**
 * Orígenes permitidos por CORS. La app nativa no envía `Origin`, así que CORS
 * solo afecta a clientes web: sin CORS_ORIGINS se permiten los de Expo web.
 */
export function origenesCors(valor: string | undefined): string[] {
  const lista = (valor ?? '')
    .split(',')
    .map((origen) => origen.trim())
    .filter(Boolean);
  return lista.length > 0 ? lista : ORIGENES_DESARROLLO;
}

const SECRETOS_DE_EJEMPLO = new Set(['cambia_esto', 'changeme', 'secret']);
const LONGITUD_MINIMA_SECRETO = 32;

/**
 * Verifica JWT_SECRET al arrancar. En producción un secreto corto o de ejemplo
 * permitiría falsificar sesiones (y roles), así que se rechaza; en desarrollo
 * solo se advierte para no romper los entornos locales del equipo.
 */
export function revisarSecretoJwt(
  secreto: string | undefined,
  entorno: string | undefined,
): { error?: string; advertencia?: string } {
  if (!secreto) {
    return { error: 'Falta JWT_SECRET en backend/.env (ver .env.example).' };
  }
  const debil =
    SECRETOS_DE_EJEMPLO.has(secreto) ||
    secreto.length < LONGITUD_MINIMA_SECRETO;
  if (!debil) {
    return {};
  }
  const mensaje = `JWT_SECRET es débil: usa al menos ${LONGITUD_MINIMA_SECRETO} caracteres aleatorios (node -e "console.log(require('crypto').randomBytes(32).toString('hex'))").`;
  return entorno === 'production'
    ? { error: mensaje }
    : { advertencia: mensaje };
}

/**
 * TLS hacia PostgreSQL. Con DB_SSL_CA (certificado de la CA de AWS RDS) se
 * verifica la identidad del servidor; sin él la conexión va cifrada pero sin
 * verificar, que es el comportamiento que el equipo usa hoy.
 */
export function opcionesSsl(
  dbSsl: string | undefined,
  ca: string | undefined,
): false | { ca?: string; rejectUnauthorized: boolean } {
  if (dbSsl !== 'true') {
    return false;
  }
  return ca
    ? { ca: ca.replace(/\\n/g, '\n'), rejectUnauthorized: true }
    : { rejectUnauthorized: false };
}

/** La telemetría externa solo se activa si el equipo define sus credenciales. */
export function telemetriaActiva(entorno: NodeJS.ProcessEnv): boolean {
  return Boolean(entorno.OBSERVE_APP_KEY && entorno.OBSERVE_APP_SECRET);
}
