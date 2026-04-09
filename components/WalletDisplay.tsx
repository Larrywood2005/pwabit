'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';
import { WALLET_NETWORKS } from '@/config/wallets';

export default function WalletDisplay() {
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const copyToClipboard = (address: string, index: number) => {
    navigator.clipboard.writeText(address);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  return (
    <div className='w-full'>
      <h3 className='text-xl font-bold text-foreground mb-6'>Send Crypto to Our Wallets</h3>
      <div className='grid grid-cols-1 md:grid-cols-2 gap-6'>
        {WALLET_NETWORKS.map((wallet, index) => (
          <div
            key={wallet.chainId}
            className='border border-border rounded-lg p-6 hover:border-primary transition-all'
          >
            <div className='flex items-center gap-3 mb-4'>
              <div className={`w-12 h-12 rounded-lg bg-gradient-to-br ${wallet.color} flex items-center justify-center`}>
                <span className='text-white font-bold text-lg'>{wallet.symbol[0]}</span>
              </div>
              <div>
                <h4 className='font-bold text-foreground'>{wallet.name}</h4>
                <p className='text-sm text-muted-foreground'>{wallet.symbol}</p>
              </div>
            </div>

            <div className='bg-card rounded-lg p-4 mb-4 border border-border'>
              <p className='text-xs text-muted-foreground mb-2'>Wallet Address</p>
              <p className='text-sm font-mono text-foreground break-all'>{wallet.address}</p>
            </div>

            <button
              onClick={() => copyToClipboard(wallet.address, index)}
              className='w-full py-3 rounded-lg bg-gradient-to-r from-primary to-secondary text-primary-foreground font-semibold hover:shadow-lg hover:shadow-primary/30 transition-all flex items-center justify-center gap-2 group'
            >
              {copiedIndex === index ? (
                <>
                  <Check size={18} />
                  Copied!
                </>
              ) : (
                <>
                  <Copy size={18} />
                  Copy Address
                </>
              )}
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
