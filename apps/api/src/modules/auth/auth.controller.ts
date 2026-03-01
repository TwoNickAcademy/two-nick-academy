import { Request, Response, NextFunction } from 'express'
import { registerSchema, loginSchema, refreshSchema } from './auth.schema'
import * as authService from './auth.service'

// ─── POST /auth/register ───────────────────────────────────────

export async function register(req: Request, res: Response, next: NextFunction) {
  try {
    const input = registerSchema.parse(req.body)
    const result = await authService.registerUser(
      input,
      req.headers['user-agent'],
      req.ip,
    )
    res.status(201).json({
      message: 'Cuenta creada exitosamente',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /auth/login ──────────────────────────────────────────

export async function login(req: Request, res: Response, next: NextFunction) {
  try {
    const input = loginSchema.parse(req.body)
    const result = await authService.loginUser(
      input,
      req.headers['user-agent'],
      req.ip,
    )
    res.status(200).json({
      message: 'Sesión iniciada',
      data: result,
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /auth/refresh ────────────────────────────────────────

export async function refresh(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body)
    const tokens = await authService.refreshAccessToken(
      refreshToken,
      req.headers['user-agent'],
      req.ip,
    )
    res.status(200).json({
      message: 'Token renovado',
      data: tokens,
    })
  } catch (err) {
    next(err)
  }
}

// ─── POST /auth/logout ─────────────────────────────────────────

export async function logout(req: Request, res: Response, next: NextFunction) {
  try {
    const { refreshToken } = refreshSchema.parse(req.body)
    await authService.logoutUser(refreshToken)
    res.status(200).json({ message: 'Sesión cerrada' })
  } catch (err) {
    next(err)
  }
}
