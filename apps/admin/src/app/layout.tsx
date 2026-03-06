import type { Metadata } from 'next'
import { Providers } from './providers'
import './globals.css'

export const metadata: Metadata = {
  title:       'Two-Nick Academy — Admin',
  description: 'Panel de administración de Two-Nick Academy',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es" className="dark">
      <body
        style={{
          background:
            'radial-gradient(ellipse at 20% 50%, rgba(212,175,55,0.05) 0%, transparent 55%),' +
            'radial-gradient(ellipse at 80% 20%, rgba(59,130,246,0.04) 0%, transparent 55%),' +
            '#05050A',
          minHeight: '100dvh',
        }}
      >
        <Providers>{children}</Providers>
      </body>
    </html>
  )
}
