import { useState, useEffect } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native'
import { Link } from 'expo-router'
import * as SecureStore from 'expo-secure-store'
import * as LocalAuthentication from 'expo-local-authentication'
import { useAuthStore } from '../../src/store/auth.store'
import { Colors } from '../../src/constants/colors'

export default function LoginScreen() {
  const [email,        setEmail]        = useState('')
  const [password,     setPassword]     = useState('')
  const [showBioBtn,   setShowBioBtn]   = useState(false)
  const { login, hydrate, isLoading }   = useAuthStore()

  useEffect(() => {
    checkBiometric()
  }, [])

  async function checkBiometric() {
    const token      = await SecureStore.getItemAsync('accessToken')
    const bioEnabled = await SecureStore.getItemAsync('biometricEnabled')
    const hardware   = await LocalAuthentication.hasHardwareAsync()
    const enrolled   = await LocalAuthentication.isEnrolledAsync()
    setShowBioBtn(!!(token && bioEnabled === 'true' && hardware && enrolled))
  }

  async function handleBiometric() {
    const result = await LocalAuthentication.authenticateAsync({
      promptMessage:         'Accede a Two-Nick Academy',
      fallbackLabel:         'Usar contraseña',
      cancelLabel:           'Cancelar',
      disableDeviceFallback: false,
    })
    if (result.success) {
      await hydrate()
    } else {
      Alert.alert('Autenticación fallida', 'No se pudo verificar tu identidad.')
    }
  }

  async function offerBiometric() {
    const hardware = await LocalAuthentication.hasHardwareAsync()
    const enrolled = await LocalAuthentication.isEnrolledAsync()
    if (!hardware || !enrolled) return

    const types = await LocalAuthentication.supportedAuthenticationTypesAsync()
    const label = types.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)
      ? 'Face ID'
      : 'huella dactilar'

    Alert.alert(
      `Activar ${label}`,
      `¿Quieres usar ${label} para acceder más rápido la próxima vez?`,
      [
        { text: 'Ahora no', style: 'cancel' },
        {
          text: 'Activar',
          onPress: async () => {
            await SecureStore.setItemAsync('biometricEnabled', 'true')
          },
        },
      ],
    )
  }

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Completa todos los campos')
      return
    }
    try {
      await login(email.trim().toLowerCase(), password)
      // Ofrecer activar biometría tras login exitoso
      await offerBiometric()
    } catch (err: any) {
      Alert.alert('Error', err.message)
    }
  }

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      {/* Logo */}
      <View style={styles.logoContainer}>
        <Text style={styles.logoSymbol}>◆</Text>
        <Text style={styles.logoTitle}>TWO-NICK</Text>
        <Text style={styles.logoSub}>ACADEMY</Text>
        <Text style={styles.logoTagline}>Trading de Élite</Text>
      </View>

      {/* Formulario */}
      <View style={styles.form}>
        <TextInput
          style={styles.input}
          placeholder="Email"
          placeholderTextColor={Colors.textMuted}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TextInput
          style={styles.input}
          placeholder="Contraseña"
          placeholderTextColor={Colors.textMuted}
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />

        <TouchableOpacity
          style={[styles.button, isLoading && styles.buttonDisabled]}
          onPress={handleLogin}
          disabled={isLoading}
        >
          {isLoading
            ? <ActivityIndicator color="#000" />
            : <Text style={styles.buttonText}>INICIAR SESIÓN</Text>
          }
        </TouchableOpacity>

        {/* Botón biométrico — solo si ya hay sesión guardada */}
        {showBioBtn && (
          <TouchableOpacity style={styles.bioBtn} onPress={handleBiometric}>
            <Text style={styles.bioBtnIcon}>👆</Text>
            <Text style={styles.bioBtnText}>Entrar con huella dactilar</Text>
          </TouchableOpacity>
        )}

        <View style={styles.footer}>
          <Text style={styles.footerText}>¿No tienes cuenta? </Text>
          <Link href="/(auth)/register" asChild>
            <TouchableOpacity>
              <Text style={styles.footerLink}>Regístrate aquí</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    paddingHorizontal: 24,
  },
  logoContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  logoSymbol: {
    fontSize: 40,
    color: Colors.gold,
    marginBottom: 8,
  },
  logoTitle: {
    fontSize: 28,
    fontWeight: '800',
    color: Colors.text,
    letterSpacing: 4,
  },
  logoSub: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.gold,
    letterSpacing: 6,
    marginBottom: 8,
  },
  logoTagline: {
    fontSize: 13,
    color: Colors.textSecondary,
    letterSpacing: 1,
  },
  form: {
    gap: 16,
  },
  input: {
    backgroundColor: Colors.card,
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    color: Colors.text,
    fontSize: 15,
  },
  button: {
    backgroundColor: Colors.gold,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
  buttonText: {
    color: '#000',
    fontWeight: '700',
    fontSize: 15,
    letterSpacing: 1,
  },
  bioBtn: {
    flexDirection:   'row',
    alignItems:      'center',
    justifyContent:  'center',
    gap:             10,
    borderWidth:     1,
    borderColor:     Colors.gold + '66',
    borderRadius:    12,
    paddingVertical: 14,
    backgroundColor: Colors.card,
  },
  bioBtnIcon: {
    fontSize: 22,
  },
  bioBtnText: {
    color:      Colors.gold,
    fontWeight: '600',
    fontSize:   15,
  },
  footer: {
    flexDirection: 'row',
    justifyContent: 'center',
    marginTop: 8,
  },
  footerText: {
    color: Colors.textSecondary,
    fontSize: 14,
  },
  footerLink: {
    color: Colors.gold,
    fontSize: 14,
    fontWeight: '600',
  },
})
