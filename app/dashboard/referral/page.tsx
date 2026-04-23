'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowLeft, Share2, Copy, Check, Users, TrendingUp, DollarSign, UserPlus } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { ProtectedRoute } from '@/components/ProtectedRoute';
import { apiClient } from '@/lib/api';

interface ReferralData {
  id: string;
  name: string;
  email?: string;
  joinedAt: string;
  totalInvested: number;
  commissionEarned: number;
}

interface ReferralStats {
  referralCode: string;
  stats: {
    totalReferrals: number;
    activeReferrals: number;
    tier1Count: number;
    tier2Count: number;
    tier3Count: number;
    tier1Earnings: number;
    tier2Earnings: number;
    tier3Earnings: number;
    totalCommissions: number;
    pendingCommissions: number;
  };
  referrals: {
    tier1: ReferralData[];
    tier2: ReferralData[];
    tier3: ReferralData[];
  };
}

export default function ReferralPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [referralData, setReferralData] = useState<ReferralStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);
  const [activeTab, setActiveTab] = useState<'tier1' | 'tier2' | 'tier3'>('tier1');

  useEffect(() => {
    const loadReferralInfo = async () => {
      try {
        setLoading(true);
        const data = await apiClient.getReferralStats();
        setReferralData(data);
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

  const referralCode = referralData?.referralCode || '';
  const referralLink = typeof window !== 'undefined' 
    ? `${window.location.origin}/auth/register?ref=${referralCode}`
    : `https://powabitz.com/auth/register?ref=${referralCode}`;

  const copyReferralLink = () => {
    navigator.clipboard.writeText(referralLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const copyReferralCode = () => {
    navigator.clipboard.writeText(referralCode);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const shareOnSocial = (platform: string) => {
    const message = `Join me on Powabitz and earn 3% daily returns! Use my referral code ${referralCode}`;
    const encodedMessage = encodeURIComponent(message);
    
    const shareUrls: { [key: string]: string } = {
      x: `https://twitter.com/intent/tweet?text=${encodedMessage}&url=${encodeURIComponent(referralLink)}`,
      whatsapp: `https://wa.me/?text=${encodedMessage} ${encodeURIComponent(referralLink)}`,
      telegram: `https://t.me/share/url?url=${encodeURIComponent(referralLink)}&text=${encodedMessage}`
    };

    if (shareUrls[platform]) {
      window.open(shareUrls[platform], '_blank', 'width=600,height=400');
    }
  };

  const stats = referralData?.stats || {
    totalReferrals: 0,
    activeReferrals: 0,
    tier1Count: 0,
    tier2Count: 0,
    tier3Count: 0,
    tier1Earnings: 0,
    tier2Earnings: 0,
    tier3Earnings: 0,
    totalCommissions: 0,
    pendingCommissions: 0
  };

  const formatCurrency = (amount: number) => {
    return amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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
                <p className='text-xs text-muted-foreground mt-1'>
                  T1: {stats.tier1Count} | T2: {stats.tier2Count} | T3: {stats.tier3Count}
                </p>
              </div>
              <div className='p-6 rounded-lg bg-card border border-border'>
                <div className='flex items-center justify-between mb-3'>
                  <p className='text-sm text-muted-foreground'>Active Referrals</p>
                  <TrendingUp className='text-secondary' size={20} />
                </div>
                <p className='text-2xl font-bold text-foreground'>{stats.activeReferrals}</p>
                <p className='text-xs text-muted-foreground mt-1'>Users who have invested</p>
              </div>
              <div className='p-6 rounded-lg bg-card border border-border'>
                <div className='flex items-center justify-between mb-3'>
                  <p className='text-sm text-muted-foreground'>Total Commissions</p>
                  <DollarSign className='text-green-500' size={20} />
                </div>
                <p className='text-2xl font-bold text-green-600'>${formatCurrency(stats.totalCommissions)}</p>
                <p className='text-xs text-muted-foreground mt-1'>All time earnings</p>
              </div>
              <div className='p-6 rounded-lg bg-card border border-border'>
                <div className='flex items-center justify-between mb-3'>
                  <p className='text-sm text-muted-foreground'>Commission Breakdown</p>
                  <UserPlus className='text-accent' size={20} />
                </div>
                <div className='space-y-1'>
                  <p className='text-sm'><span className='text-muted-foreground'>T1 (5%):</span> <span className='text-green-600 font-semibold'>${formatCurrency(stats.tier1Earnings)}</span></p>
                  <p className='text-sm'><span className='text-muted-foreground'>T2 (2%):</span> <span className='text-green-600 font-semibold'>${formatCurrency(stats.tier2Earnings)}</span></p>
                  <p className='text-sm'><span className='text-muted-foreground'>T3 (1%):</span> <span className='text-green-600 font-semibold'>${formatCurrency(stats.tier3Earnings)}</span></p>
                </div>
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
                      <code className='text-lg font-bold text-primary'>{referralCode}</code>
                    </div>
                    <button
                      onClick={copyReferralCode}
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
                  onClick={() => shareOnSocial('x')}
                  className='p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-all text-center'
                  title='Share on X (Twitter)'
                >
                  <div className='text-2xl mb-2'>𝕏</div>
                  <p className='text-sm font-semibold text-foreground'>X</p>
                </button>
                <button
                  onClick={() => shareOnSocial('telegram')}
                  className='p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-all text-center'
                  title='Share on Telegram'
                >
                  <div className='text-2xl mb-2'>✈️</div>
                  <p className='text-sm font-semibold text-foreground'>Telegram</p>
                </button>
                <button
                  onClick={() => shareOnSocial('whatsapp')}
                  className='p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-all text-center'
                  title='Share on WhatsApp'
                >
                  <div className='text-2xl mb-2'>W</div>
                  <p className='text-sm font-semibold text-foreground'>WhatsApp</p>
                </button>
                <a
                  href='https://t.me/+-6a0vxmmxtk4ZjFk'
                  target='_blank'
                  rel='noopener noreferrer'
                  className='p-4 rounded-lg border border-border hover:border-primary hover:bg-primary/10 transition-all text-center'
                  title='Join our Telegram community'
                >
                  <div className='text-2xl mb-2'>👥</div>
                  <p className='text-sm font-semibold text-foreground'>Community</p>
                </a>
              </div>
            </div>

            {/* Referral List */}
            <div className='p-8 rounded-lg bg-card border border-border'>
              <h2 className='text-xl font-bold text-foreground mb-6'>Your Referrals</h2>
              
              {/* Tier Tabs */}
              <div className='flex gap-2 mb-6'>
                <button
                  onClick={() => setActiveTab('tier1')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'tier1' 
                      ? 'bg-primary text-primary-foreground' 
                      : 'bg-background border border-border text-foreground hover:bg-primary/10'
                  }`}
                >
                  Tier 1 (5%) - {stats.tier1Count}
                </button>
                <button
                  onClick={() => setActiveTab('tier2')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'tier2' 
                      ? 'bg-secondary text-secondary-foreground' 
                      : 'bg-background border border-border text-foreground hover:bg-secondary/10'
                  }`}
                >
                  Tier 2 (2%) - {stats.tier2Count}
                </button>
                <button
                  onClick={() => setActiveTab('tier3')}
                  className={`px-4 py-2 rounded-lg text-sm font-semibold transition-all ${
                    activeTab === 'tier3' 
                      ? 'bg-accent text-accent-foreground' 
                      : 'bg-background border border-border text-foreground hover:bg-accent/10'
                  }`}
                >
                  Tier 3 (1%) - {stats.tier3Count}
                </button>
              </div>

              {/* Referral Table */}
              <div className='overflow-x-auto'>
                {referralData?.referrals[activeTab]?.length ? (
                  <table className='w-full'>
                    <thead>
                      <tr className='border-b border-border'>
                        <th className='text-left py-3 px-4 text-sm font-semibold text-muted-foreground'>Name</th>
                        <th className='text-left py-3 px-4 text-sm font-semibold text-muted-foreground'>Joined</th>
                        <th className='text-right py-3 px-4 text-sm font-semibold text-muted-foreground'>Invested</th>
                        <th className='text-right py-3 px-4 text-sm font-semibold text-muted-foreground'>Your Commission</th>
                      </tr>
                    </thead>
                    <tbody>
                      {referralData.referrals[activeTab].map((referral, index) => (
                        <tr key={referral.id || index} className='border-b border-border/50 hover:bg-background/50'>
                          <td className='py-3 px-4'>
                            <p className='font-semibold text-foreground'>{referral.name}</p>
                          </td>
                          <td className='py-3 px-4 text-muted-foreground'>
                            {new Date(referral.joinedAt).toLocaleDateString()}
                          </td>
                          <td className='py-3 px-4 text-right text-foreground'>
                            ${formatCurrency(referral.totalInvested)}
                          </td>
                          <td className='py-3 px-4 text-right text-green-600 font-semibold'>
                            ${formatCurrency(referral.commissionEarned)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <div className='text-center py-12'>
                    <Users className='mx-auto text-muted-foreground mb-4' size={48} />
                    <p className='text-muted-foreground'>No {activeTab.replace('tier', 'Tier ')} referrals yet</p>
                    <p className='text-sm text-muted-foreground mt-2'>Share your referral link to start earning!</p>
                  </div>
                )}
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
                    desc: 'Your friend makes an investment and gets it approved'
                  },
                  {
                    step: 4,
                    title: 'You Earn Instantly',
                    desc: 'Receive 5% commission on their investment instantly when confirmed. Commissions are added to your Total Balance and are withdrawable!'
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
              <h2 className='text-xl font-bold text-foreground mb-4'>3-Tier Commission Structure</h2>
              <div className='space-y-3 text-sm'>
                <p className='text-muted-foreground'>Earn commissions based on your referral tier when they invest:</p>
                <div className='grid grid-cols-1 md:grid-cols-3 gap-4 mt-4'>
                  <div className='p-4 rounded-lg bg-background border border-primary/30'>
                    <p className='font-semibold text-foreground mb-2'>Tier 1 - Direct</p>
                    <p className='text-primary font-bold text-2xl'>5%</p>
                    <p className='text-xs text-muted-foreground mt-2'>Of every investment made by users you directly refer</p>
                  </div>
                  <div className='p-4 rounded-lg bg-background border border-secondary/30'>
                    <p className='font-semibold text-foreground mb-2'>Tier 2 - Indirect</p>
                    <p className='text-secondary font-bold text-2xl'>2%</p>
                    <p className='text-xs text-muted-foreground mt-2'>Of investments by users referred by your Tier 1 referrals</p>
                  </div>
                  <div className='p-4 rounded-lg bg-background border border-accent/30'>
                    <p className='font-semibold text-foreground mb-2'>Tier 3 - Extended</p>
                    <p className='text-accent font-bold text-2xl'>1%</p>
                    <p className='text-xs text-muted-foreground mt-2'>Of investments by users referred by your Tier 2 referrals</p>
                  </div>
                </div>
                <div className='mt-4 p-4 bg-green-500/10 border border-green-500/20 rounded-lg'>
                  <p className='text-green-700 font-semibold'>Instant Withdrawable Commissions</p>
                  <p className='text-sm text-green-600 mt-1'>All referral commissions are instantly credited to your Total Balance and can be withdrawn immediately!</p>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </ProtectedRoute>
  );
}
