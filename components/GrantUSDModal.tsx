'use client';

import { useState } from 'react';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { AlertCircle, Check } from 'lucide-react';
import { apiClient } from '@/lib/api';

interface GrantUSDModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
}

export function GrantUSDModal({ isOpen, onClose, onSuccess }: GrantUSDModalProps) {
  const [userCode, setUserCode] = useState('');
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleGrantUSD = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    // Validation
    if (!userCode.trim()) {
      setError('Please enter a user code');
      return;
    }

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid amount');
      return;
    }

    if (parseFloat(amount) > 100000) {
      setError('Amount cannot exceed $100,000');
      return;
    }

    try {
      setLoading(true);
      const result = await apiClient.grantUSD(userCode.trim(), parseFloat(amount));
      
      setSuccess(`Successfully granted $${parseFloat(amount).toFixed(2)} to user ${userCode}`);
      setUserCode('');
      setAmount('');
      
      setTimeout(() => {
        onClose();
        onSuccess?.();
      }, 2000);
    } catch (err: any) {
      const errorMessage = err.message || 'Failed to grant USD';
      setError(errorMessage);
      console.error('[v0] Grant USD error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>Grant USD to User</DialogTitle>
          <DialogDescription>
            Send USD directly to a user account by their user code
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleGrantUSD} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="userCode">User Code (6-digit)</Label>
            <Input
              id="userCode"
              placeholder="e.g., 123456"
              value={userCode}
              onChange={(e) => {
                setUserCode(e.target.value);
                setError('');
              }}
              disabled={loading}
              maxLength={20}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="amount">Amount (USD)</Label>
            <Input
              id="amount"
              type="number"
              placeholder="0.00"
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError('');
              }}
              disabled={loading}
              min="0"
              step="0.01"
              max="100000"
            />
            <p className="text-xs text-muted-foreground">Maximum: $100,000</p>
          </div>

          {error && (
            <div className="flex items-center gap-2 p-3 bg-red-50 border border-red-200 rounded-md">
              <AlertCircle className="w-4 h-4 text-red-600" />
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {success && (
            <div className="flex items-center gap-2 p-3 bg-green-50 border border-green-200 rounded-md">
              <Check className="w-4 h-4 text-green-600" />
              <p className="text-sm text-green-600">{success}</p>
            </div>
          )}

          <div className="flex gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={loading}
              className="flex-1"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={loading || !userCode || !amount}
              className="flex-1"
            >
              {loading ? 'Granting...' : 'Grant USD'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
