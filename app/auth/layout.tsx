import type { Metadata, Viewport } from 'next';

export const metadata: Metadata = {
  title: 'Authentication | Powabitz',
  description: 'Login or register to access your Powabitz investment account',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  themeColor: '#000000',
};

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className='min-h-screen bg-gradient-to-br from-background to-card flex items-center justify-center px-4'>
      <div className='w-full max-w-md'>
        {children}
      </div>
    </div>
  );
}
