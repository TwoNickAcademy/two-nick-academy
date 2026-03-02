import { createCipheriv, createDecipheriv, randomBytes, timingSafeEqual } from 'crypto'

// ─── Constantes ───────────────────────────────────────────────────
const ALGORITHM  = 'aes-256-gcm'
const IV_BYTES   = 16   // 128 bits
const TAG_BYTES  = 16   // 128 bits (GCM auth tag)
const KEY_BYTES  = 32   // 256 bits

// ─── Leer clave del entorno ───────────────────────────────────────
// MT5_ENCRYPTION_KEY debe ser un hex de 64 chars (32 bytes)

function getKey(): Buffer {
  const hex = process.env.MT5_ENCRYPTION_KEY
  if (!hex || hex.length !== 64) {
    throw new Error('MT5_ENCRYPTION_KEY inválida: debe ser un hex de 64 caracteres (32 bytes)')
  }
  return Buffer.from(hex, 'hex')
}

// ─── Cifrar un string ─────────────────────────────────────────────
// Retorna: "iv_b64:tag_b64:encrypted_b64"
// Cada llamada genera un IV aleatorio distinto (nunca reutilizar IVs)

export function encrypt(plaintext: string): string {
  const key = getKey()
  const iv  = randomBytes(IV_BYTES)

  const cipher = createCipheriv(ALGORITHM, key, iv)
  const encrypted = Buffer.concat([
    cipher.update(plaintext, 'utf-8'),
    cipher.final(),
  ])
  const tag = cipher.getAuthTag()

  return [
    iv.toString('base64'),
    tag.toString('base64'),
    encrypted.toString('base64'),
  ].join(':')
}

// ─── Descifrar un string ──────────────────────────────────────────
// Lanza error si la autenticación GCM falla (datos alterados)

export function decrypt(ciphertext: string): string {
  const key    = getKey()
  const parts  = ciphertext.split(':')

  if (parts.length !== 3) {
    throw new Error('Formato de ciphertext inválido')
  }

  const iv        = Buffer.from(parts[0]!, 'base64')
  const tag       = Buffer.from(parts[1]!, 'base64')
  const encrypted = Buffer.from(parts[2]!, 'base64')

  if (iv.length !== IV_BYTES || tag.length !== TAG_BYTES) {
    throw new Error('IV o tag de longitud incorrecta')
  }

  const decipher = createDecipheriv(ALGORITHM, key, iv)
  decipher.setAuthTag(tag)

  const decrypted = Buffer.concat([
    decipher.update(encrypted),
    decipher.final(),         // lanza si el tag no coincide
  ])

  return decrypted.toString('utf-8')
}

// ─── Comparación segura de strings (anti timing-attack) ──────────

export function safeCompare(a: string, b: string): boolean {
  try {
    return timingSafeEqual(Buffer.from(a, 'utf-8'), Buffer.from(b, 'utf-8'))
  } catch {
    return false
  }
}
