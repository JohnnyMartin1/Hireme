"use client";
import { useState } from 'react';
import { Star, X, Send } from 'lucide-react';

interface CompanyRatingModalProps {
  isOpen: boolean;
  onClose: () => void;
  companyName: string;
  jobTitle: string;
  onSubmit: (rating: number, message: string) => void;
  isSubmitting?: boolean;
}

export default function CompanyRatingModal({
  isOpen,
  onClose,
  companyName,
  jobTitle,
  onSubmit,
  isSubmitting = false
}: CompanyRatingModalProps) {
  const [rating, setRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [message, setMessage] = useState('');

  const handleSubmit = () => {
    if (rating > 0) {
      onSubmit(rating, message);
    }
  };

  const handleClose = () => {
    setRating(0);
    setMessage('');
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full mx-4 p-6">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-gray-900">Rate Your Experience</h3>
          <button
            onClick={handleClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {/* Company Info */}
        <div className="mb-6">
          <p className="text-gray-600 mb-2">
            How was your experience with <span className="font-medium text-gray-900">{companyName}</span>?
          </p>
          <p className="text-sm text-gray-500">
            Job: <span className="font-medium">{jobTitle}</span>
          </p>
        </div>

        {/* Star Rating */}
        <div className="mb-6">
          <p className="text-sm font-medium text-gray-700 mb-3">Rate your experience:</p>
          <div className="flex items-center gap-1">
            {[1, 2, 3, 4, 5].map((star) => (
              <button
                key={star}
                onClick={() => setRating(star)}
                onMouseEnter={() => setHoverRating(star)}
                onMouseLeave={() => setHoverRating(0)}
                className="text-2xl transition-colors"
              >
                <Star
                  className={`h-8 w-8 ${
                    star <= (hoverRating || rating)
                      ? 'text-yellow-400 fill-current'
                      : 'text-gray-300'
                  }`}
                />
              </button>
            ))}
          </div>
          <p className="text-xs text-gray-500 mt-2">
            {rating === 0 && 'Click to rate'}
            {rating === 1 && 'Poor experience'}
            {rating === 2 && 'Below average'}
            {rating === 3 && 'Average experience'}
            {rating === 4 && 'Good experience'}
            {rating === 5 && 'Excellent experience'}
          </p>
        </div>

        {/* Optional Message */}
        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Optional feedback (optional):
          </label>
          <textarea
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            placeholder="Share your experience with this company..."
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
            rows={3}
            maxLength={500}
          />
          <p className="text-xs text-gray-500 mt-1">
            {message.length}/500 characters
          </p>
        </div>

        {/* Actions */}
        <div className="flex gap-3">
          <button
            onClick={handleClose}
            className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
            disabled={isSubmitting}
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={rating === 0 || isSubmitting}
            className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isSubmitting ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            ) : (
              <>
                <Send className="h-4 w-4 mr-2" />
                Submit Rating
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
