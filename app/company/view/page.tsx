"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { getCompany } from '@/lib/firebase-firestore';
import { ArrowLeft, Building, MapPin, Globe, Users, Calendar } from 'lucide-react';
import Link from 'next/link';

export default function ViewCompanyProfilePage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [company, setCompany] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }

    if (profile && profile.role !== 'RECRUITER') {
      router.push('/home/employer');
      return;
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const loadCompany = async () => {
      if (!profile?.companyId) return;

      setIsLoading(true);
      try {
        const { data } = await getCompany(profile.companyId);
        setCompany(data);
      } catch (err) {
        console.error('Error loading company:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadCompany();
  }, [profile]);

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/home/employer"
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Back to Dashboard</span>
            <span className="font-medium text-sm sm:text-base sm:hidden">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="white"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">HireMe</span>
          </Link>
        </div>
      </header>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 p-6">
        {/* Page Title */}
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-gray-900">Company Profile</h1>
          <p className="text-gray-600 mt-2">View your company information</p>
        </div>

        {/* Company Profile Card */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {/* Banner */}
          <div className="relative h-48 bg-gradient-to-r from-green-600 to-emerald-600">
            {company?.bannerImageUrl ? (
              <img 
                src={company.bannerImageUrl} 
                alt="Company banner"
                className="w-full h-full object-cover"
              />
            ) : null}
          </div>

          {/* Company Info */}
          <div className="p-8">
            <div className="flex items-start mb-6">
              {/* Logo */}
              <div className="mr-6">
                {company?.logoImageUrl ? (
                  <img 
                    src={company.logoImageUrl} 
                    alt={`${company.companyName} logo`}
                    className="w-24 h-24 rounded-xl object-cover border-4 border-white shadow-lg"
                  />
                ) : (
                  <div className="w-24 h-24 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center">
                    <Building className="h-12 w-12 text-white" />
                  </div>
                )}
              </div>

              {/* Company Details */}
              <div className="flex-1">
                <h2 className="text-3xl font-bold text-gray-900 mb-4">
                  {company?.companyName || profile?.companyName || 'Company'}
                </h2>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
                  {company?.companyLocation && (
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-5 w-5 mr-2" />
                      <span>{company.companyLocation}</span>
                    </div>
                  )}
                  {company?.companySize && (
                    <div className="flex items-center text-gray-600">
                      <Users className="h-5 w-5 mr-2" />
                      <span>{company.companySize}</span>
                    </div>
                  )}
                  {company?.companyIndustry && (
                    <div className="flex items-center text-gray-600">
                      <Building className="h-5 w-5 mr-2" />
                      <span>{company.companyIndustry}</span>
                    </div>
                  )}
                  {company?.companyFounded && (
                    <div className="flex items-center text-gray-600">
                      <Calendar className="h-5 w-5 mr-2" />
                      <span>Founded {company.companyFounded}</span>
                    </div>
                  )}
                  {company?.companyWebsite && (
                    <div className="flex items-center text-gray-600">
                      <Globe className="h-5 w-5 mr-2" />
                      <a 
                        href={company.companyWebsite} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="text-green-600 hover:text-green-800 hover:underline"
                      >
                        Visit Website
                      </a>
                    </div>
                  )}
                </div>

                {/* Company Bio */}
                {company?.companyBio && (
                  <div className="bg-gray-50 rounded-lg p-4">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">About</h3>
                    <p className="text-gray-700 leading-relaxed">
                      {company.companyBio}
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Info Box */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-6">
              <p className="text-sm text-blue-800">
                <strong>Note:</strong> You're viewing this as a recruiter. Only company owners can edit the company profile. 
                If you need to update any information, please contact your company administrator.
              </p>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}

