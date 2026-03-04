import crypto from 'crypto'

// ─── Variables de entorno ─────────────────────────────────────────
const LIBRARY_ID = process.env.BUNNY_LIBRARY_ID ?? ''
const API_KEY    = process.env.BUNNY_API_KEY    ?? ''
const CDN_HOST   = process.env.BUNNY_CDN_HOSTNAME ?? ''

// ─── Generación de URLs firmadas ──────────────────────────────────

/**
 * Genera una URL de embed firmada para Bunny.net Stream.
 * Válida por 4 horas por defecto.
 *
 * Fórmula oficial: SHA256(apiKey + videoId + expires)
 * URL: https://iframe.mediadelivery.net/embed/{libraryId}/{videoId}?token={token}&expires={expires}
 */
export function generateSignedEmbedUrl(videoId: string, expiresIn = 14400): string {
  const expires = Math.floor(Date.now() / 1000) + expiresIn
  const raw     = `${API_KEY}${videoId}${expires}`
  const token   = crypto.createHash('sha256').update(raw).digest('hex')
  return `https://iframe.mediadelivery.net/embed/${LIBRARY_ID}/${videoId}?token=${token}&expires=${expires}`
}

/**
 * Genera una URL HLS firmada para reproductores nativos (React Native).
 * Requiere que el Pull Zone tenga Token Authentication activado.
 *
 * Fórmula CDN: SHA256(tokenAuthKey + urlPath + expires)
 * URL: https://{cdnHostname}/{videoId}/playlist.m3u8?token={token}&expires={expires}
 *
 * BUNNY_TOKEN_AUTH_KEY se configura en: Bunny Dashboard → CDN → Pull Zone → Token Auth
 * Si no está configurado, se usa BUNNY_API_KEY como fallback.
 */
export function generateSignedHlsUrl(videoId: string, expiresIn = 14400): string {
  const authKey  = process.env.BUNNY_TOKEN_AUTH_KEY ?? API_KEY
  const expires  = Math.floor(Date.now() / 1000) + expiresIn
  const urlPath  = `/${videoId}/playlist.m3u8`
  const raw      = `${authKey}${urlPath}${expires}`
  const token    = crypto.createHash('sha256').update(raw).digest('hex')
  return `https://${CDN_HOST}${urlPath}?token=${token}&expires=${expires}`
}

/**
 * Retorna tanto la embed URL (WebView) como la HLS URL (reproductor nativo).
 */
export function generateStreamUrls(videoId: string, expiresIn = 14400) {
  return {
    embedUrl: generateSignedEmbedUrl(videoId, expiresIn),
    hlsUrl:   generateSignedHlsUrl(videoId, expiresIn),
    thumbnail: `https://${CDN_HOST}/${videoId}/thumbnail.jpg`,
    videoId,
  }
}

// ─── API de Bunny.net — operaciones de Video Library ─────────────

const BUNNY_API_BASE = 'https://video.bunnycdn.com'

async function bunnyFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BUNNY_API_BASE}${path}`, {
    ...init,
    headers: {
      AccessKey:     API_KEY,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
  })
  if (!res.ok) {
    const body = await res.text()
    throw Object.assign(
      new Error(`Bunny API error ${res.status}: ${body}`),
      { statusCode: 502 },
    )
  }
  return res.json() as Promise<T>
}

// ─── Listar videos de la librería ────────────────────────────────

export interface BunnyVideo {
  videoLibraryId: number
  guid:           string
  title:          string
  dateUploaded:   string
  views:          number
  status:         number   // 4 = ready, 3 = encoding, etc.
  framerate:      number
  width:          number
  height:         number
  length:         number   // duración en segundos
  storageSize:    number
  thumbnailFileName: string
}

export interface BunnyVideoListResponse {
  totalItems:  number
  currentPage: number
  itemsPerPage: number
  items:       BunnyVideo[]
}

export async function listBunnyVideos(
  page     = 1,
  search?: string,
  perPage  = 20,
): Promise<BunnyVideoListResponse> {
  const params = new URLSearchParams({
    page:         String(page),
    itemsPerPage: String(perPage),
    orderBy:      'date',
  })
  if (search) params.set('search', search)
  return bunnyFetch<BunnyVideoListResponse>(`/library/${LIBRARY_ID}/videos?${params}`)
}

export async function getBunnyVideo(videoId: string): Promise<BunnyVideo> {
  return bunnyFetch<BunnyVideo>(`/library/${LIBRARY_ID}/videos/${videoId}`)
}
