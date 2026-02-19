'use client';

import { useEffect, useState } from 'react';
import { Star, ThumbsUp, MessageSquare } from 'lucide-react';

interface UserReputationProps {
  userId: string;
  compact?: boolean;
}

interface RatingStats {
  totalRatings: number;
  averageRating: number;
  positiveRatings: number;
}

interface Rating {
  rating_id: string;
  rating: number;
  comment: string;
  rater_name: string;
  rater_picture: string;
  created_at: string;
}

export default function UserReputation({ userId, compact = false }: UserReputationProps) {
  const [stats, setStats] = useState<RatingStats | null>(null);
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAll, setShowAll] = useState(false);

  useEffect(() => {
    loadReputation();
  }, [userId]);

  const loadReputation = async () => {
    try {
      const res = await fetch(`/api/trades/ratings?userId=${userId}`, { credentials: 'include' });
      if (res.ok) {
        const data = await res.json();
        setStats(data.stats);
        setRatings(data.ratings || []);
      }
    } catch (error) {
      console.error('Error loading reputation:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className={`${compact ? 'inline-flex items-center gap-1' : 'p-4'}`}>
        <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!stats || stats.totalRatings === 0) {
    if (compact) {
      return (
        <span className="text-xs text-gray-400">No ratings yet</span>
      );
    }
    return (
      <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4 text-center">
        <Star className="w-8 h-8 text-gray-300 mx-auto mb-2" />
        <p className="text-gray-500 text-sm">No trade ratings yet</p>
      </div>
    );
  }

  // Compact view for inline display
  if (compact) {
    return (
      <div className="inline-flex items-center gap-1.5" data-testid="user-reputation-compact">
        <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
          {stats.averageRating.toFixed(1)}
        </span>
        <span className="text-xs text-gray-400">
          ({stats.totalRatings})
        </span>
      </div>
    );
  }

  // Full view
  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6" data-testid="user-reputation">
      {/* Stats Summary */}
      <div className="flex items-center gap-6 mb-6">
        <div className="text-center">
          <div className="flex items-center justify-center gap-1 mb-1">
            <Star className="w-8 h-8 text-yellow-400 fill-yellow-400" />
            <span className="text-3xl font-bold text-gray-900 dark:text-white">
              {stats.averageRating.toFixed(1)}
            </span>
          </div>
          <p className="text-sm text-gray-500">{stats.totalRatings} ratings</p>
        </div>
        
        <div className="flex-1">
          <div className="flex items-center gap-2 mb-2">
            <ThumbsUp className="w-5 h-5 text-green-500" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {stats.positiveRatings} positive ({Math.round((stats.positiveRatings / stats.totalRatings) * 100)}%)
            </span>
          </div>
          <div className="flex gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <Star
                key={star}
                className={`w-5 h-5 ${
                  star <= Math.round(stats.averageRating)
                    ? 'text-yellow-400 fill-yellow-400'
                    : 'text-gray-200 dark:text-gray-700'
                }`}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Recent Reviews */}
      {ratings.length > 0 && (
        <div>
          <h4 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4" />
            Recent Reviews
          </h4>
          <div className="space-y-3">
            {(showAll ? ratings : ratings.slice(0, 3)).map((review) => (
              <div key={review.rating_id} className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                <div className="flex items-center gap-2 mb-2">
                  {review.rater_picture ? (
                    <img src={review.rater_picture} alt="" className="w-6 h-6 rounded-full" />
                  ) : (
                    <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs">
                      {review.rater_name?.charAt(0) || '?'}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                    {review.rater_name}
                  </span>
                  <div className="flex gap-0.5 ml-auto">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <Star
                        key={star}
                        className={`w-3 h-3 ${
                          star <= review.rating
                            ? 'text-yellow-400 fill-yellow-400'
                            : 'text-gray-300'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                {review.comment && (
                  <p className="text-sm text-gray-600 dark:text-gray-400">{review.comment}</p>
                )}
              </div>
            ))}
          </div>
          
          {ratings.length > 3 && (
            <button
              onClick={() => setShowAll(!showAll)}
              className="mt-3 text-sm text-blue-600 hover:underline"
            >
              {showAll ? 'Show less' : `Show all ${ratings.length} reviews`}
            </button>
          )}
        </div>
      )}
    </div>
  );
}
