'use client';

import Link from 'next/link';
import { Mail, Phone, MapPin, Facebook, Twitter, Send } from 'lucide-react';

export default function Footer() {
  return (
    <footer className='bg-card border-t border-border mt-20'>
      <div className='max-w-7xl mx-auto px-4 py-16'>
        {/* Main Footer Content */}
        <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-12'>
          {/* Brand */}
          <div className='flex flex-col gap-4'>
            <div className='flex items-center gap-2'>
              <img 
                src='/logo.svg' 
                alt='PowaBitz' 
                className='w-10 h-10 object-contain'
              />
              <span className='text-xl font-bold bg-gradient-to-r from-primary to-secondary bg-clip-text text-transparent'>
                PowaBitz
              </span>
            </div>
            <p className='text-muted-foreground text-sm'>
              Secure crypto investment platform with guaranteed daily compound returns.
            </p>
          </div>

          {/* Quick Links */}
          <div className='flex flex-col gap-4'>
            <h3 className='font-semibold text-foreground'>Quick Links</h3>
            <div className='flex flex-col gap-2'>
              <Link href='/' className='text-muted-foreground hover:text-primary transition-colors text-sm'>
                Home
              </Link>
              <Link href='/investment' className='text-muted-foreground hover:text-primary transition-colors text-sm'>
                Investment
              </Link>
              <Link href='/about' className='text-muted-foreground hover:text-primary transition-colors text-sm'>
                About Us
              </Link>
              <Link href='/contact' className='text-muted-foreground hover:text-primary transition-colors text-sm'>
                Contact
              </Link>
            </div>
          </div>

          {/* Support */}
          <div className='flex flex-col gap-4'>
            <h3 className='font-semibold text-foreground'>Support</h3>
            <div className='flex flex-col gap-3'>
              <a href='mailto:support@powabitz.com' className='flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm'>
                <Mail size={16} />
                support@powabitz.com
              </a>
              <a href='tel:+1234567890' className='flex items-center gap-2 text-muted-foreground hover:text-primary transition-colors text-sm'>
                <Phone size={16} />
                +1 (234) 567-890
              </a>
              <div className='flex items-center gap-2 text-muted-foreground text-sm'>
                <MapPin size={16} />
                Global Platform
              </div>
            </div>
          </div>

          {/* Social */}
          <div className='flex flex-col gap-4'>
            <h3 className='font-semibold text-foreground'>Follow Us</h3>
            <div className='flex items-center gap-4'>
              <a href='https://x.com/PowaBitz' target='_blank' rel='noopener noreferrer' className='p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors'>
                <Twitter size={20} />
              </a>
              <a href='https://t.me/+-6a0vxmmxtk4ZjFk' target='_blank' rel='noopener noreferrer' className='p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors'>
                <Facebook size={20} />
              </a>
              <a href='https://t.me/+-6a0vxmmxtk4ZjFk' target='_blank' rel='noopener noreferrer' className='p-2 rounded-lg bg-muted hover:bg-primary hover:text-primary-foreground transition-colors'>
                <Send size={20} />
              </a>
            </div>
          </div>
        </div>

        {/* Bottom Footer */}
        <div className='border-t border-border pt-8 flex flex-col md:flex-row items-center justify-between gap-4'>
          <div className='text-muted-foreground text-sm'>
            © 2026 Powabitz. All rights reserved.
          </div>
          <div className='flex items-center gap-6 text-sm'>
            <Link href='/privacy-policy' className='text-muted-foreground hover:text-primary transition-colors'>
              Privacy Policy
            </Link>
            <Link href='/terms-of-service' className='text-muted-foreground hover:text-primary transition-colors'>
              Terms of Service
            </Link>
            <Link href='/cookies-policy' className='text-muted-foreground hover:text-primary transition-colors'>
              Cookie Policy
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
