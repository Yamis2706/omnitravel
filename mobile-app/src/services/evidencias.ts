import * as ImagePicker from 'expo-image-picker';
import { supabase } from './supabase';

/**
 * Evidencia fotográfica del Proceso 1 (U09).
 *
 * Flujo: image-picker captura con `base64: true` (compatible con Expo Go y
 * con el APK de EAS) → se decodifica a ArrayBuffer → se sube al bucket
 * público `evidencia` en la carpeta `<auth.uid()>/…`, única ruta que las
 * políticas de Storage aceptan. El bucket valida en servidor el peso (5 MB)
 * y los MIME de imagen (RNF-29); aquí además se degrada con gracia: si la
 * subida falla, el reporte se envía igual sin foto.
 */

export const BUCKET_EVIDENCIA = 'evidencia';

/** Foto capturada y lista para subir. */
export interface FotoCapturada {
  uri: string;
  base64: string;
  mimeType: string;
}

export type OrigenFoto = 'camara' | 'galeria';

const ERROR_PERMISO_CAMARA =
  'Necesitamos permiso de cámara para tomar la foto de evidencia.';
const ERROR_PERMISO_GALERIA = 'Necesitamos permiso para acceder a tus fotos.';
const ERROR_LECTURA =
  'No pudimos leer la imagen seleccionada. Intenta con otra.';

/**
 * Abre la cámara o la galería y devuelve la foto comprimida en base64.
 * `null` cuando la persona cancela la captura.
 */
export async function capturarFoto(
  origen: OrigenFoto,
): Promise<FotoCapturada | null> {
  if (origen === 'camara') {
    const permiso = await ImagePicker.requestCameraPermissionsAsync();
    if (!permiso.granted) {
      throw new Error(ERROR_PERMISO_CAMARA);
    }
  } else {
    const permiso = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permiso.granted) {
      throw new Error(ERROR_PERMISO_GALERIA);
    }
  }

  const resultado =
    origen === 'camara'
      ? await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          quality: 0.4,
          base64: true,
        })
      : await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          quality: 0.4,
          base64: true,
        });

  if (resultado.canceled || resultado.assets.length === 0) {
    return null;
  }

  const activo = resultado.assets[0];
  if (!activo.base64) {
    throw new Error(ERROR_LECTURA);
  }

  return {
    uri: activo.uri,
    base64: activo.base64,
    mimeType: activo.mimeType ?? 'image/jpeg',
  };
}

/** Decodifica base64 a ArrayBuffer (Hermes incluye `atob` desde RN 0.74). */
export function base64AArrayBuffer(base64: string): ArrayBuffer {
  const binario = atob(base64);
  const bytes = new Uint8Array(binario.length);
  for (let indice = 0; indice < binario.length; indice += 1) {
    bytes[indice] = binario.charCodeAt(indice);
  }
  return bytes.buffer;
}

function extensionDe(mimeType: string): string {
  if (mimeType.includes('png')) {
    return 'png';
  }
  if (mimeType.includes('webp')) {
    return 'webp';
  }
  return 'jpg';
}

/**
 * Sube la foto al bucket `evidencia` bajo la carpeta del usuario autenticado
 * y devuelve la ruta (`storage_key`) que se persiste en la tabla `evidencia`.
 */
export async function subirEvidencia(
  foto: FotoCapturada,
): Promise<{ storageKey: string }> {
  const { data, error } = await supabase.auth.getUser();
  if (error || !data.user) {
    throw new Error(
      'Necesitas una sesión activa para adjuntar la foto de evidencia.',
    );
  }

  const extension = extensionDe(foto.mimeType);
  const storageKey = `${data.user.id}/${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${extension}`;

  const { error: errorSubida } = await supabase.storage
    .from(BUCKET_EVIDENCIA)
    .upload(storageKey, base64AArrayBuffer(foto.base64), {
      contentType: foto.mimeType,
      upsert: false,
    });

  if (errorSubida) {
    throw new Error(
      'No pudimos subir la foto. Revisa tu conexión e inténtalo de nuevo.',
    );
  }

  return { storageKey };
}

/** URL pública de una evidencia (bucket de lectura comunitaria). */
export function urlPublicaEvidencia(storageKey: string): string {
  const { data } = supabase.storage
    .from(BUCKET_EVIDENCIA)
    .getPublicUrl(storageKey);
  return data.publicUrl;
}
