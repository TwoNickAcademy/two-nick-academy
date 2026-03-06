import { Response, NextFunction } from 'express'
import { ProductType } from '@prisma/client'
import * as storeService from './store.service'
import type { AuthRequest } from '../../types'

const VALID_TYPES = ['COURSE', 'EBOOK', 'TOOL', 'MENTORSHIP', 'OTHER']

// GET /store — lista productos accesibles al usuario
export async function listProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const type = req.query['type'] as ProductType | undefined
    if (type && !VALID_TYPES.includes(type)) {
      return res.status(400).json({ message: 'Tipo inválido' })
    }
    const data = await storeService.listProducts(req.user!.membershipLevel, type)
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// GET /store/:id
export async function getProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await storeService.getProduct(req.params['id'] as string)
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// GET /store/admin/all — todos los productos (ADMIN+)
export async function listAllProducts(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const type = req.query['type'] as ProductType | undefined
    const data = await storeService.listAllProducts(type)
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// POST /store/admin — crear producto (ADMIN+)
export async function createProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await storeService.createProduct(req.body)
    res.status(201).json({ data })
  } catch (err) { next(err) }
}

// PATCH /store/admin/:id — editar producto (ADMIN+)
export async function updateProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await storeService.updateProduct(req.params['id'] as string, req.body)
    res.status(200).json({ data })
  } catch (err) { next(err) }
}

// DELETE /store/admin/:id — eliminar producto (ADMIN+)
export async function deleteProduct(req: AuthRequest, res: Response, next: NextFunction) {
  try {
    const data = await storeService.deleteProduct(req.params['id'] as string)
    res.status(200).json({ data })
  } catch (err) { next(err) }
}
