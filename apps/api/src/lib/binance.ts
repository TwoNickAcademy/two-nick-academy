import crypto from 'crypto'

// ─── Configuración ────────────────────────────────────────────────
const BINANCE_PAY_BASE_URL = 'https://bpay.binanceapi.com'

// Precios de cada plan en USD
export const PLAN_PRICES: Record<string, { price: number; label: string }> = {
  VIP:     { price: 49.99,  label: 'Two-Nick VIP' },
  SUPREMO: { price: 99.99,  label: 'Two-Nick Supremo' },
  MASTER:  { price: 199.99, label: 'Two-Nick Master' },
}

// Duración de cada plan en días
export const PLAN_DURATION_DAYS: Record<string, number> = {
  VIP:     30,
  SUPREMO: 30,
  MASTER:  30,
}

// ─── Firma de solicitudes salientes ──────────────────────────────
// Binance Pay: HMAC-SHA512 sobre timestamp + nonce + body

function buildRequestSignature(timestamp: string, nonce: string, body: string): string {
  const payload = `${timestamp}\n${nonce}\n${body}\n`
  return crypto
    .createHmac('sha512', process.env.BINANCE_PAY_SECRET_KEY!)
    .update(payload)
    .digest('hex')
    .toUpperCase()
}

// ─── Verificar firma de Webhook entrante ──────────────────────────
// El VPS de Binance envía: BinancePay-Timestamp, BinancePay-Nonce,
// BinancePay-Signature en los headers

export function verifyWebhookSignature(
  timestamp: string,
  nonce: string,
  body: string,
  signature: string,
): boolean {
  const expected = buildRequestSignature(timestamp, nonce, body)
  // Comparación segura contra timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(expected, 'utf-8'),
      Buffer.from(signature.toUpperCase(), 'utf-8'),
    )
  } catch {
    return false
  }
}

// ─── Crear Orden de Pago ──────────────────────────────────────────

export interface CreateOrderParams {
  merchantTradeNo: string   // ID único de la orden (generado por nosotros)
  plan:            string   // 'VIP' | 'SUPREMO' | 'MASTER'
  userId:          string   // para rastrear
  returnUrl:       string   // URL de retorno tras pago
  cancelUrl:       string
}

export interface BinanceOrderResult {
  checkoutUrl:    string
  prepayId:       string
  expireTime:     number
  qrcodeLink?:    string
}

export async function createBinanceOrder(
  params: CreateOrderParams,
): Promise<BinanceOrderResult> {
  const planInfo = PLAN_PRICES[params.plan]
  if (!planInfo) throw new Error(`Plan desconocido: ${params.plan}`)

  const timestamp = Date.now().toString()
  const nonce     = crypto.randomBytes(16).toString('hex')

  const body = JSON.stringify({
    env: {
      terminalType: 'APP',
    },
    merchantTradeNo: params.merchantTradeNo,
    orderAmount:     planInfo.price.toFixed(2),
    currency:        'USDT',
    goods: {
      goodsType:  '02',                  // Virtual goods
      goodsCategory: 'Z000',
      referenceGoodsId: params.plan,
      goodsName: planInfo.label,
      goodsDetail: `Membresía ${params.plan} - 30 días`,
    },
    returnUrl: params.returnUrl,
    cancelUrl: params.cancelUrl,
    // Metadata para identificar al usuario en el webhook
    merchantUserId: params.userId,
  })

  const signature = buildRequestSignature(timestamp, nonce, body)

  const response = await fetch(`${BINANCE_PAY_BASE_URL}/binancepay/openapi/v3/order`, {
    method: 'POST',
    headers: {
      'Content-Type':          'application/json',
      'BinancePay-Timestamp':  timestamp,
      'BinancePay-Nonce':      nonce,
      'BinancePay-Certificate-SN': process.env.BINANCE_PAY_API_KEY!,
      'BinancePay-Signature':  signature,
    },
    body,
  })

  if (!response.ok) {
    throw new Error(`Binance Pay API error: ${response.status}`)
  }

  const json = await response.json() as {
    status: string
    code:   string
    data: {
      prepayId:    string
      checkoutUrl: string
      expireTime:  number
      qrcodeLink?: string
    }
  }

  if (json.status !== 'SUCCESS') {
    throw new Error(`Binance Pay error: ${json.code}`)
  }

  return {
    prepayId:    json.data.prepayId,
    checkoutUrl: json.data.checkoutUrl,
    expireTime:  json.data.expireTime,
    qrcodeLink:  json.data.qrcodeLink,
  }
}
