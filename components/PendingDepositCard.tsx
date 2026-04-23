'use client';

import { useState } from 'react';
import { ChevronDown, Eye, CheckCircle, XCircle } from 'lucide-react';

interface PendingDepositCardProps {
  investment: any;
  onConfirm: (investmentId: string) => void;
  onReject?: (investmentId: string, reason: string) => void;
  isProcessing: boolean;
}

export function PendingDepositCard({ investment, onConfirm, onReject, isProcessing }: PendingDepositCardProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showReceiptModal, setShowReceiptModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50';
      case 'verified':
        return 'bg-green-500/20 text-green-700 border-green-500/50';
      case 'rejected':
        return 'bg-red-500/20 text-red-700 border-red-500/50';
      default:
        return 'bg-gray-500/20 text-gray-700 border-gray-500/50';
    }
  };

  return (
    <>
      <div className='border border-border rounded-lg overflow-hidden hover:border-primary transition-colors'>
        {/* Main Card */}
        <button
          onClick={() => setIsExpanded(!isExpanded)}
          className='w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors'
        >
          <div className='flex-1 text-left'>
            <div className='flex items-center gap-3'>
              <div>
                <h3 className='font-semibold text-foreground'>{investment.user?.fullName || 'Unknown User'}</h3>
                <p className='text-sm text-muted-foreground'>{investment.user?.email}</p>
              </div>
            </div>
            <div className='mt-2 flex items-center gap-4'>
              <div>
                <p className='text-xs text-muted-foreground'>Amount</p>
                <p className='font-bold text-foreground'>
                  ${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                </p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>Package</p>
                <p className='font-bold text-foreground'>{investment.package}</p>
              </div>
              <div>
                <p className='text-xs text-muted-foreground'>Receipt Status</p>
                <span className={`inline-block px-2 py-1 rounded text-xs font-semibold border ${getStatusColor(investment.paymentReceiptVerificationStatus || 'pending')}`}>
                  {investment.paymentReceiptVerificationStatus || 'pending'}
                </span>
              </div>
            </div>
          </div>
          <ChevronDown
            size={20}
            className={`text-muted-foreground transition-transform ${isExpanded ? 'rotate-180' : ''}`}
          />
        </button>

        {/* Expanded Details */}
        {isExpanded && (
          <div className='border-t border-border p-4 bg-muted/30 space-y-4'>
            {/* User Details */}
            <div className='grid grid-cols-2 gap-4'>
              <div>
                <p className='text-xs font-semibold text-muted-foreground mb-1'>Full Name</p>
                <p className='text-sm text-foreground'>{investment.user?.fullName}</p>
              </div>
              <div>
                <p className='text-xs font-semibold text-muted-foreground mb-1'>Email</p>
                <p className='text-sm text-foreground break-all'>{investment.user?.email}</p>
              </div>
              <div>
                <p className='text-xs font-semibold text-muted-foreground mb-1'>Phone</p>
                <p className='text-sm text-foreground'>{investment.user?.phone || 'N/A'}</p>
              </div>
              <div>
                <p className='text-xs font-semibold text-muted-foreground mb-1'>Account Status</p>
                <p className={`text-sm font-semibold ${investment.user?.status === 'active' ? 'text-green-600' : 'text-red-600'}`}>
                  {investment.user?.status?.toUpperCase()}
                </p>
              </div>
            </div>

            {/* Investment Details */}
            <div className='border-t border-border pt-4'>
              <h4 className='font-semibold text-foreground mb-2'>Investment Details</h4>
              <div className='grid grid-cols-2 gap-4'>
                <div>
                  <p className='text-xs text-muted-foreground'>Amount</p>
                  <p className='text-sm font-semibold text-foreground'>
                    ${investment.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                  </p>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Exchange Rate</p>
                  <p className='text-sm font-semibold text-foreground'>USD only - Crypto payments</p>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Package</p>
                  <p className='text-sm font-semibold text-foreground'>{investment.package}</p>
                </div>
                <div>
                  <p className='text-xs text-muted-foreground'>Daily Returns</p>
                  <p className='text-sm font-semibold text-foreground'>{investment.dailyReturns}%</p>
                </div>
              </div>
            </div>

            {/* Payment Receipt */}
            <div className='border-t border-border pt-4'>
              <h4 className='font-semibold text-foreground mb-2'>Payment Receipt</h4>
              {investment.paymentReceipt?.fileUrl ? (
                <div className='space-y-3'>
                  <button
                    onClick={() => setShowReceiptModal(true)}
                    className='w-full flex items-center gap-2 px-4 py-2 rounded-lg border border-primary text-primary hover:bg-primary/10 transition-colors font-semibold'
                  >
                    <Eye size={18} />
                    View Payment Receipt
                  </button>
                  <p className='text-xs text-muted-foreground'>
                    Uploaded: {new Date(investment.paymentReceipt.uploadedAt).toLocaleString()}
                  </p>
                </div>
              ) : (
                <p className='text-sm text-red-600 font-semibold'>No receipt uploaded</p>
              )}
            </div>

            {/* Action Buttons */}
            <div className='border-t border-border pt-4 flex gap-3'>
              <button
                onClick={() => onConfirm(investment._id)}
                disabled={isProcessing}
                className='flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors disabled:opacity-50'
              >
                <CheckCircle size={18} />
                Confirm & Activate
              </button>
              <button
                onClick={() => {
                  if (onReject && rejectReason) {
                    onReject(investment._id, rejectReason);
                  }
                }}
                disabled={isProcessing || !rejectReason}
                className='flex-1 flex items-center justify-center gap-2 px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50'
              >
                <XCircle size={18} />
                Reject
              </button>
            </div>

            {/* Reject Reason Input */}
            <div>
              <label className='text-xs font-semibold text-muted-foreground mb-1 block'>Rejection Reason (if rejecting)</label>
              <textarea
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder='Enter reason for rejection...'
                className='w-full px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm'
                rows={2}
              />
            </div>
          </div>
        )}
      </div>

      {/* Receipt Modal */}
      {showReceiptModal && investment.paymentReceipt?.fileUrl && (
        <div className='fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4'>
          <div className='bg-card border border-border rounded-lg max-w-2xl w-full max-h-[90vh] overflow-auto'>
            <div className='flex items-center justify-between p-4 border-b border-border sticky top-0 bg-card'>
              <h3 className='font-bold text-foreground'>Payment Receipt - {investment.user?.fullName}</h3>
              <button
                onClick={() => setShowReceiptModal(false)}
                className='text-muted-foreground hover:text-foreground transition-colors'
              >
                ✕
              </button>
            </div>
            <div className='p-4'>
              {investment.paymentReceipt.receiptType === 'pdf' ? (
                <iframe
                  src={investment.paymentReceipt.fileUrl}
                  className='w-full h-96 border border-border rounded'
                  title='Payment Receipt PDF'
                />
              ) : (
                <img
                  src={investment.paymentReceipt.fileUrl}
                  alt='Payment Receipt'
                  className='w-full rounded border border-border'
                />
              )}
            </div>
          </div>
        </div>
      )}
    </>
  );
}
