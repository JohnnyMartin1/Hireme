"use client";
import { useState, useEffect } from 'react';
import { Star, Building, MapPin, Globe, Users, Calendar, ArrowLeft, ExternalLink } from 'lucide-react';
import { getDocument, getCompanyRatings } from '@/lib/firebase-firestore';
import CompanyRatingDisplay from './CompanyRatingDisplay';
import Link from 'next/link';

interface CompanyProfileProps {
  employerId: string;
  showDetails?: boolean;
  clickable?: boolean;
}

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

export default function CompanyProfile({ employerId, showDetails = false, clickable = false }: CompanyProfileProps) {
  const [companyData, setCompanyData] = useState<CompanyData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchCompanyData = async () => {
      if (!employerId) return;

      setIsLoading(true);
      try {
        const { data, error: fetchError } = await getDocument('users', employerId);
        
        if (fetchError) {
          setError(fetchError);
          return;
        }

        if (data) {
          setCompanyData(data as CompanyData);
        }
      } catch (err) {
        console.error('Error fetching company data:', err);
        setError('Failed to load company information');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCompanyData();
  }, [employerId]);

  if (isLoading) {
    return (
      <div className="bg-white rounded-xl shadow-lg overflow-hidden">
        <div className="h-32 bg-gradient-to-r from-gray-200 to-gray-300 animate-pulse"></div>
        <div className="p-6">
          <div className="flex items-start">
            <div className="w-16 h-16 bg-gray-200 rounded-lg animate-pulse mr-4"></div>
            <div className="flex-1">
              <div className="h-6 bg-gray-200 rounded animate-pulse mb-2"></div>
              <div className="h-4 bg-gray-200 rounded animate-pulse w-3/4"></div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !companyData) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="text-center">
          <Building className="h-12 w-12 text-gray-300 mx-auto mb-4" />
          <p className="text-gray-500">Company information not available</p>
        </div>
      </div>
    );
  }

  const CompanyContent = () => (
    <div className="bg-white rounded-xl shadow-lg overflow-hidden">
      {/* Banner Image */}
      <div className="relative h-32 bg-gradient-to-r from-blue-600 to-purple-600">
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
      <div className="p-6">
        <div className="flex items-start">
          {/* Company Logo */}
          <div className="mr-4">
            {companyData.logoImageUrl ? (
              <img 
                src={companyData.logoImageUrl} 
                alt={`${companyData.companyName} logo`}
                className="w-16 h-16 rounded-lg object-cover border-2 border-white shadow-lg"
              />
            ) : (
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                <Building className="h-8 w-8 text-white" />
              </div>
            )}
          </div>

          {/* Company Details */}
          <div className="flex-1">
            <h2 className="text-xl font-bold text-gray-900 mb-1">
              {companyData.companyName || 'Company Name'}
            </h2>
            
            {/* Company Stats */}
            <div className="flex flex-wrap gap-4 text-sm text-gray-600 mb-3">
              {companyData.companyLocation && (
                <div className="flex items-center">
                  <MapPin className="h-4 w-4 mr-1" />
                  {companyData.companyLocation}
                </div>
              )}
              {companyData.companySize && (
                <div className="flex items-center">
                  <Users className="h-4 w-4 mr-1" />
                  {companyData.companySize}
                </div>
              )}
              {companyData.companyFounded && (
                <div className="flex items-center">
                  <Calendar className="h-4 w-4 mr-1" />
                  Founded {companyData.companyFounded}
                </div>
              )}
              {companyData.companyWebsite && (
                <div className="flex items-center">
                  <Globe className="h-4 w-4 mr-1" />
                  <a 
                    href={companyData.companyWebsite} 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-blue-600 hover:text-blue-800"
                  >
                    Website
                  </a>
                </div>
              )}
            </div>

            {/* Company Bio */}
            {companyData.companyBio && (
              <div className="mb-4">
                <p className="text-gray-700 leading-relaxed">
                  {companyData.companyBio}
                </p>
              </div>
            )}

            {/* Company Ratings */}
            <div className="border-t pt-4">
              <CompanyRatingDisplay employerId={employerId} showDetails={showDetails} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  // If clickable, wrap in a link to the company profile page
  if (clickable) {
    return (
      <Link href={`/company/${employerId}`} className="block hover:shadow-xl transition-shadow duration-200 group">
        <div className="group-hover:scale-[1.02] transition-transform duration-200">
          <CompanyContent />
        </div>
      </Link>
    );
  }

  // Otherwise, return the content directly
  return <CompanyContent />;
}
