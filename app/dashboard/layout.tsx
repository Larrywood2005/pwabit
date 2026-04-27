'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Menu, X, LogOut, Home, TrendingUp, Activity, Settings, Wallet, Gamepad2 } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { getAvatarUrl } from '@/hooks/useDefaultAvatar';
import NotificationBell from '@/components/NotificationBell';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const { user, logout } = useAuth();
  const router = useRouter();
  const [isMounted, setIsMounted] = useState(false);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const handleLogout = async () => {
    try {
      await logout();
      if (isMounted) {
        router.push('/');
      }
    } catch (error) {
      console.error('[v0] Logout failed:', error);
    }
  };

  const menuItems = [
    { icon: Home, label: 'Overview', href: '/dashboard' },
    { icon: TrendingUp, label: 'Trading', href: '/dashboard/trading' },
    { icon: TrendingUp, label: 'Investments', href: '/dashboard/investments' },
    { icon: Wallet, label: 'Wallet', href: '/dashboard/wallet' },
    { icon: Gamepad2, label: 'Games', href: '/dashboard/games' },
    { icon: Activity, label: 'Activities', href: '/dashboard/activities' },
    { icon: Settings, label: 'Settings', href: '/dashboard/settings' },
  ];

  return (
    <div className='min-h-screen bg-background flex overflow-hidden w-screen'>
      {/* Sidebar */}
      <aside className={`fixed inset-y-0 left-0 z-40 w-64 bg-card border-r border-border transform transition-transform duration-300 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } lg:translate-x-0 lg:static overflow-y-auto overflow-x-hidden`}>
        <div className='h-full flex flex-col'>
          {/* Logo */}
          <div className='p-6 border-b border-border'>
            <Link href='/dashboard' className='flex items-center gap-2'>
              <img 
                src='/logo.svg' 
                alt='PowaBitz' 
                className='w-10 h-10 object-contain'
              />
              <span className='text-lg font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
                PowaBitz
              </span>
            </Link>
          </div>

          {/* Navigation */}
          <nav className='flex-1 px-4 py-8 space-y-2'>
            {menuItems.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className='flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-muted hover:text-primary transition-all'
                >
                  <Icon size={20} />
                  <span>{item.label}</span>
                </Link>
              );
            })}
          </nav>

          {/* Logout */}
          <div className='p-4 border-t border-border'>
            <button onClick={handleLogout} className='w-full flex items-center gap-3 px-4 py-3 rounded-lg text-foreground hover:bg-destructive hover:text-white transition-all'>
              <LogOut size={20} />
              <span>Logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className='flex-1 flex flex-col overflow-x-hidden min-w-0 w-full'>
        {/* Top Bar */}
        <header className='bg-card border-b border-border px-3 sm:px-4 md:px-6 py-3 sm:py-4 flex items-center justify-between lg:justify-end overflow-x-hidden min-w-0'>
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className='lg:hidden text-foreground flex-shrink-0'
          >
            {sidebarOpen ? <X size={24} /> : <Menu size={24} />}
          </button>
          
          {/* Notifications and User Info Container */}
          <div className='flex items-center gap-2 sm:gap-3 ml-auto'>
            {/* Notification Bell */}
            <NotificationBell />
            
            {/* User Info - Mobile Responsive */}
            <div className='flex items-center gap-2 sm:gap-3 min-w-0'>
            <img 
              src={getAvatarUrl(user?.avatar)} 
              alt={user?.fullName || 'User Avatar'}
              className='w-8 sm:w-10 h-8 sm:h-10 rounded-full object-cover border-2 border-primary/20 flex-shrink-0'
              onError={(e) => {
                (e.target as HTMLImageElement).src = getAvatarUrl();
              }}
            />
            <div className='text-right min-w-0 flex-1 sm:flex-initial'>
              <p className='font-semibold text-foreground text-xs sm:text-sm truncate'>{user?.fullName || 'User'}</p>
              <div className='flex items-center gap-1 sm:gap-2 justify-end flex-wrap'>
                {user?.userCode && (
                  <span className='text-[9px] sm:text-[10px] font-mono bg-primary/10 text-primary px-1.5 sm:px-2 py-0.5 rounded whitespace-nowrap'>
                    {user.userCode}
                  </span>
                )}
                <p className='text-[9px] sm:text-[10px] text-muted-foreground truncate hidden sm:block'>{user?.email || 'Loading...'}</p>
              </div>
            </div>
            </div>
          </div>
        </header>

        {/* Page Content - Mobile First with Responsive Padding */}
        <main className='flex-1 overflow-x-hidden overflow-y-auto px-2 sm:px-3 md:px-4 lg:px-6 py-3 sm:py-4 md:py-5 lg:py-6 max-w-full w-full'>
          {children}
        </main>
      </div>

      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div
          className='fixed inset-0 bg-black/50 z-30 lg:hidden'
          onClick={() => setSidebarOpen(false)}
        ></div>
      )}
    </div>
  );
}
