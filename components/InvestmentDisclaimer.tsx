'use client';

import { AlertCircle } from 'lucide-react';
import PartnersCarousel from './PartnersCarousel';

export default function InvestmentDisclaimer() {
  return (
    <div className='w-full space-y-8'>
      {/* Risk Disclaimer */}
      <div className='bg-destructive/5 border border-destructive/20 rounded-lg p-4'>
        <div className='flex items-start gap-3'>
          <AlertCircle className='text-destructive flex-shrink-0' size={18} />
          <div className='text-xs text-foreground/70'>
            <strong>Risk Disclaimer:</strong> Only invest what you can afford to lose. Crypto markets are volatile and past performance doesn&apos;t guarantee future results.
          </div>
        </div>
      </div>

      {/* Partners Section */}
      <div className='bg-card/30 rounded-lg border border-border/30 p-6 sm:p-8'>
        <PartnersCarousel />
      </div>
    </div>
  );
}
