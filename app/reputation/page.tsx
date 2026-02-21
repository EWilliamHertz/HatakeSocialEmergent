'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Star, User, Award, TrendingUp, MessageCircle } from 'lucide-react';

interface ReputationStats {
  averageRating: number;
  totalRatings: number;
  completedTrades: number;
  ratingDistribution: {
    5: number;
    4: number;
    3: number;
    2: number;
    1: number;
  };
}

interface Rating {
  rating_id: string;
  trade_id: string;
  rating: number;
  comment: string;
  created_at: string;
  rater_name: string;
  rater_picture?: string;
}

interface PendingTrade {
  trade_id: string;
  other_user_id: string;
  other_user_name: string;
  other_user_picture?: string;
  completed_at: string;
}

export default function ReputationPage() {
  const router = useRouter();
  const [user, setUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<ReputationStats | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [pendingTrades, setPendingTrades] = useState<PendingTrade[]>([]);
  const [showRatingModal, setShowRatingModal] = useState(false);
  const [selectedTrade, setSelectedTrade] = useState<PendingTrade | null>(null);
  const [newRating, setNewRating] = useState(5);
  const [ratingComment, setRatingComment] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const res = await fetch('/api/auth/me', { credentials: 'include' });
      const data = await res.json();
      if (data.user) {
        setUser(data.user);
        fetchReputation(data.user.user_id);
        fetchPendingRatings();
      } else {
        router.push('/auth/login');
      }
    } catch {
      router.push('/auth/login');
    }
  };

  const fetchReputation = async (userId: string) => {
    try {
      const res = await fetch(`/api/trades/reputation?userId=${userId}`, {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setStats(data.stats);
        setRatings(data.ratings || []);
      }
    } catch (err) {
      console.error('Failed to fetch reputation:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingRatings = async () => {
    try {
      const res = await fetch('/api/trades/reputation/pending', {
        credentials: 'include',
      });
      const data = await res.json();
      if (data.success) {
        setPendingTrades(data.pendingTrades || []);
      }
    } catch (err) {
      console.error('Failed to fetch pending ratings:', err);
    }
  };

  const submitRating = async () => {
    if (!selectedTrade) return;
    
    setSubmitting(true);
    try {
      const res = await fetch('/api/trades/reputation', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tradeId: selectedTrade.trade_id,
          ratedUserId: selectedTrade.other_user_id,
          rating: newRating,
          comment: ratingComment,
        }),
      });
      const data = await res.json();
      if (data.success) {
        setShowRatingModal(false);
        setSelectedTrade(null);
        setNewRating(5);
        setRatingComment('');
        fetchReputation(user.user_id);
        fetchPendingRatings();
      }
    } catch (err) {
      console.error('Failed to submit rating:', err);
    } finally {
      setSubmitting(false);
    }
  };

  const renderStars = (rating: number, size: 'sm' | 'md' | 'lg' = 'md') => {
    const sizeClasses = { sm: 'w-3 h-3', md: 'w-5 h-5', lg: 'w-6 h-6' };
    return (
      <div className="flex items-center gap-0.5">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`${sizeClasses[size]} ${
              star <= rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'
            }`}
          />
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="animate-spin w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <div className="bg-white dark:bg-gray-800 border-b dark:border-gray-700 px-6 py-4">
        <div className="max-w-4xl mx-auto">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Trading Reputation</h1>
          <p className="text-gray-500 dark:text-gray-400">Your trading history and ratings</p>
        </div>
      </div>

      <div className="max-w-4xl mx-auto p-6 space-y-6">
        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Average Rating */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-yellow-100 dark:bg-yellow-900/30 flex items-center justify-center">
                <Star className="w-6 h-6 text-yellow-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Average Rating</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.averageRating?.toFixed(1) || '0.0'}
                </p>
              </div>
            </div>
            {renderStars(Math.round(stats?.averageRating || 0), 'lg')}
          </div>

          {/* Total Ratings */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <MessageCircle className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Total Ratings</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.totalRatings || 0}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">From trade partners</p>
          </div>

          {/* Completed Trades */}
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <div className="flex items-center gap-3 mb-4">
              <div className="w-12 h-12 rounded-full bg-green-100 dark:bg-green-900/30 flex items-center justify-center">
                <TrendingUp className="w-6 h-6 text-green-500" />
              </div>
              <div>
                <p className="text-sm text-gray-500 dark:text-gray-400">Completed Trades</p>
                <p className="text-3xl font-bold text-gray-900 dark:text-white">
                  {stats?.completedTrades || 0}
                </p>
              </div>
            </div>
            <p className="text-sm text-gray-500 dark:text-gray-400">Successful transactions</p>
          </div>
        </div>

        {/* Rating Distribution */}
        {stats && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Rating Distribution</h2>
            <div className="space-y-3">
              {[5, 4, 3, 2, 1].map((star) => {
                const count = stats.ratingDistribution?.[star as keyof typeof stats.ratingDistribution] || 0;
                const percentage = stats.totalRatings > 0 ? (count / stats.totalRatings) * 100 : 0;
                return (
                  <div key={star} className="flex items-center gap-3">
                    <div className="w-12 flex items-center gap-1">
                      <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{star}</span>
                      <Star className="w-4 h-4 fill-yellow-400 text-yellow-400" />
                    </div>
                    <div className="flex-1 h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-yellow-400 rounded-full transition-all duration-300"
                        style={{ width: `${percentage}%` }}
                      />
                    </div>
                    <span className="w-12 text-sm text-gray-500 dark:text-gray-400 text-right">{count}</span>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* Pending Ratings */}
        {pendingTrades.length > 0 && (
          <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
            <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">
              Rate Your Trade Partners
            </h2>
            <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
              You have {pendingTrades.length} completed trade(s) waiting for your rating
            </p>
            <div className="space-y-3">
              {pendingTrades.map((trade) => (
                <div
                  key={trade.trade_id}
                  className="flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg"
                >
                  <div className="flex items-center gap-3">
                    {trade.other_user_picture ? (
                      <img
                        src={trade.other_user_picture}
                        alt={trade.other_user_name}
                        className="w-10 h-10 rounded-full"
                      />
                    ) : (
                      <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                        <User className="w-5 h-5 text-gray-400" />
                      </div>
                    )}
                    <div>
                      <p className="font-medium text-gray-900 dark:text-white">{trade.other_user_name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400">
                        Completed {new Date(trade.completed_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                  <button
                    onClick={() => {
                      setSelectedTrade(trade);
                      setShowRatingModal(true);
                    }}
                    className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition"
                  >
                    Rate
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Recent Ratings */}
        <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white mb-4">Recent Ratings</h2>
          {ratings.length === 0 ? (
            <div className="text-center py-8">
              <Award className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto mb-3" />
              <p className="text-gray-500 dark:text-gray-400">No ratings yet</p>
              <p className="text-sm text-gray-400 dark:text-gray-500">
                Complete trades to receive ratings from your partners
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {ratings.map((rating) => (
                <div
                  key={rating.rating_id}
                  className="p-4 border dark:border-gray-700 rounded-lg"
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center gap-3">
                      {rating.rater_picture ? (
                        <img
                          src={rating.rater_picture}
                          alt={rating.rater_name}
                          className="w-10 h-10 rounded-full"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-full bg-gray-200 dark:bg-gray-600 flex items-center justify-center">
                          <User className="w-5 h-5 text-gray-400" />
                        </div>
                      )}
                      <div>
                        <p className="font-medium text-gray-900 dark:text-white">{rating.rater_name}</p>
                        <p className="text-sm text-gray-500 dark:text-gray-400">
                          {new Date(rating.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                    {renderStars(rating.rating)}
                  </div>
                  {rating.comment && (
                    <p className="text-gray-600 dark:text-gray-300 mt-2">{rating.comment}</p>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Rating Modal */}
      {showRatingModal && selectedTrade && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-xl max-w-md w-full p-6">
            <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">
              Rate {selectedTrade.other_user_name}
            </h3>
            
            <p className="text-gray-500 dark:text-gray-400 mb-6">
              How was your trading experience?
            </p>

            {/* Star Selection */}
            <div className="flex justify-center gap-2 mb-6">
              {[1, 2, 3, 4, 5].map((star) => (
                <button
                  key={star}
                  onClick={() => setNewRating(star)}
                  className="p-1 transition hover:scale-110"
                >
                  <Star
                    className={`w-10 h-10 ${
                      star <= newRating
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'text-gray-300 dark:text-gray-600'
                    }`}
                  />
                </button>
              ))}
            </div>

            {/* Comment */}
            <textarea
              value={ratingComment}
              onChange={(e) => setRatingComment(e.target.value)}
              placeholder="Add a comment (optional)"
              className="w-full p-3 border dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white resize-none"
              rows={3}
            />

            {/* Buttons */}
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setShowRatingModal(false);
                  setSelectedTrade(null);
                  setNewRating(5);
                  setRatingComment('');
                }}
                className="flex-1 px-4 py-2 border dark:border-gray-600 rounded-lg text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
              >
                Cancel
              </button>
              <button
                onClick={submitRating}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
              >
                {submitting ? 'Submitting...' : 'Submit Rating'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
