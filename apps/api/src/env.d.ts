// Tipado de variables de entorno
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test'
    PORT?: string
    DATABASE_URL: string
    REDIS_URL: string
    JWT_ACCESS_SECRET: string
    JWT_REFRESH_SECRET: string
    MT5_ENCRYPTION_KEY: string
    OPENAI_API_KEY: string
    BINANCE_PAY_API_KEY: string
    BINANCE_PAY_SECRET_KEY: string
    VPS_API_KEY: string
  }
}
