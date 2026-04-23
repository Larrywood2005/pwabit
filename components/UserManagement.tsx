'use client';

import { useState } from 'react';
import { AlertTriangle, Ban, Trash2, MessageSquare, ChevronDown } from 'lucide-react';

interface UserManagementProps {
  users: any[];
  onSuspend: (userId: string, reason: string) => void;
  onFlag: (userId: string, reason: string) => void;
  onWarn: (userId: string, reason: string) => void;
  onDelete: (userId: string, reason: string) => void;
  isProcessing: boolean;
}

export function UserManagement({ users, onSuspend, onFlag, onWarn, onDelete, isProcessing }: UserManagementProps) {
  const [expandedUser, setExpandedUser] = useState<string | null>(null);
  const [actionReason, setActionReason] = useState<{ [key: string]: string }>({});

  const getStatusBadge = (status: string) => {
    const statusStyles: { [key: string]: string } = {
      active: 'bg-green-500/20 text-green-700 border-green-500/50',
      suspended: 'bg-red-500/20 text-red-700 border-red-500/50',
      flagged: 'bg-yellow-500/20 text-yellow-700 border-yellow-500/50',
      deleted: 'bg-gray-500/20 text-gray-700 border-gray-500/50'
    };
    return statusStyles[status] || statusStyles.active;
  };

  return (
    <div className='space-y-4'>
      {users.length === 0 ? (
        <div className='text-center py-8 text-muted-foreground'>
          <p>No users with this status</p>
        </div>
      ) : (
        users.map(user => (
          <div key={user._id} className='border border-border rounded-lg overflow-hidden hover:border-primary transition-colors'>
            {/* User Header */}
            <button
              onClick={() => setExpandedUser(expandedUser === user._id ? null : user._id)}
              className='w-full p-4 flex items-center justify-between hover:bg-muted/50 transition-colors'
            >
              <div className='flex-1 text-left'>
                <div className='flex items-center gap-3'>
                  <div className='w-10 h-10 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold'>
                    {user.fullName?.charAt(0) || 'U'}
                  </div>
                  <div>
                    <h3 className='font-semibold text-foreground'>{user.fullName}</h3>
                    <p className='text-sm text-muted-foreground'>{user.email}</p>
                  </div>
                </div>
              </div>
              <div className='flex items-center gap-4'>
                <span className={`px-3 py-1 rounded-full text-xs font-semibold border ${getStatusBadge(user.status)}`}>
                  {user.status?.toUpperCase()}
                </span>
                <ChevronDown
                  size={20}
                  className={`text-muted-foreground transition-transform ${expandedUser === user._id ? 'rotate-180' : ''}`}
                />
              </div>
            </button>

            {/* Expanded Details */}
            {expandedUser === user._id && (
              <div className='border-t border-border p-4 bg-muted/30 space-y-4'>
                {/* User Info */}
                <div className='grid grid-cols-2 gap-4 mb-4'>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>Email</p>
                    <p className='text-sm text-foreground break-all'>{user.email}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>Phone</p>
                    <p className='text-sm text-foreground'>{user.phone || 'N/A'}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>KYC Status</p>
                    <p className='text-sm font-semibold text-foreground capitalize'>{user.kycStatus || 'not_started'}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>Current Balance</p>
                    <p className='text-sm font-bold text-secondary'>${(user.currentBalance || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>Total Invested</p>
                    <p className='text-sm font-bold text-primary'>${(user.totalInvested || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>Total Earnings</p>
                    <p className='text-sm font-bold text-green-600'>${(user.totalEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>Puzzle Bonuses</p>
                    <p className='text-sm text-foreground'>${(user.puzzleGameBonuses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>Trading Bonuses</p>
                    <p className='text-sm text-foreground'>${(user.tradingBonuses || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>Referral Earnings</p>
                    <p className='text-sm text-foreground'>${(user.referralEarnings || 0).toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>PowaUp Balance</p>
                    <p className='text-sm text-foreground'>{user.powaUpBalance || 0} credits</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>Active Investments</p>
                    <p className='text-sm text-foreground'>{user.activeInvestments || 0}</p>
                  </div>
                  <div>
                    <p className='text-xs font-semibold text-muted-foreground mb-1'>Joined Date</p>
                    <p className='text-sm text-foreground'>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : 'N/A'}</p>
                  </div>
                </div>

                {/* Bank Accounts Section */}
                {user.bankAccounts && user.bankAccounts.length > 0 && (
                  <div className='border-t border-border pt-4'>
                    <h4 className='font-semibold text-foreground mb-3 flex items-center gap-2'>
                      🏦 Bank Accounts (NGN Withdrawals)
                    </h4>
                    <div className='space-y-3'>
                      {user.bankAccounts.map((account: any, idx: number) => (
                        <div key={idx} className='bg-background p-3 rounded border border-border'>
                          <div className='flex items-center justify-between mb-2'>
                            <p className='font-semibold text-foreground text-sm'>{account.bankName}</p>
                            <span className={`text-xs font-semibold px-2 py-1 rounded ${
                              account.status === 'active'
                                ? 'bg-green-500/20 text-green-700'
                                : 'bg-yellow-500/20 text-yellow-700'
                            }`}>
                              {account.status || 'active'}
                            </span>
                          </div>
                          <p className='text-xs text-muted-foreground'>Account Holder: {account.accountHolder}</p>
                          <p className='text-xs text-muted-foreground'>Account Number: {account.accountNumber}</p>
                          <p className='text-xs text-muted-foreground mt-1'>Added: {account.addedAt ? new Date(account.addedAt).toLocaleDateString() : 'N/A'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action History */}
                {user.userActions && user.userActions.length > 0 && (
                  <div className='border-t border-border pt-4'>
                    <h4 className='font-semibold text-foreground mb-2'>Action History</h4>
                    <div className='space-y-2'>
                      {user.userActions.slice(-3).map((action: any, idx: number) => (
                        <div key={idx} className='text-xs bg-background p-2 rounded border border-border'>
                          <p className='font-semibold text-foreground capitalize'>{action.type}</p>
                          <p className='text-muted-foreground'>{action.reason}</p>
                          <p className='text-muted-foreground text-xs'>{new Date(action.actionTakenAt).toLocaleString()}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                <div className='border-t border-border pt-4'>
                  <p className='text-xs font-semibold text-muted-foreground mb-3'>Take Action</p>
                  <div className='space-y-3'>
                    {/* Warn */}
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        placeholder='Warn reason...'
                        value={actionReason[`${user._id}-warn`] || ''}
                        onChange={(e) => setActionReason(prev => ({ ...prev, [`${user._id}-warn`]: e.target.value }))}
                        className='flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm'
                      />
                      <button
                        onClick={() => onWarn(user._id, actionReason[`${user._id}-warn`])}
                        disabled={isProcessing || !actionReason[`${user._id}-warn`]}
                        className='px-4 py-2 rounded-lg bg-yellow-600 text-white font-semibold hover:bg-yellow-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-2'
                      >
                        <MessageSquare size={16} />
                        Warn
                      </button>
                    </div>

                    {/* Flag */}
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        placeholder='Flag reason...'
                        value={actionReason[`${user._id}-flag`] || ''}
                        onChange={(e) => setActionReason(prev => ({ ...prev, [`${user._id}-flag`]: e.target.value }))}
                        className='flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm'
                      />
                      <button
                        onClick={() => onFlag(user._id, actionReason[`${user._id}-flag`])}
                        disabled={isProcessing || !actionReason[`${user._id}-flag`]}
                        className='px-4 py-2 rounded-lg bg-orange-600 text-white font-semibold hover:bg-orange-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-2'
                      >
                        <AlertTriangle size={16} />
                        Flag
                      </button>
                    </div>

                    {/* Suspend */}
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        placeholder='Suspension reason...'
                        value={actionReason[`${user._id}-suspend`] || ''}
                        onChange={(e) => setActionReason(prev => ({ ...prev, [`${user._id}-suspend`]: e.target.value }))}
                        className='flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm'
                      />
                      <button
                        onClick={() => onSuspend(user._id, actionReason[`${user._id}-suspend`])}
                        disabled={isProcessing || !actionReason[`${user._id}-suspend`]}
                        className='px-4 py-2 rounded-lg bg-red-600 text-white font-semibold hover:bg-red-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-2'
                      >
                        <Ban size={16} />
                        Suspend
                      </button>
                    </div>

                    {/* Delete */}
                    <div className='flex gap-2'>
                      <input
                        type='text'
                        placeholder='Deletion reason...'
                        value={actionReason[`${user._id}-delete`] || ''}
                        onChange={(e) => setActionReason(prev => ({ ...prev, [`${user._id}-delete`]: e.target.value }))}
                        className='flex-1 px-3 py-2 rounded-lg bg-background border border-border text-foreground placeholder-muted-foreground focus:outline-none focus:ring-2 focus:ring-primary text-sm'
                      />
                      <button
                        onClick={() => onDelete(user._id, actionReason[`${user._id}-delete`])}
                        disabled={isProcessing || !actionReason[`${user._id}-delete`]}
                        className='px-4 py-2 rounded-lg bg-gray-600 text-white font-semibold hover:bg-gray-700 transition-colors disabled:opacity-50 text-sm flex items-center gap-2'
                      >
                        <Trash2 size={16} />
                        Delete
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))
      )}
    </div>
  );
}
