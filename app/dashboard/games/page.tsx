'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { ArrowLeft, Gamepad2, Trophy } from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useRouter } from 'next/navigation';
import { apiClient } from '@/lib/api';
import PuzzleGame from '@/components/PuzzleGame';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ProtectedRoute } from '@/components/ProtectedRoute';

interface GameReward {
  _id: string;
  userId: string;
  rewardType: string;
  amount: number;
  date: string;
  streak?: number;
}

function GamesPageContent() {
  const { user } = useAuth();
  const router = useRouter();
  const [rewards, setRewards] = useState<GameReward[]>([]);
  const [loading, setLoading] = useState(true);
  const [totalEarned, setTotalEarned] = useState(0);
  const [currentStreak, setCurrentStreak] = useState(0);

  useEffect(() => {
    if (user) {
      fetchRewards();
    }
  }, [user]);

  const fetchRewards = async () => {
    try {
      setLoading(true);
      const data = await apiClient.getMyRewards();
      setRewards(data.rewards || []);
      setTotalEarned(data.totalEarned || 0);
      setCurrentStreak(data.currentStreak || 0);
    } catch (error) {
      console.error('[v0] Failed to fetch rewards:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleRewardClaimed = async () => {
    // Refresh rewards after claim
    await fetchRewards();
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/dashboard"
            className="p-2 hover:bg-muted rounded-lg transition-colors"
          >
            <ArrowLeft size={20} className="text-muted-foreground" />
          </Link>
          <div>
            <h1 className="text-3xl font-bold text-foreground">Games & Rewards</h1>
            <p className="text-muted-foreground mt-2">Play games and earn daily rewards</p>
          </div>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Card className="p-6 bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Total Earned</p>
              <p className="text-3xl font-bold text-green-600">${totalEarned.toFixed(2)}</p>
            </div>
            <Trophy className="text-green-600" size={40} />
          </div>
        </Card>

        <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-muted-foreground mb-2">Current Streak</p>
              <p className="text-3xl font-bold text-purple-600">{currentStreak} days</p>
            </div>
            <Gamepad2 className="text-purple-600" size={40} />
          </div>
        </Card>
      </div>

      {/* Games Section */}
      <div className="space-y-6">
        <h2 className="text-xl font-bold text-foreground">Available Games</h2>
        
        {/* Puzzle Game */}
        <PuzzleGame onRewardClaimed={handleRewardClaimed} />

        {/* Coming Soon Games */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Card className="p-6 border-dashed opacity-60">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-blue-500/20">
                  <Gamepad2 className="text-blue-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Memory Match</h3>
                  <p className="text-xs text-muted-foreground">Match pairs to win</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Test your memory and earn up to $1.00 daily.
            </p>
            <Button disabled className="w-full">
              Coming Soon
            </Button>
          </Card>

          <Card className="p-6 border-dashed opacity-60">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div className="p-3 rounded-lg bg-orange-500/20">
                  <Gamepad2 className="text-orange-600" size={24} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-foreground">Crypto Quiz</h3>
                  <p className="text-xs text-muted-foreground">Earn crypto knowledge rewards</p>
                </div>
              </div>
            </div>
            <p className="text-sm text-muted-foreground mb-4">
              Answer questions about cryptocurrencies and earn $0.50+ daily.
            </p>
            <Button disabled className="w-full">
              Coming Soon
            </Button>
          </Card>
        </div>
      </div>

      {/* Rewards History */}
      {!loading && (
        <div className="space-y-4">
          <h2 className="text-xl font-bold text-foreground">Recent Rewards</h2>
          {rewards.length > 0 ? (
            <Card className="overflow-hidden">
              <div className="divide-y divide-border">
                {rewards.slice(0, 10).map((reward) => (
                  <div key={reward._id} className="p-4 flex items-center justify-between hover:bg-muted/50 transition-colors">
                    <div>
                      <p className="font-semibold text-foreground capitalize">{reward.rewardType}</p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(reward.date).toLocaleDateString()} at{' '}
                        {new Date(reward.date).toLocaleTimeString()}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-bold text-green-600">${reward.amount.toFixed(2)}</p>
                      {reward.streak && (
                        <p className="text-xs text-muted-foreground">Streak: {reward.streak}</p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </Card>
          ) : (
            <Card className="p-8 text-center">
              <p className="text-muted-foreground">No rewards yet. Start playing to earn!</p>
            </Card>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading && (
        <div className="space-y-4">
          {[1, 2, 3].map(i => (
            <div key={i} className="h-16 bg-muted rounded-lg animate-pulse" />
          ))}
        </div>
      )}
    </div>
  );
}

export default function GamesPage() {
  return (
    <ProtectedRoute>
      <GamesPageContent />
    </ProtectedRoute>
  );
}
