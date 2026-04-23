'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { Menu, X } from 'lucide-react';
import { LanguageSwitcher } from './LanguageSwitcher';

export default function Header() {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 10);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <header
      className={`fixed top-0 w-full z-50 transition-all duration-300 ${
        isScrolled
          ? 'bg-background/80 backdrop-blur-lg border-b border-border'
          : 'bg-transparent'
      }`}
    >
      <nav className='max-w-7xl mx-auto px-4 py-4 flex items-center justify-between'>
        {/* Logo */}
        <Link href='/' className='flex items-center gap-3 group'>
          <div className='w-16 h-16 rounded-lg flex items-center justify-center'>
            <img 
              src='/logo.svg' 
              alt='PowaBitz' 
              className='w-full h-full object-contain'
            />
          </div>
        </Link>

        {/* Desktop Navigation */}
        <div className='hidden md:flex items-center gap-8'>
          <Link href='/' className='text-foreground hover:text-primary transition-colors'>
            Home
          </Link>
          <Link href='/investment' className='text-foreground hover:text-primary transition-colors'>
            Investment
          </Link>
          <Link href='/about' className='text-foreground hover:text-primary transition-colors'>
            About
          </Link>
          <Link href='/contact' className='text-foreground hover:text-primary transition-colors'>
            Contact
          </Link>
        </div>

        {/* Language Selector & Auth Buttons */}
        <div className='hidden md:flex items-center gap-4'>
          <LanguageSwitcher />

          <Link
            href='/auth/login'
            className='px-6 py-2 text-foreground hover:text-primary transition-colors'
          >
            Login
          </Link>
          <Link
            href='/auth/register'
            className='px-6 py-2 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all'
          >
            Sign Up
          </Link>
        </div>

        {/* Mobile Menu Button */}
        <button
          className='md:hidden text-foreground'
          onClick={() => setIsMenuOpen(!isMenuOpen)}
        >
          {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </nav>

      {/* Mobile Menu */}
      {isMenuOpen && (
        <div className='md:hidden bg-background/95 backdrop-blur-lg border-b border-border'>
          <div className='px-4 py-4 flex flex-col gap-4'>
            <Link href='/' className='text-foreground hover:text-primary transition-colors'>
              Home
            </Link>
            <Link href='/investment' className='text-foreground hover:text-primary transition-colors'>
              Investment
            </Link>
            <Link href='/about' className='text-foreground hover:text-primary transition-colors'>
              About
            </Link>
            <Link href='/contact' className='text-foreground hover:text-primary transition-colors'>
              Contact
            </Link>
            
            {/* Mobile Language Selector */}
            <div className='pt-4 border-t border-border'>
              <div className='mb-4'>
                <LanguageSwitcher />
              </div>
            </div>
            
            <div className='flex flex-col gap-3 pt-4 border-t border-border'>
              <Link
                href='/auth/login'
                className='px-6 py-2 text-center text-foreground hover:text-primary transition-colors'
              >
                Login
              </Link>
              <Link
                href='/auth/register'
                className='px-6 py-2 text-center rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold'
              >
                Sign Up
              </Link>
            </div>
          </div>
        </div>
      )}
    </header>
  );
}
