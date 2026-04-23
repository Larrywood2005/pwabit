import type { Metadata, Viewport } from 'next'
import { Geist, Geist_Mono } from 'next/font/google'
import { Analytics } from '@vercel/analytics/next'
import { AuthProvider } from '@/context/AuthContext'
import { LanguageProvider } from '@/context/LanguageContext'
import { AICustomerSupport } from '@/components/AICustomerSupport'
import './globals.css'

const geist = Geist({ subsets: ["latin"], variable: '--font-geist' });
const geistMono = Geist_Mono({ subsets: ["latin"], variable: '--font-geist-mono' });

export const metadata: Metadata = {
  title: 'Powabitz - Crypto Investment Platform',
  description: 'Invest in crypto with daily compound returns. Start with just $10 and earn 3.5% daily on your investments.',
  keywords: 'crypto investment, bitcoin, ethereum, daily returns, compound interest',
  generator: 'Powabitz',
  icons: {
    icon: [
      {
        url: '/favicon.svg',
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
    <html lang="en" className={`${geist.variable} ${geistMono.variable}`}>
      <body className="font-sans antialiased">
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
