import { createClient, type RedisClientType } from 'redis'

export const redis: RedisClientType = createClient({
  url: process.env.REDIS_URL,
}) as RedisClientType

redis.on('error', (err) => console.error('[Redis] Error:', err))
redis.on('connect', () => console.log('[Redis] Conectado'))

// Conectar al iniciar la app
export async function connectRedis() {
  if (!redis.isOpen) {
    await redis.connect()
  }
}

// ─── Helpers de Cuota IA ───────────────────────────────────────

export const AI_QUOTA: Record<string, number> = {
  GENERAL: 15,
  VIP: 30,
  SUPREMO: -1,  // -1 = ilimitado
  MASTER: -1,
}

export async function getAiQuotaUsed(userId: string): Promise<number> {
  const val = await redis.get(`user:${userId}:ai_quota`)
  return parseInt(val ?? '0', 10)
}

export async function incrementAiQuota(userId: string): Promise<number> {
  const key = `user:${userId}:ai_quota`
  const count = await redis.incr(key)
  // TTL hasta fin de mes si es nueva entrada
  if (count === 1) {
    const now = new Date()
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1)
    const secondsLeft = Math.floor((endOfMonth.getTime() - now.getTime()) / 1000)
    await redis.expire(key, secondsLeft)
  }
  return count
}

// ─── Cache de Membresía ───────────────────────────────────────

export async function cacheMembership(userId: string, data: object) {
  await redis.setEx(`user:${userId}:membership`, 900, JSON.stringify(data)) // 15 min
}

export async function getCachedMembership(userId: string) {
  const val = await redis.get(`user:${userId}:membership`)
  return val ? JSON.parse(val) : null
}

export async function invalidateMembershipCache(userId: string) {
  await redis.del(`user:${userId}:membership`)
}
