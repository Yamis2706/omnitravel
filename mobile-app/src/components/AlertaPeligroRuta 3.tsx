import { Ionicons } from '@expo/vector-icons';
import { Modal, StyleSheet, Text, View } from 'react-native';
import { AppButton } from './AppButton';
import { colors, fontSize, fontWeight, radii, spacing } from '../utils/theme';

interface Props {
  visible: boolean;
  /** Detalle de la barrera detectada sobre el trayecto, si se conoce. */
  descripcion?: string;
  onRecalcular: () => void;
  onContinuar: () => void;
}

/**
 * S02 — Alerta de peligro en ruta.
 *
 * Se muestra cuando se reporta una barrera crítica sobre el trayecto de la
 * navegación paso a paso (U07): ofrece recalcular la ruta de inmediato o
 * continuar bajo responsabilidad de la persona (RNF-26).
 */
export function AlertaPeligroRuta({
  visible,
  descripcion,
  onRecalcular,
  onContinuar,
}: Props) {
  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onContinuar}
      accessibilityViewIsModal
    >
      <View style={estilos.fondo}>
        <View style={estilos.tarjeta}>
          <View style={estilos.icono}>
            <Ionicons name="warning" size={32} color={colors.white} />
          </View>
          <Text style={estilos.titulo} accessibilityRole="header">
            Barrera crítica en la ruta
          </Text>
          <Text style={estilos.mensaje}>
            {descripcion ??
              'Se reportó un peligro sobre tu trayecto. Recalcula la ruta para evitarlo.'}
          </Text>
          <AppButton
            titulo="Recalcular ruta"
            icono="refresh-outline"
            onPress={onRecalcular}
            estilo={estilos.boton}
            pistaAccesibilidad="Calcula una ruta alternativa que evita la barrera reportada"
          />
          <AppButton
            titulo="Continuar de todas formas"
            variante="contorno"
            onPress={onContinuar}
            estilo={estilos.boton}
            pistaAccesibilidad="Cierra la alerta y mantiene la ruta actual"
          />
        </View>
      </View>
    </Modal>
  );
}

const estilos = StyleSheet.create({
  fondo: {
    flex: 1,
    backgroundColor: colors.overlay,
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
    backgroundColor: colors.danger,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignSelf: 'stretch',
    marginTop: spacing.xs,
  },
});
