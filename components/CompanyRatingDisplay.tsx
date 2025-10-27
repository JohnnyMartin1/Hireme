"use client";
import { useEffect, useState } from 'react';
import { Star, MessageSquare } from 'lucide-react';
import { getCompanyRatings, getCompanyAverageRating } from '@/lib/firebase-firestore';

interface CompanyRatingDisplayProps {
  employerId: string;
  showDetails?: boolean;
}

interface Rating {
  id: string;
  rating: number;
  message?: string;
  candidateId: string;
  companyName: string;
  jobTitle: string;
  createdAt: any;
}

export default function CompanyRatingDisplay({ 
  employerId, 
  showDetails = false 
}: CompanyRatingDisplayProps) {
  const [ratings, setRatings] = useState<Rating[]>([]);
  const [averageRating, setAverageRating] = useState(0);
  const [totalRatings, setTotalRatings] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const fetchRatings = async () => {
      setIsLoading(true);
      try {
        const { data: ratingsData, error: ratingsError } = await getCompanyRatings(employerId);
        const { average, count, error: avgError } = await getCompanyAverageRating(employerId);

        if (!ratingsError && ratingsData) {
          setRatings(ratingsData as Rating[]);
        }
        
        if (!avgError) {
          setAverageRating(average);
          setTotalRatings(count);
        }
      } catch (error) {
        console.error('Error fetching ratings:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchRatings();
  }, [employerId]);

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-4">
        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (totalRatings === 0) {
    return (
      <div className="text-center py-12">
        <div className="w-20 h-20 mx-auto bg-slate-100 rounded-full flex items-center justify-center mb-6">
          <Star className="h-10 w-10 text-slate-400" />
        </div>
        <h3 className="text-xl font-bold text-gray-700">No ratings yet</h3>
        <p className="text-gray-500 mt-2 max-w-sm mx-auto">Candidate ratings and reviews will appear here once received.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Average Rating */}
      <div className="flex items-center gap-3">
        <div className="flex items-center">
          {[1, 2, 3, 4, 5].map((star) => (
            <Star
              key={star}
              className={`h-5 w-5 ${
                star <= averageRating
                  ? 'text-yellow-400 fill-current'
                  : 'text-gray-300'
              }`}
            />
          ))}
        </div>
        <div>
          <p className="text-lg font-semibold text-gray-900">{averageRating.toFixed(1)}</p>
          <p className="text-sm text-gray-600">({totalRatings} {totalRatings === 1 ? 'rating' : 'ratings'})</p>
        </div>
      </div>

      {/* Detailed Ratings */}
      {showDetails && ratings.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Recent Reviews</h4>
          {ratings.slice(0, 5).map((rating) => (
            <div key={rating.id} className="bg-gray-50 rounded-lg p-3">
              <div className="flex items-center justify-between mb-2">
                <div className="flex items-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <Star
                      key={star}
                      className={`h-4 w-4 ${
                        star <= rating.rating
                          ? 'text-yellow-400 fill-current'
                          : 'text-gray-300'
                      }`}
                    />
                  ))}
                </div>
                <span className="text-xs text-gray-500">
                  {rating.createdAt ? 
                    new Date(rating.createdAt.toDate ? rating.createdAt.toDate() : rating.createdAt).toLocaleDateString() 
                    : 'Recently'
                  }
                </span>
              </div>
              <p className="text-sm font-medium text-gray-900 mb-1">
                {rating.jobTitle}
              </p>
              {rating.message && (
                <p className="text-sm text-gray-600 italic">
                  "{rating.message}"
                </p>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
