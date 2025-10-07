"use client";
import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { getDocument, getCompanyRatings } from '@/lib/firebase-firestore';
import { Building, MapPin, Globe, Users, Calendar, ArrowLeft, Star, ExternalLink } from 'lucide-react';
import Link from 'next/link';
import CompanyRatingDisplay from '@/components/CompanyRatingDisplay';

interface CompanyData {
  id: string;
  companyName?: string;
  companyBio?: string;
  companyLocation?: string;
  companyWebsite?: string;
  companySize?: string;
  companyIndustry?: string;
  companyFounded?: string;
  bannerImageUrl?: string;
  logoImageUrl?: string;
  [key: string]: any;
}

export default function CompanyProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user, profile, loading } = useFirebaseAuth();
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!params.employerId) return;

      setIsLoading(true);
      try {
        const { data, error: fetchError } = await getDocument('users', params.employerId as string);
        
        if (fetchError) {
          setError(fetchError);
          return;
        }

        if (data) {
          setCompanyData(data as CompanyData);
        } else {
          setError('Company not found');
        }
      } catch (err) {
        console.error('Error fetching company data:', err);
        setError('Failed to load company information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyData();
  }, [params.employerId]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (error || !companyData) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-600 mb-4">{error || 'Company not found'}</p>
          <Link 
            href="/messages" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Back to messages
          </Link>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/home/seeker/profile-views"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile Views
          </Link>
        </div>

        {/* Company Profile */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Banner Image */}
          <div className="relative h-48 bg-gradient-to-r from-blue-600 to-purple-600">
            {companyData.bannerImageUrl ? (
              <img 
                src={companyData.bannerImageUrl} 
                alt={`${companyData.companyName} banner`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-blue-600 to-purple-600"></div>
            )}
          </div>

          {/* Company Info */}
          <div className="p-8">
            <div className="flex items-start">
              {/* Company Logo */}
              <div className="mr-6">
                {companyData.logoImageUrl ? (
                  <img 
                    src={companyData.logoImageUrl} 
                    alt={`${companyData.companyName} logo`}
                    className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                    <Building className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>

              {/* Company Details */}
              <div className="flex-1">
                <h1 className="text-3xl font-bold text-gray-900 mb-2">
                  {companyData.companyName || 'Company Name'}
                </h1>
                
                {/* Company Stats */}
                <div className="flex flex-wrap gap-6 text-sm text-gray-600 mb-6">
                  {companyData.companyLocation && (
                    <div className="flex items-center">
                      <MapPin className="h-4 w-4 mr-2" />
                      {companyData.companyLocation}
                    </div>
                  )}
                  {companyData.companySize && (
                    <div className="flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      {companyData.companySize}
                    </div>
                  )}
                  {companyData.companyIndustry && (
                    <div className="flex items-center">
                      <Building className="h-4 w-4 mr-2" />
                      {companyData.companyIndustry}
                    </div>
                  )}
                  {companyData.companyFounded && (
                    <div className="flex items-center">
                      <Calendar className="h-4 w-4 mr-2" />
                      Founded {companyData.companyFounded}
                    </div>
                  )}
                  {companyData.companyWebsite && (
                    <div className="flex items-center">
                      <Globe className="h-4 w-4 mr-2" />
                      <a 
                        href={companyData.companyWebsite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-blue-600 hover:text-blue-800 flex items-center"
                      >
                        Visit Website
                        <ExternalLink className="h-3 w-3 ml-1" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Company Bio */}
                {companyData.companyBio && (
                  <div className="mb-8">
                    <h2 className="text-xl font-semibold text-gray-900 mb-3">About {companyData.companyName}</h2>
                    <p className="text-gray-700 leading-relaxed text-lg">
                      {companyData.companyBio}
                    </p>
                  </div>
                )}

                {/* Company Ratings */}
                <div className="border-t pt-6">
                  <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Reviews</h2>
                  <CompanyRatingDisplay employerId={companyData.id} showDetails={true} />
                </div>
              </div>
            </div>
          </div>
        </div>

      </div>
    </main>
  );
}
