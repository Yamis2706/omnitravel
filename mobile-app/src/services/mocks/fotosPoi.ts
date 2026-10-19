import type { ImageSourcePropType } from 'react-native';

/**
 * Fotos ilustrativas de los lugares de demostración (U04).
 *
 * La BD del equipo todavía no almacena fotografías de los POI (las evidencias
 * de la tabla `evidencia` pertenecen a reportes, no a lugares). Para que el
 * feed conserve el diseño de los mockups oficiales, estas tres fotos se
 * recortaron de los propios mockups y se asocian por nombre de lugar: solo
 * aparecen cuando el POI se llama exactamente igual que el lugar del mockup.
 * El resto de tarjetas muestra un bloque con el icono de su categoría
 * (sin inventar imágenes ajenas al lugar).
 */
const FOTOS_POR_NOMBRE: Record<string, ImageSourcePropType> = {
  'cafe del parque': require('../../../assets/photos/cafe-del-parque.jpg'),
  'museo del quindio': require('../../../assets/photos/museo-del-quindio.jpg'),
  'hotel mocawa': require('../../../assets/photos/hotel-mocawa.jpg'),
};

/** Normaliza un nombre (sin acentos, minúsculas) para la búsqueda. */
function claveDeNombre(nombre: string): string {
  return nombre
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/** Foto ilustrativa del lugar si coincide con un mockup (o undefined). */
export function fotoDePoi(nombre: string): ImageSourcePropType | undefined {
  return FOTOS_POR_NOMBRE[claveDeNombre(nombre)];
}
