'use client';

import { useState, useEffect } from 'react';
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
  isDefault: boolean;
  status: string;
  addedAt: string;
}

export default function WalletAddressManager() {
  const [wallets, setWallets] = useState<WalletAddress[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showForm, setShowForm] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState<{ show: boolean; walletId?: string }>({ show: false });

  // Crypto wallet form
  const [cryptoWallet, setCryptoWallet] = useState('');
  const [cryptoType, setCryptoType] = useState('bitcoin');

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
      
      await apiClient.addWalletAddress({
        walletAddress: cryptoWallet,
        walletType: cryptoType
      });

      setError('');
      setCryptoWallet('');
      setCryptoType('bitcoin');
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
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
          {error}
        </div>
      )}

      <Card>
        <CardHeader>
          <div className="flex justify-between items-center">
            <CardTitle>Withdrawal Wallet Addresses</CardTitle>
            {!showForm && (
              <Button onClick={() => setShowForm(true)}>
                Add Wallet Address
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          {loading ? (
            <p className="text-center text-gray-500">Loading wallets...</p>
          ) : wallets.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-500 mb-4">No wallet addresses added yet</p>
              <Button onClick={() => setShowForm(true)}>
                Add Your First Wallet
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {wallets.map((wallet) => (
                <div
                  key={wallet._id}
                  className="p-4 border rounded-lg hover:border-blue-300 transition"
                >
                  <div className="flex justify-between items-start">
                    <div className="flex-1">
                      <div className="font-medium">{wallet.walletType.toUpperCase()}</div>
                      <div className="text-sm text-gray-600 mt-1">
                        <p>{wallet.walletAddress}</p>
                      </div>
                      <div className="mt-2 flex gap-2">
                        {wallet.isDefault && (
                          <Badge className="bg-blue-100 text-blue-800">Default</Badge>
                        )}
                        <Badge variant="outline">{wallet.status}</Badge>
                      </div>
                    </div>
                    <div className="flex gap-2">
                      {!wallet.isDefault && (
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleSetDefault(wallet._id)}
                        >
                          Set Default
                        </Button>
                      )}
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => setDeleteConfirm({ show: true, walletId: wallet._id })}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
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
