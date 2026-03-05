import { prisma } from '../../lib/prisma'
import { MembershipLevel, ProductType } from '@prisma/client'

// ─── Listar productos (usuarios) ─────────────────────────────────

export async function listProducts(userLevel: MembershipLevel, type?: ProductType) {
  const LEVEL_RANK: Record<MembershipLevel, number> = {
    GENERAL: 0, VIP: 1, SUPREMO: 2, MASTER: 3,
  }
  const userRank = LEVEL_RANK[userLevel] ?? 0

  const products = await prisma.product.findMany({
    where: {
      isActive: true,
      ...(type ? { type } : {}),
    },
    orderBy: [{ orderIndex: 'asc' }, { createdAt: 'desc' }],
  })

  return products.map(p => ({
    ...p,
    isAccessible: (LEVEL_RANK[p.minLevel] ?? 0) <= userRank,
  }))
}

// ─── Obtener producto por ID ──────────────────────────────────────

export async function getProduct(id: string) {
  const product = await prisma.product.findUnique({ where: { id } })
  if (!product) throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 })
  return product
}

// ─── Admin: crear producto ────────────────────────────────────────

export async function createProduct(data: {
  name: string
  description?: string
  type: ProductType
  price: number
  currency?: string
  minLevel?: MembershipLevel
  isActive?: boolean
  isFeatured?: boolean
  imageUrl?: string
  metadata?: object
  orderIndex?: number
}) {
  return prisma.product.create({
    data: {
      name:        data.name,
      description: data.description,
      type:        data.type,
      price:       data.price,
      currency:    data.currency ?? 'USD',
      minLevel:    data.minLevel ?? 'GENERAL',
      isActive:    data.isActive ?? true,
      isFeatured:  data.isFeatured ?? false,
      imageUrl:    data.imageUrl,
      metadata:    data.metadata ?? {},
      orderIndex:  data.orderIndex ?? 0,
    },
  })
}

// ─── Admin: actualizar producto ───────────────────────────────────

export async function updateProduct(id: string, data: Partial<{
  name: string
  description: string
  type: ProductType
  price: number
  currency: string
  minLevel: MembershipLevel
  isActive: boolean
  isFeatured: boolean
  imageUrl: string
  metadata: object
  orderIndex: number
}>) {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 })

  return prisma.product.update({ where: { id }, data })
}

// ─── Admin: eliminar producto ─────────────────────────────────────

export async function deleteProduct(id: string) {
  const existing = await prisma.product.findUnique({ where: { id } })
  if (!existing) throw Object.assign(new Error('Producto no encontrado'), { statusCode: 404 })

  await prisma.product.delete({ where: { id } })
  return { deleted: true, id }
}

// ─── Admin: listar todos (incluyendo inactivos) ───────────────────

export async function listAllProducts(type?: ProductType) {
  return prisma.product.findMany({
    where: type ? { type } : {},
    orderBy: [{ type: 'asc' }, { orderIndex: 'asc' }],
  })
}
