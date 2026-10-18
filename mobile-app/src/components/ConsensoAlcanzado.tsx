import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { colors, fontSize, fontWeight, radii, spacing } from '../utils/theme';

interface Props {
  visible: boolean;
  /** Nombre del lugar publicado, para el mensaje del modal. */
  poiNombre?: string;
  onCerrar: () => void;
}

/**
 * S01 — Modal "Consenso alcanzado".
 *
 * Se muestra al registrar la tercera confirmación comunitaria: el punto pasó
 * a estado publicado (RNF-18/23). `accessibilityViewIsModal` mantiene el foco
 * del lector de pantalla dentro del diálogo (RNF-12).
 */
export function ConsensoAlcanzado({ visible, poiNombre, onCerrar }: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCerrar}
      accessibilityViewIsModal
    >
      <View style={estilos.fondo}>
        <View style={estilos.tarjeta}>
          <View style={estilos.icono}>
            <Ionicons name="trophy" size={32} color={colors.white} />
          </View>
          <View
            accessible
            accessibilityLabel="Consenso alcanzado. El lugar ya es visible en el mapa público."
          >
            <Text style={estilos.titulo}>¡Consenso alcanzado!</Text>
            <Text style={estilos.mensaje}>
              {poiNombre
                ? `"${poiNombre}" recibió 3 confirmaciones de la comunidad y ya es visible en el mapa público.`
                : 'El lugar recibió 3 confirmaciones de la comunidad y ya es visible en el mapa público.'}
            </Text>
          </View>
          <AppButton
            titulo="Entendido"
            icono="checkmark-circle-outline"
            onPress={onCerrar}
            estilo={estilos.boton}
          />
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
  },
  tarjeta: {
    width: '100%',
    maxWidth: 420,
    backgroundColor: colors.white,
    borderRadius: radii.lg,
    padding: spacing.xl,
    alignItems: 'center',
    gap: spacing.sm,
  },
  icono: {
    width: 64,
    height: 64,
    borderRadius: radii.pill,
    backgroundColor: colors.success,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: spacing.xs,
  },
  titulo: {
    fontSize: fontSize.lg,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
    textAlign: 'center',
  },
  mensaje: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
    lineHeight: 20,
  },
  boton: {
    marginTop: spacing.md,
    alignSelf: 'stretch',
  },
});
