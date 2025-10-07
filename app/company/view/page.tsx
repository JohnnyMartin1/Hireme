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
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-6">
          <Link 
            href="/home/employer"
            className="inline-flex items-center text-green-600 hover:text-green-800 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
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

