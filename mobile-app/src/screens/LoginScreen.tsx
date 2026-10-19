import { Ionicons } from '@expo/vector-icons';
import { useState } from 'react';
import {
  AccessibilityInfo,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { BrandMark } from '../components/BrandMark';
import { CampoTexto } from '../components/CampoTexto';
import { iniciarSesionCuenta, rolDeUsuarioId } from '../services/api/auth';
import type { RootStackParamList } from '../navigation/types';
import { useProfileStore } from '../store/profileStore';
import { colors, fontSize, fontWeight, spacing } from '../utils/theme';

interface Errores {
  email?: string;
  contrasena?: string;
}

/** Nombre amable derivado del correo cuando la fila `usuario` aún no se lee. */
function nombreDesdeEmail(email: string): string {
  const usuario = email.split('@')[0]?.replace(/[^a-zA-ZáéíóúÁÉÍÓÚñÑ]+/g, ' ');
  const limpio = usuario?.trim();
  if (!limpio) {
    return 'Viajero OmniTravel';
  }
  return limpio
    .split(' ')
    .map((parte) => parte.charAt(0).toUpperCase() + parte.slice(1))
    .join(' ');
}

/**
 * U01/U02 — Inicio de sesión.
 * Autentica contra el backend (`POST /auth/login`), que devuelve el JWT y el
 * perfil de dominio (tabla `usuario`, con su rol). El perfil de accesibilidad
 * sigue siendo local (Ley 1581).
 */
export function LoginScreen() {
  const guardarPerfil = useProfileStore((estado) => estado.guardarPerfil);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [ingresando, setIngresando] = useState(false);
  const [email, setEmail] = useState('');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [errores, setErrores] = useState<Errores>({});

  const enviar = async () => {
    const nuevosErrores: Errores = {};
    if (!email.trim()) {
      nuevosErrores.email = 'Ingresa tu correo electrónico.';
    }
    if (!contrasena) {
      nuevosErrores.contrasena = 'Ingresa tu contraseña.';
    }

    setErrores(nuevosErrores);

    if (Object.keys(nuevosErrores).length > 0) {
      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(
          'Hay errores en el formulario. Revisa los campos marcados.',
        );
      }
      return;
    }

    setIngresando(true);
    try {
      const resultado = await iniciarSesionCuenta(email.trim(), contrasena);

      // El perfil de accesibilidad sigue siendo 100 % local (Ley 1581).
      guardarPerfil({
        nombre:
          resultado.perfil?.email?.split('@')[0] ?? nombreDesdeEmail(email),
        necesidades: [],
        filtrosActivos: [],
        rol: rolDeUsuarioId(resultado.perfil?.rol_id),
      });

      if (Platform.OS === 'ios') {
        AccessibilityInfo.announceForAccessibility(
          'Sesión iniciada. Bienvenido de nuevo.',
        );
      }

      if (resultado.aviso) {
        Alert.alert('Sesión iniciada', resultado.aviso);
      }
    } catch (error) {
      Alert.alert(
        'No se pudo iniciar sesión',
        (error as Error)?.message ?? 'Verifica tu conexión e intenta de nuevo.',
      );
    } finally {
      setIngresando(false);
    }
  };

  return (
    <SafeAreaView style={estilos.pantalla} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={estilos.pantalla}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={estilos.contenido}
          keyboardShouldPersistTaps="handled"
        >
          <BrandMark tamano={72} />

          <View style={estilos.encabezado}>
            <Text style={estilos.titulo}>Bienvenido de nuevo</Text>
            <Text style={estilos.subtitulo}>
              Continúa explorando lugares accesibles
            </Text>
          </View>

          <View style={estilos.campos}>
            <CampoTexto
              etiqueta="Email"
              icono="mail-outline"
              placeholder="tucorreo@ejemplo.com"
              value={email}
              onChangeText={setEmail}
              keyboardType="email-address"
              autoCapitalize="none"
              autoComplete="email"
              error={errores.email}
            />
            <CampoTexto
              etiqueta="Contraseña"
              icono="lock-closed-outline"
              placeholder="Tu contraseña"
              value={contrasena}
              onChangeText={setContrasena}
              secureTextEntry={!verContrasena}
              autoComplete="password"
              error={errores.contrasena}
              accesorio={
                <Pressable
                  onPress={() => setVerContrasena((visible) => !visible)}
                  style={estilos.botonOjo}
                  accessibilityRole="button"
                  accessibilityLabel={
                    verContrasena ? 'Ocultar contraseña' : 'Mostrar contraseña'
                  }
                >
                  <Ionicons
                    name={verContrasena ? 'eye-off-outline' : 'eye-outline'}
                    size={20}
                    color={colors.textSecondary}
                  />
                </Pressable>
              }
            />
          </View>

          <AppButton
            titulo="Iniciar sesión"
            icono="log-in-outline"
            onPress={enviar}
            cargando={ingresando}
            pistaAccesibilidad="Abre el mapa de lugares accesibles con tu cuenta"
            estilo={estilos.botonPrincipal}
          />

          <View style={estilos.pie}>
            <Text style={estilos.pieTexto}>¿Aún no tienes una cuenta?</Text>
            <Pressable
              onPress={() => navigation.goBack()}
              accessibilityRole="button"
              accessibilityLabel="Crear cuenta"
            >
              <Text style={estilos.pieEnlace}>Crear cuenta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const estilos = StyleSheet.create({
  pantalla: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contenido: {
    padding: spacing.xl,
    paddingBottom: spacing.xxl,
    gap: spacing.lg,
  },
  encabezado: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  titulo: {
    fontSize: fontSize.xl,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  subtitulo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  campos: {
    gap: spacing.md,
  },
  botonPrincipal: {
    marginTop: spacing.xs,
  },
  pie: {
    alignItems: 'center',
    gap: spacing.xs,
  },
  pieTexto: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  pieEnlace: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.bold,
    color: colors.primary,
  },
  botonOjo: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: -spacing.sm,
  },
});
