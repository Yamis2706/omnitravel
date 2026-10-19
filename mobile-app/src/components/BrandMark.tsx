import { Image, StyleSheet, View } from 'react-native';

/**
 * Marca oficial de OmniTravel (assets recortados del mockup U03 del documento
 * `docs/4. OmniTravel UI_ Mockups.pdf`): pin azul con símbolo de accesibilidad
 * y carretera + wordmark + lema. Tres variantes con el mismo asset real:
 *
 * - `pin`: solo el pin (cabeceras, avatares de marca).
 * - `lockup`: pin + letras "OmniTravel" sin lema (espacios compactos).
 * - `completo`: pin + letras + "Tu mundo, sin barreras" (bienvenida/login).
 */

const LOGO_PIN = require('../../assets/logo-pin.png') as number;
const LOGO_LOCKUP = require('../../assets/logo-lockup-sin-lema.png') as number;
const LOGO_COMPLETO = require('../../assets/logo-lockup.png') as number;

/** Relaciones de aspecto reales de los recortes (ancho / alto). */
const ASPECTO_PIN = 492 / 632;
const ASPECTO_LOCKUP = 1395 / 474;
const ASPECTO_COMPLETO = 1398 / 474;

type Variante = 'pin' | 'lockup' | 'completo';

interface Props {
  /** Alto renderizado de la marca en píxeles (las tres variantes respetan su aspecto). */
  tamano?: number;
  /** Mantiene el lema en la variante `completo` (compatibilidad con U01/U03). */
  mostrarTagline?: boolean;
  variante?: Variante;
}

const ASSETS: Record<Variante, { fuente: number; aspecto: number }> = {
  pin: { fuente: LOGO_PIN, aspecto: ASPECTO_PIN },
  lockup: { fuente: LOGO_LOCKUP, aspecto: ASPECTO_LOCKUP },
  completo: { fuente: LOGO_COMPLETO, aspecto: ASPECTO_COMPLETO },
};

export function BrandMark({
  tamano = 64,
  mostrarTagline = true,
  variante = 'pin',
}: Props) {
  const varianteFinal: Variante =
    variante === 'completo' && !mostrarTagline ? 'lockup' : variante;
  const { fuente, aspecto } = ASSETS[varianteFinal];

  return (
    <View
      style={estilos.contenedor}
      accessible
      accessibilityRole="image"
      accessibilityLabel="OmniTravel, tu mundo sin barreras"
    >
      <Image
        source={fuente}
        resizeMode="contain"
        style={{ width: Math.round(tamano * aspecto), height: tamano }}
        accessibilityIgnoresInvertColors
      />
    </View>
  );
}

const estilos = StyleSheet.create({
  contenedor: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
