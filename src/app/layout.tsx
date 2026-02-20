import type { Metadata, Viewport } from 'next'
import './globals.css'
import ServiceWorkerProvider from '@/lib/sw-provider'

export const metadata: Metadata = {
  title: 'PresupuestoPRO — Presupuestos profesionales para oficios',
  description: 'Creá presupuestos en PDF desde tu celular, envialos por WhatsApp y cobrá más.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'black-translucent',
    title: 'PresupuestoPRO',
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  themeColor: '#0f172a',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="es">
      <head>
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body>
        <ServiceWorkerProvider>{children}</ServiceWorkerProvider>
      </body>
    </html>
  )
}
