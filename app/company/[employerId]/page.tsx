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
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading company profile...</p>
        </div>
      </div>
    );
  }

  if (error || !companyData) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <Building className="h-12 w-12 text-slate-300 mx-auto mb-4" />
          <p className="text-slate-600 mb-4">{error || 'Company not found'}</p>
          <Link 
            href="/home/seeker/profile-views"
            className="inline-flex items-center text-navy-800 hover:text-navy-700 underline font-medium"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Profile Views
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/home/seeker/profile-views"
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm hidden sm:inline">Back to Profile Views</span>
            <span className="font-medium text-sm sm:hidden">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center shadow-md">
              <svg width="20" height="20" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="white"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">HireMe</span>
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-10 lg:py-12">
        {/* Company Profile Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 overflow-hidden">
          {/* Banner Image */}
          <div className="relative h-48 sm:h-64 bg-gradient-to-r from-navy-800 to-navy-700">
            {companyData.bannerImageUrl ? (
              <img 
                src={companyData.bannerImageUrl} 
                alt={`${companyData.companyName} banner`}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-r from-navy-800 to-navy-700"></div>
            )}
          </div>

          {/* Company Info */}
          <div className="p-6 sm:p-8 lg:p-10">
            <div className="flex flex-col sm:flex-row items-start gap-6">
              {/* Company Logo */}
              <div className="flex-shrink-0">
                {companyData.logoImageUrl ? (
                  <img 
                    src={companyData.logoImageUrl} 
                    alt={`${companyData.companyName} logo`}
                    className="w-20 h-20 sm:w-24 sm:h-24 rounded-2xl object-cover border-4 border-white shadow-lg -mt-12 sm:-mt-16 bg-white"
                  />
                ) : (
                  <div className="w-20 h-20 sm:w-24 sm:h-24 bg-gradient-to-br from-navy-800 to-navy-900 rounded-2xl flex items-center justify-center border-4 border-white shadow-lg -mt-12 sm:-mt-16">
                    <Building className="h-10 w-10 sm:h-12 sm:w-12 text-white" />
                  </div>
                )}
              </div>

              {/* Company Details */}
              <div className="flex-1 min-w-0">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold text-navy-900 mb-4 break-words">
                  {companyData.companyName || 'Company Name'}
                </h1>
                
                {/* Company Stats */}
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
                  {companyData.companyLocation && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <MapPin className="h-4 w-4 text-navy-700" />
                      </div>
                      <span className="text-sm sm:text-base">{companyData.companyLocation}</span>
                    </div>
                  )}
                  {companyData.companySize && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Users className="h-4 w-4 text-navy-700" />
                      </div>
                      <span className="text-sm sm:text-base">{companyData.companySize}</span>
                    </div>
                  )}
                  {companyData.companyIndustry && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Building className="h-4 w-4 text-navy-700" />
                      </div>
                      <span className="text-sm sm:text-base">{companyData.companyIndustry}</span>
                    </div>
                  )}
                  {companyData.companyFounded && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Calendar className="h-4 w-4 text-navy-700" />
                      </div>
                      <span className="text-sm sm:text-base">Founded {companyData.companyFounded}</span>
                    </div>
                  )}
                  {companyData.companyWebsite && (
                    <div className="flex items-center gap-2 text-slate-600">
                      <div className="w-8 h-8 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Globe className="h-4 w-4 text-navy-700" />
                      </div>
                      <a 
                        href={companyData.companyWebsite.startsWith('http') ? companyData.companyWebsite : `https://${companyData.companyWebsite}`}
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-navy-800 hover:text-navy-700 flex items-center gap-1 underline transition-colors text-sm sm:text-base"
                      >
                        Visit Website
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </div>
                  )}
                </div>

                {/* Company Bio */}
                {companyData.companyBio && (
                  <div className="mb-8">
                    <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-4">About {companyData.companyName}</h2>
                    <div className="bg-slate-50 border border-slate-200 rounded-xl p-6">
                      <p className="text-slate-700 leading-relaxed text-sm sm:text-base whitespace-pre-wrap">
                        {companyData.companyBio}
                      </p>
                    </div>
                  </div>
                )}

                {/* Company Ratings */}
                <div className="border-t border-slate-200 pt-8">
                  <h2 className="text-xl sm:text-2xl font-bold text-navy-900 mb-6">Company Reviews</h2>
                  <CompanyRatingDisplay employerId={companyData.id} showDetails={true} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}