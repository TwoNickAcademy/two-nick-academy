import { Router, type IRouter } from 'express'
import { register, login, refresh, logout } from './auth.controller'

const router: IRouter = Router()

// POST /auth/register
router.post('/register', register)

// POST /auth/login
router.post('/login', login)

// POST /auth/refresh
router.post('/refresh', refresh)

// POST /auth/logout
router.post('/logout', logout)

export default router
