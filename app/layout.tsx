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
  robots: 'index, follow, max-image-preview:large, max-snippet:-1, max-video-preview:-1',
  icons: {
    icon: [
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Favicon-v2.PNG-AWBE3JpkpxB8s3CV75qzC3cglNb2tX.png',
        type: 'image/png',
        sizes: '192x192',
      },
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Favicon-v2.PNG-AWBE3JpkpxB8s3CV75qzC3cglNb2tX.png',
        type: 'image/png',
        sizes: '64x64',
      }
    ],
    shortcut: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Favicon-v2.PNG-AWBE3JpkpxB8s3CV75qzC3cglNb2tX.png',
    apple: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Favicon-v2.PNG-AWBE3JpkpxB8s3CV75qzC3cglNb2tX.png',
  },
  openGraph: {
    title: 'Powabitz - Crypto Investment Platform',
    description: 'Invest in crypto with daily compound returns. Start with just $10 and earn 3.5% daily on your investments.',
    url: 'https://powabitz.com',
    type: 'website',
    images: [
      {
        url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/Favicon-v2.PNG-AWBE3JpkpxB8s3CV75qzC3cglNb2tX.png',
        width: 192,
        height: 192,
        alt: 'Powabitz Logo',
      }
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
