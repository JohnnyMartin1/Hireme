"use client";
import { useState, useEffect, useRef } from 'react';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { updateDocument, upsertDocument } from '@/lib/firebase-firestore';
import { uploadFile } from '@/lib/firebase-storage';
import { Building, Upload, Save, ArrowLeft } from 'lucide-react';
import SearchableDropdown from '@/components/SearchableDropdown';
import Link from 'next/link';
import type { UserProfile } from "@/types/user";


interface CompanyProfileData {
  companyName?: string;
  companyBio?: string;
  companyLocation?: string;
  companyWebsite?: string;
  companySize?: string;
  companyIndustry?: string;
  companyFounded?: string;
  bannerImageUrl?: string;
  logoImageUrl?: string;
}

const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees", 
  "51-200 employees",
  "201-500 employees",
  "501-1000 employees",
  "1001-5000 employees",
  "5000+ employees"
];

const INDUSTRIES = [
  "Technology",
  "Healthcare",
  "Finance",
  "Education",
  "Manufacturing",
  "Retail",
  "Consulting",
  "Marketing",
  "Real Estate",
  "Non-profit",
  "Other"
];

// Subset of major US cities for dropdown; extend as needed
const US_CITIES = [
  "New York, NY",
  "Los Angeles, CA",
  "Chicago, IL",
  "Houston, TX",
  "Phoenix, AZ",
  "Philadelphia, PA",
  "San Antonio, TX",
  "San Diego, CA",
  "Dallas, TX",
  "San Jose, CA",
  "Austin, TX",
  "Jacksonville, FL",
  "Fort Worth, TX",
  "Columbus, OH",
  "San Francisco, CA",
  "Charlotte, NC",
  "Seattle, WA",
  "Denver, CO",
  "Nashville, TN",
  "Washington, DC",
  "Boston, MA",
  "El Paso, TX",
  "Detroit, MI",
  "Portland, OR",
  "Las Vegas, NV",
  "Baltimore, MD",
  "Milwaukee, WI",
  "Albuquerque, NM",
  "Tucson, AZ",
  "Fresno, CA",
  "Sacramento, CA",
  "Mesa, AZ",
  "Kansas City, MO",
  "Atlanta, GA",
  "Omaha, NE",
  "Raleigh, NC",
  "Miami, FL",
  "Long Beach, CA",
  "Virginia Beach, VA",
  "Oakland, CA",
  "Minneapolis, MN",
  "Tampa, FL",
  "New Orleans, LA",
  "Cleveland, OH",
  "Pittsburgh, PA",
  "Orlando, FL",
];

export default function CompanyProfileEditPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<CompanyProfileData>({});
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);
  const [formChanged, setFormChanged] = useState(false);
  const bannerUploadRef = useRef<HTMLInputElement>(null);
  const logoUploadRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    if (profile && profile.role !== 'EMPLOYER') {
      router.push("/home/seeker");
      return;
    }

    // Initialize form with existing profile data
    if (profile) {
      setFormData({
        companyName: profile.companyName || '',
        companyBio: profile.companyBio || '',
        companyLocation: profile.companyLocation || '',
        companyWebsite: profile.companyWebsite || '',
        companySize: profile.companySize || '',
        companyIndustry: profile.companyIndustry || '',
        companyFounded: profile.companyFounded || '',
        bannerImageUrl: profile.bannerImageUrl || '',
        logoImageUrl: profile.logoImageUrl || ''
      });
    }
  }, [user, profile, loading, router]);

const handleInputChange = (field: keyof CompanyProfileData, value: string | null) => {
  setFormData(prev => ({
    ...prev,
    [field]: value ?? ""
  }));
  setMessage(null);
};

const handleFileUpload = async (
  field: "bannerImageUrl" | "logoImageUrl",
  file: File
) => {
  if (!user) return;

  setIsLoading(true);
  try {
    const fileName = `${user.uid}_${field}_${Date.now()}_${file.name}`;
    const folderName = field === 'bannerImageUrl' ? 'company-banners' : 'company-logos';
    const path = `${folderName}/${fileName}`;
    
    const { url, error } = await uploadFile(file, path, {
      contentType: file.type,
      customMetadata: {
        uploadedBy: user.uid,
        fileType: field
      }
    });

    if (error) {
      setMessage({ type: "error", text: `Failed to upload ${field === "bannerImageUrl" ? "banner" : "logo"}: ${error}` });
      return;
    }
    if (!url) {
      setMessage({ type: "error", text: `Upload failed: no URL returned` });
      return;
    }

    handleInputChange(field, url);
    setMessage({
      type: "success",
      text: `${field === "bannerImageUrl" ? "Banner" : "Logo"} uploaded successfully!`,
    });
  } catch (err) {
    setMessage({ type: "error", text: `Failed to upload ${field === "bannerImageUrl" ? "banner" : "logo"}` });
  } finally {
    setIsLoading(false);
  }
};


  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSaving(true);
    try {
      const { error } = await upsertDocument('users', user.uid, formData);
      
      if (error) {
        setMessage({ type: 'error', text: `Failed to save: ${error}` });
        return;
      }

      setMessage({ type: 'success', text: 'Company profile updated successfully!' });
      setFormChanged(false);
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save company profile' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen mobile-safe-top mobile-safe-bottom" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F8FAFC 100%)'}}>
        <div className="flex items-center justify-center h-screen">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy mx-auto mb-4"></div>
            <p className="text-gray-600">Loading...</p>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !profile || profile.role !== 'EMPLOYER') {
    return null;
  }

  return (
    <main className="min-h-screen mobile-safe-top mobile-safe-bottom" style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F8FAFC 100%)'}}>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-10">
        
        {/* Breadcrumb */}
        <section className="mb-6 sm:mb-8">
          <Link 
            href="/home/employer"
            className="flex items-center text-navy font-semibold hover:text-blue-900 transition-colors duration-200 text-sm sm:text-base"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
        </section>

        {/* Page Header */}
        <section className="mb-8 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl font-bold text-navy mb-2">Company Profile</h1>
          <p className="text-gray-600 text-base sm:text-lg">Customize how your company appears to candidates.</p>
        </section>

        <div className="space-y-6 sm:space-y-8">
          {/* Banner Image Card */}
          <section className="bg-white/90 backdrop-blur-sm p-4 sm:p-8 rounded-2xl shadow-sm border border-light-gray card-hover card-enter" style={{animationDelay: '0.1s'}}>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-navy">Banner Image</h2>
              <button 
                onClick={() => bannerUploadRef.current?.click()}
                className="bg-navy text-white font-semibold py-2 sm:py-2.5 px-4 sm:px-5 rounded-lg btn-hover flex items-center space-x-2 text-xs sm:text-sm"
                disabled={isLoading}
                aria-label="Upload company banner"
              >
                <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Upload Banner</span>
              </button>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">Recommended: 1200×300px, JPG or PNG.</p>
            
            <div 
              onClick={() => !formData.bannerImageUrl && bannerUploadRef.current?.click()}
              className={`border-2 border-dashed border-gray-300 rounded-xl p-8 sm:p-12 text-center bg-gray-50/50 ${!formData.bannerImageUrl ? 'cursor-pointer hover:border-navy hover:bg-blue-50/30 transition-all' : ''}`}
            >
              {formData.bannerImageUrl ? (
                <div className="relative w-full h-32 sm:h-48 rounded-lg overflow-hidden mb-4">
                  <img 
                    src={formData.bannerImageUrl} 
                    alt="Company banner"
                    className="w-full h-full object-cover"
                  />
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleInputChange('bannerImageUrl', null);
                    }}
                    className="absolute top-2 right-2 bg-red-500 text-white rounded-full p-2 hover:bg-red-600 transition-colors"
                  >
                    ×
                  </button>
                </div>
              ) : (
                <>
                  <div className="mb-4">
                    <Upload className="h-10 w-10 sm:h-12 sm:w-12 text-gray-400 mx-auto" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">Drop your banner image here</h3>
                  <p className="text-gray-500">or click to browse files</p>
                </>
              )}
              <input
                ref={bannerUploadRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('bannerImageUrl', file);
                }}
                className="hidden"
                disabled={isLoading}
              />
            </div>
          </section>

          {/* Company Logo Card */}
          <section className="bg-white/90 backdrop-blur-sm p-4 sm:p-8 rounded-2xl shadow-sm border border-light-gray card-hover card-enter" style={{animationDelay: '0.2s'}}>
            <div className="flex justify-between items-center mb-4 sm:mb-6">
              <h2 className="text-lg sm:text-xl font-bold text-navy">Company Logo</h2>
              <button 
                onClick={() => logoUploadRef.current?.click()}
                className="bg-navy text-white font-semibold py-2 sm:py-2.5 px-4 sm:px-5 rounded-lg btn-hover flex items-center space-x-2 text-xs sm:text-sm"
                disabled={isLoading}
                aria-label="Upload company logo"
              >
                <Upload className="h-3 w-3 sm:h-4 sm:w-4" />
                <span>Upload Logo</span>
              </button>
            </div>
            <p className="text-gray-500 text-xs sm:text-sm mb-4 sm:mb-6">Recommended: 400×400px, JPG or PNG.</p>
            
            <div 
              onClick={() => !formData.logoImageUrl && logoUploadRef.current?.click()}
              className={`border-2 border-dashed border-gray-300 rounded-xl p-8 sm:p-12 text-center bg-gray-50/50 ${!formData.logoImageUrl ? 'cursor-pointer hover:border-navy hover:bg-blue-50/30 transition-all' : ''}`}
            >
              {formData.logoImageUrl ? (
                <div className="flex flex-col items-center">
                  <div className="relative w-20 h-20 sm:w-24 sm:h-24 rounded-full overflow-hidden mb-4 border-2 border-gray-300">
                    <img 
                      src={formData.logoImageUrl} 
                      alt="Company logo"
                      className="w-full h-full object-cover"
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleInputChange('logoImageUrl', null);
                      }}
                      className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center text-sm hover:bg-red-600 transition-colors"
                    >
                      ×
                    </button>
                  </div>
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      logoUploadRef.current?.click();
                    }}
                    className="text-sm text-gray-600 hover:text-navy transition-colors"
                  >
                    Change logo
                  </button>
                </div>
              ) : (
                <>
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto bg-gray-200 rounded-full flex items-center justify-center mb-4">
                    <Building className="h-8 w-8 sm:h-10 sm:w-10 text-gray-400" />
                  </div>
                  <h3 className="text-base sm:text-lg font-semibold text-gray-700 mb-2">Drop your logo here</h3>
                  <p className="text-gray-500">or click to browse files</p>
                </>
              )}
              <input
                ref={logoUploadRef}
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) handleFileUpload('logoImageUrl', file);
                }}
                className="hidden"
                disabled={isLoading}
              />
            </div>
          </section>

          {/* Company Information Card */}
          <form onSubmit={handleSubmit}>
            <section className="bg-white/90 backdrop-blur-sm p-4 sm:p-8 rounded-2xl shadow-sm border border-light-gray card-hover card-enter" style={{animationDelay: '0.3s'}}>
              <h2 className="text-lg sm:text-xl font-bold text-navy mb-4 sm:mb-6">Company Information</h2>
              
              <div className="space-y-4 sm:space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="company-name" className="block text-sm font-semibold text-gray-700 mb-2">
                      Company Name *
                    </label>
                    <input
                      type="text"
                      id="company-name"
                      value={formData.companyName || ''}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm sm:text-base"
                      placeholder="Enter company name"
                      required
                    />
                  </div>

                  <div>
                    <label htmlFor="location" className="block text-sm font-semibold text-gray-700 mb-2">
                      Location
                    </label>
                    <SearchableDropdown
                      options={US_CITIES}
                      value={formData.companyLocation || ''}
                      onChange={(v) => handleInputChange('companyLocation', v)}
                      placeholder="City, State"
                      label=""
                      className="text-sm sm:text-base"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="company-size" className="block text-sm font-semibold text-gray-700 mb-2">
                      Company Size
                    </label>
                    <div className="relative">
                      <select
                        id="company-size"
                        value={formData.companySize || ''}
                        onChange={(e) => handleInputChange('companySize', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white appearance-none text-sm sm:text-base"
                      >
                        <option value="">Select company size</option>
                        {COMPANY_SIZES.map(size => (
                          <option key={size} value={size}>{size}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label htmlFor="industry" className="block text-sm font-semibold text-gray-700 mb-2">
                      Industry
                    </label>
                    <div className="relative">
                      <select
                        id="industry"
                        value={formData.companyIndustry || ''}
                        onChange={(e) => handleInputChange('companyIndustry', e.target.value)}
                        className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white appearance-none text-sm sm:text-base"
                      >
                        <option value="">Select industry</option>
                        {INDUSTRIES.map(industry => (
                          <option key={industry} value={industry}>{industry}</option>
                        ))}
                      </select>
                      <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
                        <svg className="w-5 h-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-6">
                  <div>
                    <label htmlFor="founded-year" className="block text-sm font-semibold text-gray-700 mb-2">
                      Founded Year
                    </label>
                    <input
                      type="number"
                      id="founded-year"
                      value={formData.companyFounded || ''}
                      onChange={(e) => handleInputChange('companyFounded', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm sm:text-base"
                      placeholder="2020"
                      min="1800"
                      max="2024"
                    />
                  </div>

                  <div>
                    <label htmlFor="website" className="block text-sm font-semibold text-gray-700 mb-2">
                      Website
                    </label>
                    <input
                      type="url"
                      id="website"
                      value={formData.companyWebsite || ''}
                      onChange={(e) => handleInputChange('companyWebsite', e.target.value)}
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white text-sm sm:text-base"
                      placeholder="https://www.company.com"
                    />
                  </div>
                </div>

                <div>
                  <label htmlFor="company-bio" className="block text-sm font-semibold text-gray-700 mb-2">
                    Company Bio
                  </label>
                  <textarea
                    id="company-bio"
                    value={formData.companyBio || ''}
                    onChange={(e) => handleInputChange('companyBio', e.target.value)}
                    rows={4}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white resize-none text-sm sm:text-base"
                    placeholder="Tell candidates about your company culture, mission, and values..."
                  />
                  <p className="text-gray-500 text-xs sm:text-sm mt-2">
                    This will be visible to candidates when they receive messages from your company.
                  </p>
                </div>

                {/* Message */}
                {message && (
                  <div className={`p-4 rounded-lg ${
                    message.type === 'success' ? 'bg-green-50 text-green-800 border border-green-200' : 'bg-red-50 text-red-800 border border-red-200'
                  }`}>
                    {message.text}
                  </div>
                )}

                {/* Save Button */}
                <div className="flex justify-end pt-4">
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="bg-green-600 text-white font-semibold py-3 px-6 sm:px-8 rounded-lg btn-hover flex items-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isSaving ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>Saving...</span>
                      </>
                    ) : (
                      <>
                        <Save className="h-4 w-4" />
                        <span>Save Changes</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </section>
          </form>
        </div>
      </div>
    </main>
  );
}
