import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
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
import { SafeAreaView } from 'react-native-safe-area-context';
import { AppButton } from '../components/AppButton';
import { BrandMark } from '../components/BrandMark';
import { CampoTexto } from '../components/CampoTexto';
import type { RootStackParamList } from '../navigation/types';
import { iniciarSesionCuenta, rolDeUsuarioId } from '../services/api/auth';
import { uriFotoDePerfilGuardada } from '../services/fotoPerfil';
import { useProfileStore } from '../store/profileStore';
import { colors, fontSize, fontWeight, radii, spacing } from '../utils/theme';

/** Rol elegido ANTES de autenticar en esta pantalla (U01). */
type RolElegido = 'viajero' | 'administrador';

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

const OPCIONES_ROL: {
  rol: RolElegido;
  titulo: string;
  descripcion: string;
  icono: keyof typeof Ionicons.glyphMap;
}[] = [
  {
    rol: 'viajero',
    titulo: 'Viajero / Comunidad',
    descripcion:
      'Explora lugares accesibles, guarda favoritos y reporta barreras con la comunidad.',
    icono: 'accessibility-outline',
  },
  {
    rol: 'administrador',
    titulo: 'Administrador / Moderación',
    descripcion:
      'Revisa, verifica o rechaza los reportes de accesibilidad de la comunidad.',
    icono: 'shield-checkmark-outline',
  },
];

/**
 * U01/U02 — Inicio de sesión con selección previa de rol.
 *
 * Paso 1: la persona elige cómo quiere entrar (viajero/comunidad o
 * administración). Paso 2: credenciales contra el backend (`POST /auth/login`, JWT).
 *
 * El rol EFECTIVO siempre se valida contra la fila `usuario` de la BD
 * (`rol_id`): elegir «Administrador» sin permisos no otorga nada, solo
 * informa con transparencia (mínimo privilegio, RNF-09). La cuenta se guarda
 * cifrada en el dispositivo para entrar la próxima vez sin registrarse.
 */
export function LoginScreen() {
  const guardarPerfil = useProfileStore((estado) => estado.guardarPerfil);
  const establecerFoto = useProfileStore((estado) => estado.establecerFoto);
  const recordarEmail = useProfileStore((estado) => estado.recordarEmail);
  const ultimoEmail = useProfileStore((estado) => estado.ultimoEmail);
  const navigation =
    useNavigation<NativeStackNavigationProp<RootStackParamList>>();

  const [rolElegido, setRolElegido] = useState<RolElegido | null>(null);
  const [ingresando, setIngresando] = useState(false);
  const [email, setEmail] = useState(ultimoEmail ?? '');
  const [contrasena, setContrasena] = useState('');
  const [verContrasena, setVerContrasena] = useState(false);
  const [errores, setErrores] = useState<Errores>({});

  const anunciar = (mensaje: string) => {
    if (Platform.OS === 'ios') {
      AccessibilityInfo.announceForAccessibility(mensaje);
    }
  };

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
      anunciar('Hay errores en el formulario. Revisa los campos marcados.');
      return;
    }

    setIngresando(true);
    try {
      const resultado = await iniciarSesionCuenta(email.trim(), contrasena);

      // Rol efectivo: la BD manda; la elección solo orienta la experiencia.
      const rolEfectivo = rolDeUsuarioId(resultado.perfil?.rol_id);
      const esModerador =
        rolEfectivo === 'moderador' || rolEfectivo === 'administrador';

      // Id de la cuenta (dueña de preferencias y foto local): la fila `usuario`.
      const idCuenta =
        resultado.perfil?.id_usuario != null
          ? String(resultado.perfil.id_usuario)
          : undefined;

      // El perfil de accesibilidad sigue siendo 100 % local (Ley 1581).
      guardarPerfil({
        nombre:
          resultado.perfil?.email?.split('@')[0] ?? nombreDesdeEmail(email),
        necesidades: [],
        filtrosActivos: [],
        rol: rolEfectivo,
        idCuenta,
      });

      // La foto volvió a la sesión: cada cuenta tiene SU archivo en el
      // dispositivo y aquí se recupera (nunca se comparte entre cuentas).
      if (idCuenta) {
        const uriGuardada = uriFotoDePerfilGuardada(idCuenta);
        if (uriGuardada) {
          establecerFoto(uriGuardada);
        }
      }

      // "Entrar la próxima vez sin registrarse": correo recordado y JWT
      // persistido cifrado en el dispositivo (expo-secure-store).
      recordarEmail(email.trim());

      anunciar('Sesión iniciada. Bienvenido de nuevo.');

      if (rolElegido === 'administrador' && !esModerador) {
        const mensaje =
          'Tu cuenta no tiene permisos de moderación en la base de datos: ' +
          'entrarás con tu rol real.';
        Alert.alert('Rol verificado en la BD', mensaje);
      } else if (rolElegido === 'viajero' && esModerador) {
        Alert.alert(
          'Cuenta con permisos de moderación',
          'Entraste como viajero, pero tu cuenta puede abrir la consola de reportes desde el Perfil.',
        );
      } else if (resultado.aviso) {
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

  /**
   * El backend aún no envía correos de recuperación: se informa con
   * transparencia en lugar de simular un envío (RNF-17).
   */
  const recuperarContrasena = () => {
    Alert.alert(
      'Recuperar contraseña',
      'La recuperación por correo todavía no está disponible. Pide a un ' +
        'administrador de OmniTravel que restablezca tu contraseña.',
    );
  };

  // ---------------------------------------------------------------------------
  // Paso 1 — ¿Cómo quieres entrar? (selección de rol)
  // ---------------------------------------------------------------------------
  if (!rolElegido) {
    return (
      <SafeAreaView style={estilos.pantalla} edges={['top', 'bottom']}>
        <ScrollView contentContainerStyle={estilos.contenido}>
          <View style={estilos.encabezado}>
            <BrandMark tamano={64} variante="completo" />
            <Text style={estilos.titulo} accessibilityRole="header">
              ¿Cómo quieres entrar?
            </Text>
            <Text style={estilos.subtitulo}>
              Elige tu rol para personalizar la experiencia
            </Text>
          </View>

          <View style={estilos.opciones}>
            {OPCIONES_ROL.map((opcion) => (
              <Pressable
                key={opcion.rol}
                onPress={() => setRolElegido(opcion.rol)}
                accessibilityRole="button"
                accessibilityLabel={opcion.titulo}
                accessibilityHint={opcion.descripcion}
                style={({ pressed }) => [
                  estilos.opcionRol,
                  pressed ? estilos.presionado : null,
                ]}
              >
                <View style={estilos.iconoRol}>
                  <Ionicons
                    name={opcion.icono}
                    size={26}
                    color={colors.primary}
                  />
                </View>
                <View style={estilos.textosRol}>
                  <Text style={estilos.tituloRol}>{opcion.titulo}</Text>
                  <Text style={estilos.descripcionRol}>
                    {opcion.descripcion}
                  </Text>
                </View>
                <Ionicons
                  name="chevron-forward"
                  size={20}
                  color={colors.textMuted}
                />
              </Pressable>
            ))}
          </View>

          <View style={estilos.notaPrivacidad}>
            <Ionicons
              name="lock-closed-outline"
              size={16}
              color={colors.success}
            />
            <Text style={estilos.textoNota}>
              Tus datos de accesibilidad se guardan cifrados solo en este
              teléfono (Ley 1581).
            </Text>
          </View>

          <View style={estilos.pie}>
            <Text style={estilos.pieTexto}>¿Aún no tienes una cuenta?</Text>
            <Pressable
              onPress={() => navigation.navigate('Registro')}
              accessibilityRole="button"
              accessibilityLabel="Crear una cuenta"
              style={estilos.botonCrear}
            >
              <Text style={estilos.pieEnlace}>Crear una cuenta</Text>
            </Pressable>
          </View>
        </ScrollView>
      </SafeAreaView>
    );
  }

  // ---------------------------------------------------------------------------
  // Paso 2 — Credenciales del rol elegido
  // ---------------------------------------------------------------------------
  const esRolAdmin = rolElegido === 'administrador';

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
          <Pressable
            onPress={() => {
              setRolElegido(null);
              setErrores({});
            }}
            accessibilityRole="button"
            accessibilityLabel="Cambiar rol"
            accessibilityHint="Regresa a la pantalla para elegir tu rol"
            style={estilos.botonVolver}
          >
            <Ionicons name="chevron-back" size={18} color={colors.primary} />
            <Text style={estilos.textoVolver}>Cambiar rol</Text>
          </Pressable>

          <BrandMark tamano={56} variante="completo" />

          <View style={estilos.encabezado}>
            <View style={estilos.chipRol}>
              <Ionicons
                name={esRolAdmin ? 'shield-checkmark' : 'accessibility'}
                size={14}
                color={colors.primary}
              />
              <Text style={estilos.textoChipRol}>
                {esRolAdmin ? 'Acceso de moderación' : 'Acceso de viajero'}
              </Text>
            </View>
            <Text style={estilos.titulo}>Inicia sesión</Text>
            <Text style={estilos.subtitulo}>Continúa tu próxima aventura</Text>
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

          <Pressable
            onPress={recuperarContrasena}
            accessibilityRole="button"
            accessibilityLabel="¿Olvidaste tu contraseña?"
            style={estilos.enlaceOlvido}
          >
            <Text style={estilos.textoOlvido}>¿Olvidaste tu contraseña?</Text>
          </Pressable>

          <AppButton
            titulo="Iniciar sesión"
            icono="arrow-forward-outline"
            onPress={enviar}
            cargando={ingresando}
            pistaAccesibilidad={
              esRolAdmin
                ? 'Entra a la consola de reportes de la comunidad'
                : 'Abre el mapa de lugares accesibles con tu cuenta'
            }
          />

          {ultimoEmail ? (
            <Text style={estilos.notaCuenta}>
              Cuenta recordada en este dispositivo: {ultimoEmail}
            </Text>
          ) : null}

          <View style={estilos.separador}>
            <View style={estilos.linea} />
            <View style={estilos.punto} />
            <View style={estilos.linea} />
          </View>

          <View style={estilos.pie}>
            <Text style={estilos.pieTexto}>¿No tienes una cuenta?</Text>
            <Pressable
              onPress={() => navigation.navigate('Registro')}
              accessibilityRole="button"
              accessibilityLabel="Crear una cuenta"
              style={estilos.botonCrear}
            >
              <Text style={estilos.pieEnlace}>Crear una cuenta</Text>
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
    textAlign: 'center',
  },
  subtitulo: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  opciones: {
    gap: spacing.md,
  },
  opcionRol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.md,
    backgroundColor: colors.white,
    borderWidth: 1.5,
    borderColor: colors.border,
    borderRadius: radii.lg,
    padding: spacing.lg,
  },
  presionado: {
    opacity: 0.9,
  },
  iconoRol: {
    width: 52,
    height: 52,
    borderRadius: radii.pill,
    backgroundColor: colors.primarySoft,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textosRol: {
    flex: 1,
    gap: 2,
  },
  tituloRol: {
    fontSize: fontSize.md,
    fontWeight: fontWeight.bold,
    color: colors.textPrimary,
  },
  descripcionRol: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    lineHeight: 17,
  },
  notaPrivacidad: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
    backgroundColor: colors.successSoft,
    borderRadius: radii.md,
    padding: spacing.md,
  },
  textoNota: {
    flex: 1,
    fontSize: fontSize.xs,
    color: colors.textPrimary,
    lineHeight: 17,
  },
  botonVolver: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    minHeight: 32,
    alignSelf: 'flex-start',
  },
  textoVolver: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  chipRol: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.xs,
    backgroundColor: colors.primarySoft,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
  },
  textoChipRol: {
    fontSize: fontSize.xs,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  campos: {
    gap: spacing.md,
  },
  enlaceOlvido: {
    alignSelf: 'flex-end',
    minHeight: 32,
    justifyContent: 'center',
  },
  textoOlvido: {
    fontSize: fontSize.sm,
    fontWeight: fontWeight.semibold,
    color: colors.primary,
  },
  notaCuenta: {
    fontSize: fontSize.xs,
    color: colors.textSecondary,
    textAlign: 'center',
  },
  separador: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: spacing.sm,
  },
  linea: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  punto: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: colors.textMuted,
  },
  pie: {
    alignItems: 'center',
    gap: spacing.sm,
  },
  pieTexto: {
    fontSize: fontSize.sm,
    color: colors.textSecondary,
  },
  botonCrear: {
    minHeight: 44,
    borderWidth: 1.5,
    borderColor: colors.primary,
    borderRadius: radii.pill,
    paddingHorizontal: spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
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
