import { Router, type IRouter } from 'express'
import { authenticate, requireRole } from '../../middleware/authenticate'
import {
  listProducts, getProduct,
  listAllProducts, createProduct, updateProduct, deleteProduct,
} from './store.controller'

const router: IRouter = Router()

// Rutas públicas autenticadas (usuarios)
router.get('/',     authenticate, listProducts)
router.get('/:id',  authenticate, getProduct)

// Rutas admin (ADMIN+)
router.get('/admin/all',    authenticate, requireRole('ADMIN'), listAllProducts)
router.post('/admin',       authenticate, requireRole('ADMIN'), createProduct)
router.patch('/admin/:id',  authenticate, requireRole('ADMIN'), updateProduct)
router.delete('/admin/:id', authenticate, requireRole('ADMIN'), deleteProduct)

export default router
