import { Server as HttpServer } from 'http'
import { Server as SocketServer, type Socket } from 'socket.io'
import jwt from 'jsonwebtoken'
import type { JwtAccessPayload } from '../types'
import { MembershipLevel } from '@prisma/client'
import { saveMessage, canAccessRoom } from '../modules/chat/chat.service'

// Singleton del servidor Socket.io
let io: SocketServer

// Rooms por nivel de membresía
// Cada nivel tiene acceso a su room y a las de menor nivel
const LEVEL_ROOMS: Record<MembershipLevel, MembershipLevel[]> = {
  GENERAL: ['GENERAL'],
  VIP:     ['GENERAL', 'VIP'],
  SUPREMO: ['GENERAL', 'VIP', 'SUPREMO'],
  MASTER:  ['GENERAL', 'VIP', 'SUPREMO', 'MASTER'],
}

export function initSocket(httpServer: HttpServer): SocketServer {
  io = new SocketServer(httpServer, {
    cors: {
      origin: [
        'http://localhost:3001',
        'https://admin.twonick.academy',
      ],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  })

  // ─── Middleware de autenticación Socket ──────────────────────
  io.use((socket: Socket, next) => {
    const token = socket.handshake.auth['token'] as string | undefined
    if (!token) {
      return next(new Error('Token requerido'))
    }
    try {
      const payload = jwt.verify(token, process.env.JWT_ACCESS_SECRET!) as JwtAccessPayload
      socket.data['userId'] = payload.sub
      socket.data['level']  = payload.level
      next()
    } catch {
      next(new Error('Token inválido'))
    }
  })

  // ─── Conexión ────────────────────────────────────────────────
  io.on('connection', (socket: Socket) => {
    const level  = socket.data['level'] as MembershipLevel
    const userId = socket.data['userId'] as string

    // Unirse a rooms de señales por nivel
    const rooms = LEVEL_ROOMS[level] ?? ['GENERAL']
    rooms.forEach((room) => socket.join(`level:${room}`))

    // Unirse a rooms de chat accesibles por nivel
    rooms.forEach((room) => socket.join(`chat:${room}`))

    // Room personal para notificaciones privadas
    socket.join(`user:${userId}`)

    console.log(`[Socket] Usuario ${userId} conectado — nivel ${level}`)

    // ─── Eventos de Chat ─────────────────────────────────────────

    // Unirse a una sala de chat específica
    socket.on('chat:join', (data: { roomLevel: MembershipLevel }) => {
      const roomLevel = data?.roomLevel
      if (!roomLevel || !canAccessRoom(level, roomLevel)) {
        socket.emit('chat:error', { message: `Sin acceso a la sala ${roomLevel}` })
        return
      }
      socket.join(`chat:${roomLevel}`)
    })

    // Enviar mensaje a una sala
    socket.on('chat:send', async (data: { roomLevel: MembershipLevel; content: string }) => {
      const roomLevel = data?.roomLevel
      const content   = data?.content?.trim()

      if (!roomLevel || !content) {
        socket.emit('chat:error', { message: 'Datos inválidos' })
        return
      }
      if (content.length > 1000) {
        socket.emit('chat:error', { message: 'Mensaje demasiado largo (máx. 1000 caracteres)' })
        return
      }
      if (!canAccessRoom(level, roomLevel)) {
        socket.emit('chat:error', { message: `Sin acceso a la sala ${roomLevel}` })
        return
      }

      try {
        const message = await saveMessage(userId, roomLevel, content)
        // Emitir a todos en la sala (incluyendo el remitente)
        io.to(`chat:${roomLevel}`).emit('chat:message', message)
      } catch (err) {
        console.error('[Chat] Error guardando mensaje:', err)
        socket.emit('chat:error', { message: 'Error al enviar mensaje' })
      }
    })

    // Indicador de "escribiendo..." (efímero, no se guarda)
    socket.on('chat:typing', (data: { roomLevel: MembershipLevel }) => {
      const roomLevel = data?.roomLevel
      if (!roomLevel || !canAccessRoom(level, roomLevel)) return
      socket.to(`chat:${roomLevel}`).emit('chat:typing', { userId, roomLevel })
    })

    socket.on('disconnect', () => {
      console.log(`[Socket] Usuario ${userId} desconectado`)
    })
  })

  return io
}

export function getIO(): SocketServer {
  if (!io) throw new Error('Socket.io no inicializado. Llama a initSocket primero.')
  return io
}

// ─── Helpers de emisión ──────────────────────────────────────

// Emitir señal a todos los niveles que tengan acceso (minLevel en adelante)
export function emitSignal(minLevel: MembershipLevel, event: string, data: unknown) {
  const io = getIO()
  // Emitir a todos los niveles que pueden ver esta señal
  const allLevels: MembershipLevel[] = ['GENERAL', 'VIP', 'SUPREMO', 'MASTER']
  const levelRank: Record<MembershipLevel, number> = {
    GENERAL: 0, VIP: 1, SUPREMO: 2, MASTER: 3,
  }
  const minRank = levelRank[minLevel]

  allLevels
    .filter((l) => (levelRank[l] ?? 0) >= minRank)
    .forEach((l) => io.to(`level:${l}`).emit(event, data))
}

// Notificación privada a un usuario específico
export function emitToUser(userId: string, event: string, data: unknown) {
  getIO().to(`user:${userId}`).emit(event, data)
}
