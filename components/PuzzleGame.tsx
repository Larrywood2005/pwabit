'use client';

import { useState, useEffect } from 'react';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Zap, Lightbulb } from 'lucide-react';
import { apiClient } from '@/lib/api';
import { useToast } from '@/hooks/use-toast';
import SuccessRewardModal from '@/components/SuccessRewardModal';

interface PuzzleGameProps {
  onRewardClaimed?: (amount: number) => void;
}

interface Puzzle {
  id: number;
  question: string;
  options: string[];
  correct: number;
  reward: number;
}

const allPuzzles: Puzzle[] = [
  {
    id: 1,
    question: 'What is the total supply of Bitcoin after all halvings are complete?',
    options: ['19.5 million', '20.999999 million', '21 million', '22.5 million'],
    correct: 2,
    reward: 0.03
  },
  {
    id: 2,
    question: 'Which consensus mechanism does Bitcoin use?',
    options: ['Proof of Stake', 'Proof of Work', 'Delegated Proof of Stake', 'Proof of Authority'],
    correct: 1,
    reward: 0.03
  },
  {
    id: 3,
    question: 'What is the average block time for Bitcoin?',
    options: ['5 minutes', '10 minutes', '15 minutes', '20 minutes'],
    correct: 1,
    reward: 0.03
  },
  {
    id: 4,
    question: 'Which Ethereum upgrade introduced staking?',
    options: ['The Merge', 'London Hard Fork', 'Istanbul', 'Shanghai/Capella'],
    correct: 3,
    reward: 0.03
  },
  {
    id: 5,
    question: 'What is the current Ethereum consensus mechanism post-2022?',
    options: ['Proof of Work', 'Proof of Stake', 'Proof of History', 'Proof of Authority'],
    correct: 1,
    reward: 0.03
  },
  {
    id: 6,
    question: 'How many validators are required to finalize a block on Ethereum?',
    options: ['32', '128', '2/3 of validators', '50% of stake'],
    correct: 2,
    reward: 0.03
  },
  {
    id: 7,
    question: 'What is the maximum supply of Ethereum?',
    options: ['100 million', '115 million', 'Unlimited', '21 million'],
    correct: 2,
    reward: 0.03
  },
  {
    id: 8,
    question: 'Which EIP introduced smart contracts to Ethereum?',
    options: ['EIP-20', 'EIP-658', 'Original Ethereum whitepaper', 'EIP-1559'],
    correct: 2,
    reward: 0.03
  },
  {
    id: 9,
    question: 'What does DeFi stand for in cryptocurrency?',
    options: ['Digital Finance', 'Decentralized Finance', 'Direct Finance', 'Distributed Finance'],
    correct: 1,
    reward: 0.03
  },
  {
    id: 10,
    question: 'Which protocol is used for atomic swaps?',
    options: ['HTLC', 'USTL', 'BTCL', 'ETHC'],
    correct: 0,
    reward: 0.03
  }
];

// Get 5 random puzzles for each game session (FIXED: memoized to prevent re-generation on refresh)
const getRandomPuzzles = (): Puzzle[] => {
  const shuffled = [...allPuzzles].sort(() => Math.random() - 0.5);
  return shuffled.slice(0, 5);
};

export default function PuzzleGame({ onRewardClaimed }: PuzzleGameProps) {
  const { toast } = useToast();
  const [gameActive, setGameActive] = useState(false);
  const [currentPuzzleIndex, setCurrentPuzzleIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState<number | null>(null);
  const [answered, setAnswered] = useState(false);
  const [correctCount, setCorrectCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [canClaim, setCanClaim] = useState(true);
  const [claimLoading, setClaimLoading] = useState(false);
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [rewardAmount, setRewardAmount] = useState(0);

  useEffect(() => {
    checkClaimEligibility();
  }, []);

  // FIXED: Generate puzzles when game starts, not on every render
  const generatePuzzles = () => {
    const newPuzzles = getRandomPuzzles();
    setPuzzles(newPuzzles);
  };

  const checkClaimEligibility = async () => {
    try {
      const result = await apiClient.checkGameClaimEligibility('puzzle');
      setCanClaim(!result.alreadyClaimed);
    } catch (error) {
      console.error('[v0] Check claim eligibility error:', error);
    }
  };

  const currentPuzzle = puzzles[currentPuzzleIndex];
  const isCorrect = currentPuzzle && selectedAnswer === currentPuzzle.correct;

  const handleAnswerClick = (index: number) => {
    if (!answered) {
      setSelectedAnswer(index);
      setAnswered(true);
      if (index === currentPuzzle.correct) {
        setCorrectCount(prev => prev + 1);
      }
    }
  };

  const handleNext = () => {
    if (currentPuzzleIndex < puzzles.length - 1) {
      setCurrentPuzzleIndex(prev => prev + 1);
      setSelectedAnswer(null);
      setAnswered(false);
    } else {
      // Game finished
      setGameActive(false);
    }
  };

  const handleClaimReward = async () => {
    try {
      setClaimLoading(true);
      console.log('[v0] Starting claim reward request...');
      const reward = await apiClient.claimPuzzleWinReward();
      console.log('[v0] Reward claimed successfully:', reward);
      
      const amount = reward?.reward?.amount || reward?.amount || 0.03;
      console.log('[v0] Setting reward amount:', amount);
      setRewardAmount(amount);
      console.log('[v0] Setting showSuccessModal to TRUE');
      setShowSuccessModal(true);
      
      onRewardClaimed?.(amount);
      setCanClaim(false);
      setGameActive(false);
      setCurrentPuzzleIndex(0);
      setCorrectCount(0);
      setSelectedAnswer(null);
      setAnswered(false);
    } catch (error: any) {
      console.error('[v0] Full error object:', error);
      let errorMessage = 'Failed to claim reward. Please try again.';
      
      if (error instanceof Error) {
        errorMessage = error.message;
      } else if (error?.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error?.message) {
        errorMessage = error.message;
      }
      
      console.error('[v0] Claim reward error:', errorMessage);
      toast({
        title: 'Error',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setClaimLoading(false);
    }
  };

  const handleStartGame = () => {
    generatePuzzles(); // FIXED: Generate puzzles when starting, not before
    setGameActive(true);
    setCurrentPuzzleIndex(0);
    setCorrectCount(0);
    setSelectedAnswer(null);
    setAnswered(false);
  };

  if (!gameActive) {
    return (
      <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="p-3 rounded-lg bg-purple-600/20">
              <Lightbulb className="text-purple-600" size={24} />
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">Puzzle Game</h3>
              <p className="text-xs text-muted-foreground">Answer crypto trivia questions</p>
            </div>
          </div>
        </div>

        <p className="text-sm text-muted-foreground mb-4">
          Test your crypto knowledge and earn rewards! Play once per day and earn $0.03 for completing the game.
        </p>

        <div className="space-y-3 mb-6">
          <div className="flex items-center gap-2 text-sm">
            <Zap className="text-yellow-500" size={16} />
            <span className="text-foreground font-semibold">5 questions</span>
            <span className="text-muted-foreground">|</span>
            <span className="text-foreground font-semibold">2 minutes</span>
          </div>
          <div className="text-xs text-muted-foreground">
            Reward: <span className="font-bold text-green-600">$0.03</span> added to your account
          </div>
        </div>

        <Button
          onClick={handleStartGame}
          disabled={!canClaim}
          className="w-full"
        >
          {canClaim ? 'Start Puzzle Game' : 'Already Played Today'}
        </Button>
      </Card>
    );
  }

  // Game is active
  const gameFinished = currentPuzzleIndex >= puzzles.length - 1 && answered;
  const totalReward = 0.03; // Fixed reward of $0.03 per game completion

  return (
    <Card className="p-6 bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
      {!gameFinished ? (
        <>
          {/* Progress */}
          <div className="mb-6">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-semibold text-foreground">
                Question {currentPuzzleIndex + 1} of {puzzles.length}
              </p>
              <p className="text-sm text-muted-foreground">
                Correct: {correctCount}
              </p>
            </div>
            <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-600 transition-all duration-300"
                style={{ width: `${((currentPuzzleIndex + 1) / puzzles.length) * 100}%` }}
              />
            </div>
          </div>

          {/* Question */}
          <h3 className="text-lg font-bold text-foreground mb-4">{currentPuzzle.question}</h3>

          {/* Options */}
          <div className="space-y-2 mb-6">
            {currentPuzzle.options.map((option, index) => (
              <button
                key={index}
                onClick={() => handleAnswerClick(index)}
                disabled={answered}
                className={`w-full p-4 rounded-lg border-2 text-left font-semibold transition-all ${
                  !answered
                    ? 'border-border hover:border-primary cursor-pointer'
                    : index === currentPuzzle.correct
                    ? 'border-green-500 bg-green-500/20 text-foreground'
                    : index === selectedAnswer
                    ? 'border-red-500 bg-red-500/20 text-foreground'
                    : 'border-border text-muted-foreground'
                }`}
              >
                <div className="flex items-center gap-3">
                  <div
                    className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                      selectedAnswer === index ? 'border-foreground' : 'border-muted-foreground'
                    }`}
                  >
                    {selectedAnswer === index && (
                      <div className="w-3 h-3 rounded-full bg-foreground" />
                    )}
                  </div>
                  {option}
                </div>
              </button>
            ))}
          </div>

          {/* Feedback */}
          {answered && (
            <div
              className={`p-3 rounded-lg mb-6 text-sm ${
                isCorrect
                  ? 'bg-green-500/10 border border-green-500/30 text-green-600'
                  : 'bg-red-500/10 border border-red-500/30 text-red-600'
              }`}
            >
              {isCorrect ? '✓ Correct!' : `✗ Incorrect. The answer was: ${currentPuzzle.options[currentPuzzle.correct]}`}
            </div>
          )}

          {/* Next Button */}
          {answered && (
            <Button onClick={handleNext} className="w-full">
              {currentPuzzleIndex < puzzles.length - 1 ? 'Next Question' : 'See Results'}
            </Button>
          )}
        </>
      ) : (
        <>
          {/* Results Screen */}
          <div className="text-center mb-6">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-purple-600/20 mb-4">
              <p className="text-3xl font-bold text-purple-600">{correctCount}/{puzzles.length}</p>
            </div>
            <h3 className="text-xl font-bold text-foreground mb-2">Game Finished!</h3>
            <p className="text-sm text-muted-foreground mb-4">
              You got {correctCount} out of {puzzles.length} questions correct.
            </p>
            <div className="bg-gradient-to-r from-green-500/20 to-emerald-500/20 border border-green-500/30 rounded-lg p-4 mb-6">
              <p className="text-xs text-muted-foreground mb-1">Reward Earned</p>
              <p className="text-2xl font-bold text-green-600">${totalReward.toFixed(2)}</p>
            </div>
          </div>

          <Button
            onClick={handleClaimReward}
            disabled={claimLoading}
            className="w-full"
          >
            {claimLoading ? 'Claiming...' : 'Claim Reward'}
          </Button>
        </>
      )}

      <SuccessRewardModal
        isOpen={showSuccessModal}
        amount={rewardAmount}
        rewardType="puzzle"
        onClose={() => setShowSuccessModal(false)}
      />
    </Card>
  );
}
