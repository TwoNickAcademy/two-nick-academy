import crypto from 'crypto'
import { nanoid } from 'nanoid'
import { prisma } from '../../lib/prisma'
import { invalidateMembershipCache } from '../../lib/redis'
import { emitToUser } from '../../lib/socket'
import {
  createBinanceOrder,
  verifyWebhookSignature,
  PLAN_PRICES,
  PLAN_DURATION_DAYS,
} from '../../lib/binance'
import {
  binanceWebhookSchema,
  binanceWebhookDataSchema,
  type CreateOrderInput,
  type ManualPaymentInput,
} from './payments.schema'
import { MembershipLevel } from '@prisma/client'

// ─── Crear Orden de Pago ──────────────────────────────────────────

export async function createPaymentOrder(userId: string, input: CreateOrderInput) {
  const planInfo = PLAN_PRICES[input.plan]
  if (!planInfo) {
    throw Object.assign(new Error('Plan no disponible'), { statusCode: 400 })
  }

  // ID único de nuestra orden: encodes el userId + plan para recuperarlo en el webhook
  // Formato: TN-{plan}-{userId_prefix}-{random}
  const merchantTradeNo = `TN-${input.plan}-${userId.slice(0, 8)}-${nanoid(8)}`

  // Registrar la orden en DB como PENDING antes de redirigir
  await prisma.payment.create({
    data: {
      userId,
      provider:        'BINANCE_PAY',
      providerTxId:    merchantTradeNo,     // se actualiza al confirmar
      amountUsd:       planInfo.price,
      planPurchased:   input.plan as MembershipLevel,
      durationDays:    PLAN_DURATION_DAYS[input.plan] ?? 30,
      status:          'PENDING',
    },
  })

  // Crear orden en Binance Pay
  const result = await createBinanceOrder({
    merchantTradeNo,
    plan:      input.plan,
    userId,
    returnUrl: input.returnUrl ?? 'https://app.twonick.academy/payment/success',
    cancelUrl: input.cancelUrl ?? 'https://app.twonick.academy/payment/cancel',
  })

  return {
    merchantTradeNo,
    checkoutUrl: result.checkoutUrl,
    qrcodeLink:  result.qrcodeLink,
    expireTime:  result.expireTime,
    plan:        input.plan,
    amountUsd:   planInfo.price,
  }
}

// ─── Procesar Webhook de Binance Pay ─────────────────────────────

export async function processWebhook(
  rawBody: string,
  headers: {
    timestamp: string
    nonce:     string
    signature: string
  },
) {
  // 1. Verificar firma HMAC-SHA512 (seguridad crítica)
  const isValid = verifyWebhookSignature(
    headers.timestamp,
    headers.nonce,
    rawBody,
    headers.signature,
  )
  if (!isValid) {
    throw Object.assign(new Error('Firma de webhook inválida'), { statusCode: 401 })
  }

  // 2. Parsear el cuerpo del webhook
  const parsed = binanceWebhookSchema.safeParse(JSON.parse(rawBody))
  if (!parsed.success) {
    throw Object.assign(new Error('Payload de webhook malformado'), { statusCode: 400 })
  }

  const webhook = parsed.data

  // Solo procesar pagos exitosos
  if (webhook.bizType !== 'PAY' || webhook.bizStatus !== 'PAY_SUCCESS') {
    return { message: 'Evento ignorado', status: webhook.bizStatus }
  }

  // 3. Parsear el campo `data` (JSON string dentro del JSON)
  const dataRaw = JSON.parse(webhook.data)
  const dataParsed = binanceWebhookDataSchema.safeParse(dataRaw)
  if (!dataParsed.success) {
    throw Object.assign(new Error('Campo data del webhook inválido'), { statusCode: 400 })
  }

  const payData = dataParsed.data

  // 4. Idempotencia: si ya existe con transactionId de Binance, ignorar
  const existing = await prisma.payment.findFirst({
    where: {
      OR: [
        { providerTxId: payData.transactionId },
        { providerTxId: payData.merchantTradeNo, status: 'CONFIRMED' },
      ],
    },
  })
  if (existing) {
    return { message: 'Pago ya procesado', paymentId: existing.id }
  }

  // 5. Buscar el pago PENDING con nuestro merchantTradeNo
  const pendingPayment = await prisma.payment.findFirst({
    where: {
      providerTxId: payData.merchantTradeNo,
      status:       'PENDING',
    },
  })

  const userId = pendingPayment?.userId ?? payData.merchantUserId
  const plan   = pendingPayment?.planPurchased ?? extractPlanFromTradeNo(payData.merchantTradeNo)

  if (!plan) {
    throw Object.assign(new Error('No se pudo determinar el plan del pago'), { statusCode: 400 })
  }

  // 6. Transacción atómica en DB
  const result = await prisma.$transaction(async (tx) => {
    // a. Confirmar o crear el pago
    const payment = pendingPayment
      ? await tx.payment.update({
          where: { id: pendingPayment.id },
          data: {
            providerTxId: payData.transactionId,  // ID real de Binance
            status:       'CONFIRMED',
            amountUsd:    parseFloat(payData.totalFee),
            webhookRaw:   JSON.parse(rawBody),
            confirmedAt:  new Date(),
          },
        })
      : await tx.payment.create({
          data: {
            userId,
            provider:       'BINANCE_PAY',
            providerTxId:   payData.transactionId,
            amountUsd:      parseFloat(payData.totalFee),
            planPurchased:  plan,
            durationDays:   PLAN_DURATION_DAYS[plan] ?? 30,
            status:         'CONFIRMED',
            webhookRaw:     JSON.parse(rawBody),
            confirmedAt:    new Date(),
          },
        })

    // b. Calcular nueva fecha de expiración
    //    Si ya tiene membresía activa, extender desde la fecha actual de expiración
    const currentMembership = await tx.membership.findUnique({
      where: { userId },
    })

    const baseDate =
      currentMembership?.expiryDate && currentMembership.expiryDate > new Date()
        ? currentMembership.expiryDate
        : new Date()

    const newExpiry = new Date(baseDate)
    newExpiry.setDate(newExpiry.getDate() + (PLAN_DURATION_DAYS[plan] ?? 30))

    // c. Actualizar o crear membresía
    const membership = await tx.membership.upsert({
      where:  { userId },
      create: {
        userId,
        level:      plan as MembershipLevel,
        expiryDate: newExpiry,
        startedAt:  new Date(),
      },
      update: {
        level:      plan as MembershipLevel,
        expiryDate: newExpiry,
      },
    })

    // d. Comisión de referido (si aplica)
    const user = await tx.user.findUnique({
      where:  { id: userId },
      select: { referredById: true },
    })

    if (user?.referredById) {
      const commissionPct = 10
      const commissionUsd = parseFloat(payData.totalFee) * (commissionPct / 100)

      await tx.referral.create({
        data: {
          referrerId:    user.referredById,
          referredId:    userId,
          paymentId:     payment.id,
          commissionPct,
          commissionUsd,
          status:        'PENDING',
        },
      })

      // Notificar al referidor de su comisión
      emitToUser(user.referredById, 'referral:commission', {
        commissionUsd: commissionUsd.toFixed(2),
        fromUser:      userId,
        plan,
      })
    }

    return { payment, membership }
  })

  // 7. Invalidar cache de membresía
  await invalidateMembershipCache(userId)

  // 8. Notificar al usuario via Socket.io
  emitToUser(userId, 'membership:upgraded', {
    newLevel:   plan,
    expiryDate: result.membership.expiryDate,
    message:    `¡Bienvenido a Two-Nick ${plan}! Tu acceso ya está activo.`,
  })

  return {
    message:   'Pago procesado correctamente',
    paymentId: result.payment.id,
    newLevel:  plan,
  }
}

// ─── Historial de pagos del usuario ──────────────────────────────

export async function getPaymentHistory(userId: string, page = 1, limit = 10) {
  const [payments, total] = await Promise.all([
    prisma.payment.findMany({
      where:   { userId },
      orderBy: { createdAt: 'desc' },
      skip:    (page - 1) * limit,
      take:    limit,
      select: {
        id:            true,
        provider:      true,
        amountUsd:     true,
        planPurchased: true,
        durationDays:  true,
        status:        true,
        confirmedAt:   true,
        createdAt:     true,
      },
    }),
    prisma.payment.count({ where: { userId } }),
  ])

  return {
    payments: payments.map((p) => ({
      ...p,
      amountUsd: Number(p.amountUsd),
    })),
    total,
    page,
    lastPage: Math.ceil(total / limit),
  }
}

// ─── Pago manual (admin) ──────────────────────────────────────────

export async function registerManualPayment(input: ManualPaymentInput) {
  const result = await prisma.$transaction(async (tx) => {
    const payment = await tx.payment.create({
      data: {
        userId:        input.userId,
        provider:      'MANUAL',
        amountUsd:     input.amountUsd,
        planPurchased: input.plan as MembershipLevel,
        durationDays:  input.durationDays,
        status:        'CONFIRMED',
        confirmedAt:   new Date(),
        webhookRaw:    input.notes ? { notes: input.notes } : undefined,
      },
    })

    const newExpiry = new Date()
    newExpiry.setDate(newExpiry.getDate() + input.durationDays)

    const membership = await tx.membership.upsert({
      where:  { userId: input.userId },
      create: {
        userId:     input.userId,
        level:      input.plan as MembershipLevel,
        expiryDate: newExpiry,
        startedAt:  new Date(),
      },
      update: {
        level:      input.plan as MembershipLevel,
        expiryDate: newExpiry,
      },
    })

    return { payment, membership }
  })

  await invalidateMembershipCache(input.userId)

  emitToUser(input.userId, 'membership:upgraded', {
    newLevel:   input.plan,
    expiryDate: result.membership.expiryDate,
    message:    `¡Tu membresía ${input.plan} fue activada manualmente!`,
  })

  return {
    payment:    result.payment,
    membership: result.membership,
  }
}

// ─── Helper interno ───────────────────────────────────────────────
// Extrae el plan del merchantTradeNo si no hay pago PENDING
// Formato: TN-{PLAN}-{userId_prefix}-{random}

function extractPlanFromTradeNo(tradeNo: string): MembershipLevel | null {
  const parts = tradeNo.split('-')
  const plan  = parts[1] as MembershipLevel | undefined
  const valid: MembershipLevel[] = ['VIP', 'SUPREMO', 'MASTER']
  return plan && valid.includes(plan) ? plan : null
}
