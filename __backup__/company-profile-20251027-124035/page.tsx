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
};

const handleFileUpload = async (
  field: "bannerImageUrl" | "logoImageUrl",
  file: File
) => {
  if (!user) return;

  setIsLoading(true);
  try {
    const fileName = `${user.uid}_${field}_${Date.now()}`;
    const { url, error } = await uploadFile(file, `company-${field}`, fileName);

    if (error) {
      setMessage({ type: "error", text: `Failed to upload ${field}: ${error}` });
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
    setMessage({ type: "error", text: `Failed to upload ${field}` });
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
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to save company profile' });
    } finally {
      setIsSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-green-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile || profile.role !== 'EMPLOYER') {
    return null;
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-green-50 via-white to-emerald-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <Link 
            href="/home/employer"
            className="inline-flex items-center text-green-600 hover:text-green-800 transition-colors mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Dashboard
          </Link>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Company Profile</h1>
          <p className="text-gray-600">Customize how your company appears to candidates</p>
        </div>

        {/* Message */}
        {message && (
          <div className={`mb-6 p-4 rounded-lg ${
            message.type === 'success' ? 'bg-green-50 text-green-800' : 'bg-red-50 text-red-800'
          }`}>
            {message.text}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Banner Image */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Banner Image</h2>
            <div className="space-y-4">
              {formData.bannerImageUrl && (
                <div className="relative">
                  <img 
                    src={formData.bannerImageUrl} 
                    alt="Company banner"
                    className="w-full h-32 object-cover rounded-lg"
                  />
                </div>
              )}
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('bannerImageUrl', file);
                  }}
                  className="hidden"
                  id="banner-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="banner-upload"
                  className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? 'Uploading...' : 'Upload Banner'}
                </label>
                <span className="text-sm text-gray-500">
                  Recommended: 1200x300px, JPG or PNG
                </span>
              </div>
            </div>
          </div>

          {/* Company Logo */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Company Logo</h2>
            <div className="space-y-4">
              {formData.logoImageUrl && (
                <div className="flex items-center space-x-4">
                  <img 
                    src={formData.logoImageUrl} 
                    alt="Company logo"
                    className="w-16 h-16 rounded-lg object-cover"
                  />
                </div>
              )}
              <div className="flex items-center space-x-4">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) handleFileUpload('logoImageUrl', file);
                  }}
                  className="hidden"
                  id="logo-upload"
                  disabled={isLoading}
                />
                <label
                  htmlFor="logo-upload"
                  className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Upload className="h-4 w-4 mr-2" />
                  {isLoading ? 'Uploading...' : 'Upload Logo'}
                </label>
                <span className="text-sm text-gray-500">
                  Recommended: 400x400px, JPG or PNG
                </span>
              </div>
            </div>
          </div>

          {/* Company Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6">Company Information</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name *
                </label>
                <input
                  type="text"
                  value={formData.companyName || ''}
                  onChange={(e) => handleInputChange('companyName', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="Enter company name"
                  required
                />
              </div>

              <SearchableDropdown
                options={US_CITIES}
                value={formData.companyLocation || ''}
                onChange={(v) => handleInputChange('companyLocation', v)}
                placeholder="e.g., San Francisco, CA"
                label="Location"
                className=""
              />

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Size
                </label>
                <select
                  value={formData.companySize || ''}
                  onChange={(e) => handleInputChange('companySize', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select company size</option>
                  {COMPANY_SIZES.map(size => (
                    <option key={size} value={size}>{size}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Industry
                </label>
                <select
                  value={formData.companyIndustry || ''}
                  onChange={(e) => handleInputChange('companyIndustry', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                >
                  <option value="">Select industry</option>
                  {INDUSTRIES.map(industry => (
                    <option key={industry} value={industry}>{industry}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Founded Year
                </label>
                <input
                  type="text"
                  value={formData.companyFounded || ''}
                  onChange={(e) => handleInputChange('companyFounded', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="e.g., 2010"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Website
                </label>
                <input
                  type="url"
                  value={formData.companyWebsite || ''}
                  onChange={(e) => handleInputChange('companyWebsite', e.target.value)}
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                  placeholder="https://www.company.com"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Company Bio
              </label>
              <textarea
                value={formData.companyBio || ''}
                onChange={(e) => handleInputChange('companyBio', e.target.value)}
                rows={6}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                placeholder="Tell candidates about your company, culture, mission, and what makes you unique..."
              />
              <p className="text-sm text-gray-500 mt-2">
                This will be visible to candidates when they receive messages from your company.
              </p>
            </div>
          </div>

          {/* Save Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSaving}
              className="flex items-center px-6 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {isSaving ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              {isSaving ? 'Saving...' : 'Save Changes'}
            </button>
          </div>
        </form>
      </div>
    </main>
  );
}
