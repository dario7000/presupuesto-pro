import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'PresupuestoPRO — Presupuestos profesionales para oficios',
  description: 'Creá presupuestos en PDF desde tu celular, envialos por WhatsApp y cobrá más. Para mecánicos, plomeros, electricistas y más.',
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
      <body>{children}</body>
    </html>
  )
}
