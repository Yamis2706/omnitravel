/**
 * Configuración del cliente Supabase.
 *
 * Las credenciales llegan por variables de entorno Expo (EXPO_PUBLIC_* se
 * inyectan en tiempo de compilación y deben existir en `mobile-app/.env`
 * antes de arrancar — copia `.env.example`):
 *
 *   EXPO_PUBLIC_SUPABASE_URL
 *   EXPO_PUBLIC_SUPABASE_ANON_KEY
 *
 * Proyecto vigente: "sarafaustino's Project" (organización OmniTravel, ref
 * `scpwrozsjpittiypvwxj`) — esquema OmniTravel con PostGIS. El proyecto
 * compartido de transporte ya NO es fuente de datos de esta app, por lo que
 * no hay credenciales de respaldo incrustadas en el código: si falta una
 * variable se interrumpe el arranque con un mensaje accionable.
 */
const URL_ENV = process.env.EXPO_PUBLIC_SUPABASE_URL;
const LLAVE_ENV = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

if (!URL_ENV) {
  throw new Error(
    'Falta EXPO_PUBLIC_SUPABASE_URL en mobile-app/.env (copia .env.example). ' +
      'Supabase no puede iniciarse sin ella.',
  );
}

if (!LLAVE_ENV) {
  throw new Error(
    'Falta EXPO_PUBLIC_SUPABASE_ANON_KEY en mobile-app/.env ' +
      '(copia .env.example). Supabase no puede iniciarse sin ella.',
  );
}

export const SUPABASE_URL = URL_ENV;
export const SUPABASE_ANON_KEY = LLAVE_ENV;
