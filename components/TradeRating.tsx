'use client';

import { useState } from 'react';
import { Star, Send, X } from 'lucide-react';

interface TradeRatingProps {
  tradeId: string;
  ratedUserId: string;
  ratedUserName: string;
  onRatingSubmitted?: () => void;
  onClose?: () => void;
}

export default function TradeRating({ tradeId, ratedUserId, ratedUserName, onRatingSubmitted, onClose }: TradeRatingProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [comment, setComment] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);

  const submitRating = async () => {
    if (rating === 0) {
      setError('Please select a rating');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      const res = await fetch('/api/trades/ratings', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          tradeId,
          ratedUserId,
          rating,
          comment
        })
      });

      const data = await res.json();

      if (res.ok) {
        setSubmitted(true);
        onRatingSubmitted?.();
      } else {
        setError(data.error || 'Failed to submit rating');
      }
    } catch (err) {
      setError('Failed to submit rating');
    } finally {
      setSubmitting(false);
    }
  };

  if (submitted) {
    return (
      <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-6 text-center">
        <div className="w-16 h-16 bg-green-500 rounded-full flex items-center justify-center mx-auto mb-4">
          <Star className="w-8 h-8 text-white fill-white" />
        </div>
        <h3 className="text-lg font-semibold text-green-800 dark:text-green-300 mb-2">
          Rating Submitted!
        </h3>
        <p className="text-green-600 dark:text-green-400">
          Thank you for rating your trade with {ratedUserName}
        </p>
      </div>
    );
  }

  return (
    <div className="bg-white dark:bg-gray-800 rounded-xl p-6 shadow-lg" data-testid="trade-rating">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
          Rate your trade with {ratedUserName}
        </h3>
        {onClose && (
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600">
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Star Rating */}
      <div className="flex items-center justify-center gap-2 mb-6">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => setRating(star)}
            onMouseEnter={() => setHoverRating(star)}
            onMouseLeave={() => setHoverRating(0)}
            className="p-1 transition-transform hover:scale-110"
            data-testid={`rating-star-${star}`}
          >
            <Star
              className={`w-10 h-10 transition-colors ${
                star <= (hoverRating || rating)
                  ? 'text-yellow-400 fill-yellow-400'
                  : 'text-gray-300 dark:text-gray-600'
              }`}
            />
          </button>
        ))}
      </div>

      {/* Rating Label */}
      <div className="text-center mb-4">
        <span className="text-sm text-gray-500 dark:text-gray-400">
          {rating === 0 && 'Click to rate'}
          {rating === 1 && 'Poor'}
          {rating === 2 && 'Fair'}
          {rating === 3 && 'Good'}
          {rating === 4 && 'Very Good'}
          {rating === 5 && 'Excellent'}
        </span>
      </div>

      {/* Comment */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
          Comment (optional)
        </label>
        <textarea
          value={comment}
          onChange={(e) => setComment(e.target.value)}
          placeholder="Share your experience with this trade..."
          rows={3}
          className="w-full px-4 py-2 rounded-lg border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          data-testid="rating-comment-input"
        />
      </div>

      {/* Error Message */}
      {error && (
        <div className="mb-4 p-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-lg text-sm">
          {error}
        </div>
      )}

      {/* Submit Button */}
      <button
        onClick={submitRating}
        disabled={rating === 0 || submitting}
        className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 disabled:cursor-not-allowed"
        data-testid="submit-rating-btn"
      >
        {submitting ? (
          <>
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Submitting...
          </>
        ) : (
          <>
            <Send className="w-5 h-5" />
            Submit Rating
          </>
        )}
      </button>
    </div>
  );
}
