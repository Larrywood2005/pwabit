import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { AICustomerSupport } from '@/components/AICustomerSupport'
import './globals.css'

const _geist = Geist({ subsets: ["latin"] });
const _geistMono = Geist_Mono({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: 'Powabitz - Crypto Investment Platform',
  description: 'Invest in crypto with daily compound returns. Start with just $10 and earn 10% daily on your investments.',
  keywords: 'crypto investment, bitcoin, ethereum, daily returns, compound interest',
  generator: 'Powabitz',
  icons: {
    icon: [
      {
        url: '/icon.svg',
        type: 'image/svg+xml',
      },
    ],
  },
}

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#00d4ff',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className="font-sans antialiased" style={{ fontFamily: _geist.style.fontFamily }}>
        <LanguageProvider>
          <AuthProvider>
            {children}
            <AICustomerSupport />
          </AuthProvider>
        </LanguageProvider>
        <Analytics mode="production" />
      </body>
    </html>
  )
}
