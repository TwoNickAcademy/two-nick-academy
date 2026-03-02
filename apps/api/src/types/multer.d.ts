// Declaración ambient de multer — reemplaza @types/multer para compatibilidad con pnpm en Linux

// Augmentación global del namespace Express (sin declare global — archivo script .d.ts)
declare namespace Express {
  namespace Multer {
    interface File {
      fieldname: string
      originalname: string
      encoding: string
      mimetype: string
      size: number
      buffer: Buffer
      stream?: NodeJS.ReadableStream
      destination?: string
      filename?: string
      path?: string
    }
  }
}

declare module 'multer' {
  import { RequestHandler, Request } from 'express'

  interface FileFilterCallback {
    (error: Error): void
    (error: null, acceptFile: boolean): void
  }

  interface StorageEngine {
    _handleFile(req: Request, file: Express.Multer.File, callback: (error?: Error, info?: Partial<Express.Multer.File>) => void): void
    _removeFile(req: Request, file: Express.Multer.File, callback: (error: Error) => void): void
  }

  interface Options {
    storage?: StorageEngine
    limits?: {
      fieldNameSize?: number
      fileSize?: number
      files?: number
    }
    fileFilter?: (req: Request, file: Express.Multer.File, callback: FileFilterCallback) => void
  }

  interface Multer {
    single(fieldname: string): RequestHandler
    array(fieldname: string, maxCount?: number): RequestHandler
    none(): RequestHandler
    any(): RequestHandler
  }

  interface MulterStatic {
    (options?: Options): Multer
    memoryStorage(): StorageEngine
    diskStorage(options: object): StorageEngine
  }

  const multer: MulterStatic
  export = multer
}
