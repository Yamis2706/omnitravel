import { Ionicons } from '@expo/vector-icons';
import type { ReactNode } from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import type { IconName } from '../services/types';
import {
  colors,
  fontSize,
  fontWeight,
  radii,
  spacing,
  TOUCH_TARGET,
} from '../utils/theme';

interface CampoTextoProps {
  etiqueta: string;
  icono: IconName;
  placeholder: string;
  value: string;
  onChangeText: (texto: string) => void;
  error?: string;
  ayuda?: string;
  secureTextEntry?: boolean;
  keyboardType?:
    'default' | 'email-address' | 'numeric' | 'decimal-pad' | 'number-pad';
  autoCapitalize?: 'none' | 'sentences' | 'words';
  autoComplete?:
    'name' | 'email' | 'password' | 'new-password' | 'current-password' | 'off';
  accesorio?: ReactNode;
  /** Área de texto de varias líneas (descripciones de reportes, motivos). */
  multilinea?: boolean;
}

/**
 * Campo de texto accesible compartido por el flujo de cuenta
 * (U01/U02 inicio de sesión y U03 registro): etiqueta explícita, errores por
 * región viva y área táctil mínima (RNF-11/14).
 */
export function CampoTexto({
  etiqueta,
  icono,
  placeholder,
  value,
  onChangeText,
  error,
  ayuda,
  secureTextEntry,
  keyboardType,
  autoCapitalize,
  autoComplete,
  accesorio,
  multilinea = false,
}: CampoTextoProps) {
  return (
    <View>
      <Text style={estilos.etiqueta}>{etiqueta}</Text>
      <View
        style={[
          estilos.contenedor,
          multilinea ? estilos.contenedorMultilinea : null,
          error ? estilos.contenedorError : null,
        ]}
      >
        <Ionicons
          name={icono}
          size={18}
          color={colors.textSecondary}
          style={multilinea ? estilos.iconoMultilinea : undefined}
        />
        <TextInput
          style={[estilos.input, multilinea ? estilos.inputMultilinea : null]}
          placeholder={placeholder}
          placeholderTextColor={colors.textMuted}
          value={value}
          onChangeText={onChangeText}
          secureTextEntry={secureTextEntry}
          keyboardType={keyboardType}
          autoCapitalize={autoCapitalize}
          autoComplete={autoComplete}
          accessibilityLabel={etiqueta}
          multiline={multilinea}
          numberOfLines={multilinea ? 3 : undefined}
          textAlignVertical={multilinea ? 'top' : 'center'}
        />
        {accesorio}
      </View>
      {error ? (
        <Text style={estilos.textoError} accessibilityLiveRegion="polite">
          {error}
        </Text>
      ) : ayuda ? (
        <Text style={estilos.textoAyuda}>{ayuda}</Text>
      ) : null}
    </View>
  );
}

const estilos = StyleSheet.create({
  etiqueta: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.medium,
    color: colors.textPrimary,
    marginBottom: spacing.xs,
  },
  contenedor: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    borderWidth: 1,
    borderColor: colors.border,
    borderRadius: radii.md,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.white,
  },
  contenedorError: {
    borderColor: colors.danger,
  },
  contenedorMultilinea: {
    alignItems: 'flex-start',
    paddingVertical: spacing.xs,
  },
  iconoMultilinea: {
    marginTop: spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: fontSize.md,
    color: colors.textPrimary,
    paddingVertical: spacing.sm,
  },
  inputMultilinea: {
    minHeight: 72,
  },
  textoError: {
    fontSize: fontSize.xs,
    color: colors.danger,
    marginTop: spacing.xs,
  },
  textoAyuda: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    marginTop: spacing.xs,
  },
  accesorio: {
    width: TOUCH_TARGET,
    height: TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
});
