import { useState } from 'react'
import {
  View, Text, TextInput, TouchableOpacity,
  StyleSheet, KeyboardAvoidingView, Platform,
  ActivityIndicator, Alert,
} from 'react-native'
import { Link } from 'expo-router'
import { useAuthStore } from '../../src/store/auth.store'
import { Colors } from '../../src/constants/colors'

export default function LoginScreen() {
  const [email,    setEmail]    = useState('')
  const [password, setPassword] = useState('')
  const { login, isLoading }    = useAuthStore()

  async function handleLogin() {
    if (!email || !password) {
      Alert.alert('Error', 'Completa todos los campos')
      return
    }
    try {
      await login(email.trim().toLowerCase(), password)
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
