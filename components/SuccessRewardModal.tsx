'use client';

import { useState, useEffect } from 'react';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface SuccessRewardModalProps {
  isOpen: boolean;
  amount: number;
  rewardType?: 'puzzle' | 'bonus' | 'game';
  onClose: () => void;
}

export default function SuccessRewardModal({
  isOpen,
  amount,
  rewardType = 'puzzle',
  onClose,
}: SuccessRewardModalProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    setIsVisible(isOpen);
  }, [isOpen]);

  const handleClose = () => {
    setIsVisible(false);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  if (!isOpen && !isVisible) return null;

  const getRewardMessage = () => {
    switch (rewardType) {
      case 'bonus':
        return 'Daily Bonus Claimed!';
      case 'game':
        return 'Game Won!';
      case 'puzzle':
      default:
        return 'Puzzle Completed!';
    }
  };

  return (
    <>
      {/* Backdrop */}
      <div
        className={`fixed inset-0 bg-black/50 z-40 transition-opacity duration-200 ${
          isVisible ? 'opacity-100' : 'opacity-0'
        }`}
        onClick={handleClose}
      />

      {/* Modal */}
      <div className={`fixed inset-0 flex items-center justify-center z-50 p-4 pointer-events-none`}>
        <div
          className={`bg-card border border-border rounded-2xl shadow-2xl max-w-sm w-full pointer-events-auto transform transition-all duration-200 ${
            isVisible ? 'scale-100 opacity-100' : 'scale-95 opacity-0'
          }`}
        >
          {/* Close Button */}
          <div className="flex justify-end p-4">
            <button
              onClick={handleClose}
              className="p-2 hover:bg-muted rounded-lg transition-colors"
              aria-label="Close"
            >
              <X size={20} className="text-muted-foreground" />
            </button>
          </div>

          {/* Content */}
          <div className="px-6 pb-6 text-center space-y-4">
            {/* Thumbs Up Image */}
            <div className="flex justify-center">
              <img
                src="https://hebbkx1anhila5yf.public.blob.vercel-storage.com/ok-okay-PhBz4ZCdBG6GqWtVzELTIgJssk2IyP.gif"
                alt="Success"
                className="w-24 h-24 object-contain"
              />
            </div>

            {/* Title */}
            <div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                {getRewardMessage()}
              </h2>
              <p className="text-sm text-muted-foreground">
                Congratulations! Your reward has been added to your account.
              </p>
            </div>

            {/* Amount Display */}
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4">
              <p className="text-xs text-muted-foreground mb-1">Amount Earned</p>
              <p className="text-3xl font-bold text-green-600">
                You just got ${amount.toFixed(2)}
              </p>
            </div>

            {/* Close Button */}
            <Button onClick={handleClose} className="w-full" size="lg">
              Got it!
            </Button>
          </div>
        </div>
      </div>
    </>
  );
}
