'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2, Copy, Check, Users, TrendingUp } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface ReferralStats {
  totalReferrals: number;
  activeReferrals: number;
  totalCommissions: number;
  pendingCommissions: number;
  referralCode: string;
}

export default function ReferralPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [stats, setStats] = useState<ReferralStats>({
    totalReferrals: 0,
    activeReferrals: 0,
    totalCommissions: 0,
    pendingCommissions: 0,
    referralCode: ''
  });
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const loadReferralInfo = async () => {
      try {
        setLoading(true);
        // Generate referral code from user ID
        const referralCode = user?.id?.slice(0, 8).toUpperCase() || 'REF12345';
        
        setStats({
          totalReferrals: 0,
          activeReferrals: 0,
          totalCommissions: 0,
          pendingCommissions: 0,
          referralCode: referralCode
        });
      } catch (err) {
        console.error('[v0] Error loading referral info:', err);
      } finally {
        setLoading(false);
      }
    };

    if (user) {
      loadReferralInfo();
    }
  }, [user]);

  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/?ref=${stats.referralCode}`
    : `https://powabitz.com/?ref=${stats.referralCode}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnSocial = (platform: string) => {
    const message = `Join me on Powabitz and earn 10% daily returns! Use my referral code ${stats.referralCode}`;
    const encodedMessage = encodeURIComponent(message);
    
    const shareUrls: { [key: string]: string } = {
      twitter: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${referralLink}`,
      facebook: `https://www.facebook.com/sharer/sharer.php?u=${referralLink}`,
      whatsapp: `https://wa.me/?text=${encodedMessage} ${referralLink}`,
      telegram: `https://t.me/share/url?url=${referralLink}&text=${encodedMessage}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  return (
    <ProtectedRoute requireUser>
      <div className='space-y-8'>
        {/* Header */}
        <div>
          <Link href='/dashboard' className='inline-flex items-center gap-2 text-primary hover:text-secondary transition-colors mb-6'>
            <ArrowLeft size={20} />
            Back to Dashboard
          </Link>
          <h1 className='text-3xl font-bold text-foreground'>Referral Program</h1>
          <p className='text-muted-foreground mt-2'>Earn commissions by referring friends to Powabitz</p>
        </div>

        {loading ? (
          <div className='flex items-center justify-center min-h-[400px]'>
            <div className='text-center'>
              <div className='inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-primary'></div>
              <p className='mt-4 text-gray-600'>Loading referral information...</p>
            </div>
          </div>
        ) : (
          <div className='space-y-6'>
            {/* Stats Cards */}
            <div className='grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4'>
              <div className='p-6 rounded-lg bg-card border border-border'>
                <div className='flex items-center justify-between mb-3'>
                  <p className='text-sm text-muted-foreground'>Total Referrals</p>
                  <Users className='text-primary' size={20} />
                </div>
                <p className='text-2xl font-bold text-foreground'>{stats.totalReferrals}</p>
              </div>
              <div className='p-6 rounded-lg bg-card border border-border'>
                <div className='flex items-center justify-between mb-3'>
                  <p className='text-sm text-muted-foreground'>Active Referrals</p>
                  <TrendingUp className='text-secondary' size={20} />
                </div>
                <p className='text-2xl font-bold text-foreground'>{stats.activeReferrals}</p>
              </div>
              <div className='p-6 rounded-lg bg-card border border-border'>
                <div className='flex items-center justify-between mb-3'>
                  <p className='text-sm text-muted-foreground'>Total Commissions</p>
                  <span className='text-primary font-bold'>$</span>
                </div>
                <p className='text-2xl font-bold text-foreground'>${stats.totalCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
              <div className='p-6 rounded-lg bg-card border border-border'>
                <div className='flex items-center justify-between mb-3'>
                  <p className='text-sm text-muted-foreground'>Pending Commissions</p>
                  <span className='text-accent font-bold'>$</span>
                </div>
                <p className='text-2xl font-bold text-foreground'>${stats.pendingCommissions.toLocaleString('en-US', { minimumFractionDigits: 2 })}</p>
              </div>
            </div>

            {/* Referral Code Section */}
            <div className='p-8 rounded-lg bg-gradient-to-br from-primary/10 to-secondary/10 border border-primary/20'>
              <h2 className='text-xl font-bold text-foreground mb-6'>Your Referral Code</h2>
              
              <div className='space-y-4'>
                <div>
                  <p className='text-sm text-muted-foreground mb-3'>Unique Referral Code</p>
                  <div className='flex items-center gap-2'>
                    <div className='flex-1 px-4 py-3 rounded-lg bg-background border border-border'>
                      <code className='text-lg font-bold text-primary'>{stats.referralCode}</code>
                    </div>
                    <button
                      onClick={() => {
                        navigator.clipboard.writeText(stats.referralCode);
                        setCopied(true);
                        setTimeout(() => setCopied(false), 2000);
                      }}
                      className='px-4 py-3 rounded-lg border border-border text-foreground hover:bg-background transition-colors'
                    >
                      {copied ? <Check size={20} className='text-green-600' /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>

                <div>
                  <p className='text-sm text-muted-foreground mb-3'>Your Referral Link</p>
                  <div className='flex items-center gap-2'>
                    <div className='flex-1 px-4 py-3 rounded-lg bg-background border border-border overflow-x-auto'>
                      <code className='text-sm font-mono text-primary break-all'>{referralLink}</code>
                    </div>
                    <button
                      onClick={copyReferralLink}
                      className='px-4 py-3 rounded-lg border border-border text-foreground hover:bg-background transition-colors flex-shrink-0'
                    >
                      {copied ? <Check size={20} className='text-green-600' /> : <Copy size={20} />}
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* Share Section */}
            <div className='p-8 rounded-lg bg-card border border-border'>
              <h2 className='text-xl font-bold text-foreground mb-6 flex items-center gap-2'>
                <Share2 size={24} className='text-secondary' />
                Share Your Referral
              </h2>

              <div className='grid grid-cols-2 md:grid-cols-4 gap-4'>
                <button
                  onClick={() => shareOnSocial('twitter')}
                  className='p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-all text-center'
                >
                  <div className='text-2xl mb-2'>𝕏</div>
                  <p className='text-sm font-semibold text-foreground'>Twitter</p>
                </button>
                <button
                  onClick={() => shareOnSocial('facebook')}
                  className='p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-all text-center'
                >
                  <div className='text-2xl mb-2'>f</div>
                  <p className='text-sm font-semibold text-foreground'>Facebook</p>
                </button>
                <button
                  onClick={() => shareOnSocial('whatsapp')}
                  className='p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-all text-center'
                >
                  <div className='text-2xl mb-2'>💬</div>
                  <p className='text-sm font-semibold text-foreground'>WhatsApp</p>
                </button>
                <button
                  onClick={() => shareOnSocial('telegram')}
                  className='p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-all text-center'
                >
                  <div className='text-2xl mb-2'>✈</div>
                  <p className='text-sm font-semibold text-foreground'>Telegram</p>
                </button>
              </div>
            </div>

            {/* How It Works */}
            <div className='p-8 rounded-lg bg-card border border-border'>
              <h2 className='text-xl font-bold text-foreground mb-6'>How It Works</h2>

              <div className='space-y-4'>
                {[
                  {
                    step: 1,
                    title: 'Share Your Code',
                    desc: 'Give your unique referral code or link to friends and family'
                  },
                  {
                    step: 2,
                    title: 'They Sign Up',
                    desc: 'Your friend registers using your referral code'
                  },
                  {
                    step: 3,
                    title: 'They Invest',
                    desc: 'Your friend makes their first investment'
                  },
                  {
                    step: 4,
                    title: 'You Earn',
                    desc: 'Receive 5% commission on their investment amount'
                  }
                ].map((item) => (
                  <div key={item.step} className='flex gap-4'>
                    <div className='w-8 h-8 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-white font-bold flex-shrink-0'>
                      {item.step}
                    </div>
                    <div>
                      <p className='font-semibold text-foreground'>{item.title}</p>
                      <p className='text-sm text-muted-foreground'>{item.desc}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Commission Info */}
            <div className='p-8 rounded-lg bg-accent/10 border border-accent/20'>
              <h2 className='text-xl font-bold text-foreground mb-4'>Commission Structure</h2>
              <div className='space-y-3 text-sm'>
                <p className='text-muted-foreground'>Earn commissions based on your referral tier:</p>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
                  <div className='p-4 rounded-lg bg-background border border-border'>
                    <p className='font-semibold text-foreground mb-2'>Tier 1</p>
                    <p className='text-accent font-bold text-lg'>5%</p>
                    <p className='text-xs text-muted-foreground mt-2'>Direct referrals</p>
                  </div>
                  <div className='p-4 rounded-lg bg-background border border-border'>
                    <p className='font-semibold text-foreground mb-2'>Tier 2</p>
                    <p className='text-secondary font-bold text-lg'>2%</p>
                    <p className='text-xs text-muted-foreground mt-2'>Second level</p>
                  </div>
                  <div className='p-4 rounded-lg bg-background border border-border'>
                    <p className='font-semibold text-foreground mb-2'>Bonus</p>
                    <p className='text-primary font-bold text-lg'>1%</p>
                    <p className='text-xs text-muted-foreground mt-2'>Tier milestone</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
