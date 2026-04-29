'use client';

import { useState, useEffect } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { apiClient } from '@/lib/api';

interface WalletAddress {
  _id: string;
  walletAddress: string;
  walletType: 'bitcoin' | 'ethereum' | 'usdt' | 'usdc' | 'other';
  usdtNetwork?: 'bep20' | 'erc20' | 'trc20' | 'morph';
  isDefault: boolean;
  status: string;
  addedAt: string;
}

const getCryptoLogo = (type: string, network?: string) => {
  const logos: Record<string, { url: string; alt: string }> = {
    bitcoin: {
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/btc.jfif-2nHpiXE4h7XoZLLiqUMYeYRMOsoZ1r.jpeg',
      alt: 'Bitcoin Logo'
    },
    ethereum: {
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/eth-4ztM9KbUf0Dv4MutndvUsNRDWlul6z.png',
      alt: 'Ethereum Logo'
    },
    usdt: {
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/USDT-i2kDVSUPCEi1vjtbfUjgNlHjefh00m.png',
      alt: 'USDT Logo'
    },
    bep20: {
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/bep%2020%20ustd-kwhyuB3xrmP0ZUwMz3hK5ImywsKpy8.png',
      alt: 'BEP20 Network'
    },
    erc20: {
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/erc20.jfif-QA4XeYJAgJDMBeIgGMQLeDpUtvADDF.jpeg',
      alt: 'ERC20 Network'
    },
    trc20: {
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/trc20.jfif-VQxEJO97jy9bPLwryNHp5Y1gHvPUOD.jpeg',
      alt: 'TRC20 Network'
    },
    morph: {
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/morph%20ustd.jfif-bOMUcJLHHVLN47oguYSWvAmsx2XUcZ.jpeg',
      alt: 'Morph Network'
    },
    usdc: {
      url: 'https://hebbkx1anhila5yf.public.blob.vercel-storage.com/USDT-i2kDVSUPCEi1vjtbfUjgNlHjefh00m.png',
      alt: 'USDC Logo'
    },
    other: {
      url: '',
      alt: ''
    }
  };
  // If USDT and network specified, use network logo
  if (type === 'usdt' && network) {
    return logos[network] || logos.usdt;
  }
  return logos[type] || logos.other;
};

export default function WalletAddressManager() {
  const [wallets, setWallets] = useState<WalletAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; walletId?: string }>({ show: false });

  // Crypto wallet form
  const [cryptoWallet, setCryptoWallet] = useState('');
  const [cryptoType, setCryptoType] = useState('bitcoin');
  const [usdtNetwork, setUsdtNetwork] = useState('bep20');

  useEffect(() => {
    fetchWallets();
  }, []);

  const fetchWallets = async () => {
    try {
      setLoading(true);
      const response = await apiClient.getWalletAddresses();
      // Handle both response formats: { data: [...] } or { wallets: [...] }
      const walletsArray = response.data || response.wallets || [];
      setWallets(walletsArray);
      setError('');
    } catch (err: any) {
      console.error('[v0] Error fetching wallets:', err);
      setError(err.message || 'Failed to load wallets');
    } finally {
      setLoading(false);
    }
  };

  const handleAddWallet = async () => {
    try {
      if (!cryptoWallet || !cryptoType) {
        setError('Please fill in all wallet fields');
        return;
      }
      
      const walletData: any = {
        walletAddress: cryptoWallet,
        walletType: cryptoType
      };
      
      // Add USDT network if USDT is selected
      if (cryptoType === 'usdt') {
        walletData.usdtNetwork = usdtNetwork;
      }
      
      await apiClient.addWalletAddress(walletData);

      setError('');
      setCryptoWallet('');
      setCryptoType('bitcoin');
      setUsdtNetwork('bep20');
      setShowForm(false);
      await fetchWallets();
    } catch (err: any) {
      console.error('[v0] Error adding wallet:', err);
      setError(err.message || 'Failed to add wallet');
    }
  };

  const handleSetDefault = async (walletId: string) => {
    try {
      await apiClient.setDefaultWallet(walletId);
      await fetchWallets();
    } catch (err: any) {
      console.error('[v0] Error setting default wallet:', err);
      setError(err.message || 'Failed to set default wallet');
    }
  };

  const handleDelete = async (walletId: string) => {
    try {
      await apiClient.deleteWalletAddress(walletId);
      await fetchWallets();
      setDeleteConfirm({ show: false });
    } catch (err: any) {
      console.error('[v0] Error deleting wallet:', err);
      setError(err.message || 'Failed to delete wallet');
    }
  };

  const formatWalletDisplay = (wallet: WalletAddress) => {
    return `${wallet.walletType?.toUpperCase()} - ${wallet.walletAddress?.slice(0, 10)}...${wallet.walletAddress?.slice(-10)}`;
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center gap-2">
            <CardTitle>Withdrawal Wallet Addresses</CardTitle>
            {!showForm && (
              <Button onClick={() => setShowForm(true)} size="sm">
                Add Wallet Address
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500 text-sm">Loading wallets...</p>
          ) : wallets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4 text-sm">No wallet addresses added yet</p>
              <Button onClick={() => setShowForm(true)}>
                Add Your First Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((wallet) => {
                const logo = getCryptoLogo(wallet.walletType, wallet.usdtNetwork);
                const displayName = wallet.walletType === 'usdt' && wallet.usdtNetwork 
                  ? `USDT ${wallet.usdtNetwork.toUpperCase()}`
                  : wallet.walletType.toUpperCase();
                
                return (
                  <div
                    key={wallet._id}
                    className="p-4 border rounded-lg hover:border-blue-300 transition"
                  >
                    <div className="flex justify-between items-start gap-3">
                      {/* Crypto Logo and Type */}
                      <div className="flex items-start gap-3 flex-1 min-w-0">
                        {logo.url && (
                          <div className="w-10 h-10 relative flex-shrink-0">
                            <Image
                              src={logo.url}
                              alt={logo.alt}
                              fill
                              className="object-contain rounded-full"
                              sizes="40px"
                            />
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <div className="font-medium text-sm">{displayName}</div>
                          <div className="text-xs text-gray-600 mt-1 break-all">
                            <p className="font-mono">{wallet.walletAddress}</p>
                          </div>
                          <div className="mt-2 flex gap-2 flex-wrap">
                            {wallet.isDefault && (
                              <Badge className="bg-blue-100 text-blue-800 text-xs">Default</Badge>
                            )}
                            <Badge variant="outline" className="text-xs">{wallet.status}</Badge>
                          </div>
                        </div>
                      </div>
                      
                      {/* Actions */}
                      <div className="flex gap-2 flex-shrink-0">
                        {!wallet.isDefault && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleSetDefault(wallet._id)}
                            className="text-xs"
                          >
                            Default
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="destructive"
                          onClick={() => setDeleteConfirm({ show: true, walletId: wallet._id })}
                          className="text-xs"
                        >
                          Delete
                        </Button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      {showForm && (
        <Card>
          <CardHeader>
            <CardTitle>Add New Wallet Address</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="block text-sm font-medium mb-2">Cryptocurrency Type</label>
              <Select value={cryptoType} onValueChange={setCryptoType}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="bitcoin">Bitcoin</SelectItem>
                  <SelectItem value="ethereum">Ethereum</SelectItem>
                  <SelectItem value="usdt">USDT</SelectItem>
                  <SelectItem value="usdc">USDC</SelectItem>
                  <SelectItem value="other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* USDT Network Selection - Only show if USDT is selected */}
            {cryptoType === 'usdt' && (
              <div>
                <label className="block text-sm font-medium mb-2">USDT Network</label>
                <Select value={usdtNetwork} onValueChange={setUsdtNetwork}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="bep20">BEP20 (Binance Smart Chain)</SelectItem>
                    <SelectItem value="erc20">ERC20 (Ethereum)</SelectItem>
                    <SelectItem value="trc20">TRC20 (TRON)</SelectItem>
                    <SelectItem value="morph">Morph USDT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
            
            <div>
              <label className="block text-sm font-medium mb-2">Wallet Address</label>
              <Input
                placeholder="Enter wallet address"
                value={cryptoWallet}
                onChange={(e) => setCryptoWallet(e.target.value)}
              />
            </div>

            <div className="flex gap-2 pt-4">
              <Button onClick={handleAddWallet} className="flex-1">
                Add Wallet
              </Button>
              <Button
                variant="outline"
                onClick={() => setShowForm(false)}
                className="flex-1"
              >
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      <AlertDialog open={deleteConfirm.show}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Wallet Address</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this wallet address? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <div className="flex gap-2">
            <AlertDialogCancel onClick={() => setDeleteConfirm({ show: false })}>
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteConfirm.walletId && handleDelete(deleteConfirm.walletId)}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </div>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
