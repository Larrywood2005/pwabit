'use client';

import { AlertTriangle, Ban, AlertCircle, MessageSquare } from 'lucide-react';
import { useEffect, useState } from 'react';

interface UserAlertProps {
  user: any;
}

export function UserStatusAlert({ user }: UserAlertProps) {
  const [isVisible, setIsVisible] = useState(true);

  if (!user || user.status === 'active') return null;

  const getAlertConfig = (status: string) => {
    switch (status) {
      case 'suspended':
        return {
          icon: Ban,
          title: 'Account Suspended',
          color: 'from-red-600 to-red-500',
          bgColor: 'bg-red-500/20',
          borderColor: 'border-red-500/50',
          textColor: 'text-red-700'
        };
      case 'flagged':
        return {
          icon: AlertTriangle,
          title: 'Account Flagged',
          color: 'from-yellow-600 to-yellow-500',
          bgColor: 'bg-yellow-500/20',
          borderColor: 'border-yellow-500/50',
          textColor: 'text-yellow-700'
        };
      case 'warned':
        return {
          icon: AlertCircle,
          title: 'Warning Issued',
          color: 'from-orange-600 to-orange-500',
          bgColor: 'bg-orange-500/20',
          borderColor: 'border-orange-500/50',
          textColor: 'text-orange-700'
        };
      default:
        return null;
    }
  };

  const config = getAlertConfig(user.status);
  if (!config) return null;

  const Icon = config.icon;
  const latestAction = user.userActions?.[user.userActions.length - 1];

  return (
    <div className={`${config.bgColor} border ${config.borderColor} rounded-lg p-4 mb-6 flex items-start gap-4`}>
      <div className={`p-2 rounded-lg bg-gradient-to-br ${config.color} text-white`}>
        <Icon size={24} />
      </div>
      <div className='flex-1'>
        <h3 className={`font-bold ${config.textColor}`}>{config.title}</h3>
        {latestAction && (
          <p className={`text-sm ${config.textColor} mt-1`}>
            Reason: {latestAction.reason || 'No reason provided'}
          </p>
        )}
        <p className={`text-xs ${config.textColor} opacity-75 mt-2`}>
          {user.status === 'suspended' && 'Your account has been temporarily suspended. Please contact support for more information.'}
          {user.status === 'flagged' && 'Your account has been flagged for review. Some features may be limited.'}
          {user.status === 'warned' && 'You have received a warning. Please review our terms and policies.'}
        </p>
        <button
          onClick={() => window.open('mailto:support@powaup.com', '_blank')}
          className={`mt-3 flex items-center gap-2 text-sm font-semibold ${config.textColor} hover:opacity-80 transition-opacity`}
        >
          <MessageSquare size={16} />
          Contact Support
        </button>
      </div>
      <button
        onClick={() => setIsVisible(false)}
        className={`flex-shrink-0 ${config.textColor} hover:opacity-70 transition-opacity`}
      >
        ✕
      </button>
    </div>
  );
}
