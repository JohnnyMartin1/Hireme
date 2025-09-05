"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { updateDocument } from '@/lib/firebase-firestore';
import { ArrowLeft, Save, GraduationCap, MapPin, Briefcase, Calendar, Globe, Award, BookOpen, User, Video } from 'lucide-react';
import SearchableDropdown from '@/components/SearchableDropdown';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import FileUpload from '@/components/FileUpload';
import VideoUpload from '@/components/VideoUpload';
import {
  UNIVERSITIES,
  MAJORS,
  MINORS,
  LOCATIONS,
  SKILLS,
  WORK_PREFERENCES,
  JOB_TYPES,
  GRADUATION_YEARS,
  GPA_RANGES
} from '@/lib/profile-data';

interface ProfileFormData {
  firstName: string;
  lastName: string;
  headline: string;
  skills: string[];
  // Education
  school: string;
  major: string;
  minor: string;
  graduationYear: string;
  gpa: string;
  // Location & Preferences
  location: string;
  workPreferences: string[];
  jobTypes: string[];
  // Experience & Activities
  experience: string;
  extracurriculars: string[];
  certifications: string[];
  languages: string[];
  // Personal
  bio: string;
  linkedinUrl: string;
  portfolioUrl: string;
  // Files
  resumeUrl: string;
  profileImageUrl: string;
  videoUrl: string;
}

export default function EditProfilePage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [formData, setFormData] = useState<ProfileFormData>({
    firstName: '',
    lastName: '',
    headline: '',
    skills: [],
    school: '',
    major: '',
    minor: '',
    graduationYear: '',
    gpa: '',
    location: '',
    workPreferences: [],
    jobTypes: [],
    experience: '',
    extracurriculars: [],
    certifications: [],
    languages: [],
    bio: '',
    linkedinUrl: '',
    portfolioUrl: '',
    resumeUrl: '',
    profileImageUrl: '',
    videoUrl: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    if (profile) {
      setFormData({
        firstName: profile.firstName || '',
        lastName: profile.lastName || '',
        headline: profile.headline || '',
        skills: profile.skills || [],
        school: profile.school || '',
        major: profile.major || '',
        minor: profile.minor || '',
        graduationYear: profile.graduationYear || '',
        gpa: profile.gpa || '',
        location: profile.location || '',
        workPreferences: profile.workPreferences || [],
        jobTypes: profile.jobTypes || [],
        experience: profile.experience || '',
        extracurriculars: profile.extracurriculars || [],
        certifications: profile.certifications || [],
        languages: profile.languages || [],
        bio: profile.bio || '',
        linkedinUrl: profile.linkedinUrl || '',
        portfolioUrl: profile.portfolioUrl || '',
        resumeUrl: (profile as any).resumeUrl || '',
        profileImageUrl: (profile as any).profileImageUrl || '',
        videoUrl: (profile as any).videoUrl || ''
      });
    }
  }, [profile, loading, user, router]);

  const handleInputChange = (field: keyof ProfileFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setIsSubmitting(true);
    try {
      const { error } = await updateDocument('users', user.uid, formData);
      
      if (error) {
        console.error('Error updating profile:', error);
        alert('Failed to update profile. Please try again.');
      } else {
        alert('Profile updated successfully!');
        // Refresh the page to show updated data
        if (typeof window !== 'undefined') {
          window.location.reload();
        }
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      alert('Failed to update profile. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center text-blue-600 hover:text-blue-700 mb-4"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <h1 className="text-3xl font-bold text-gray-900">Edit Profile</h1>
          <p className="text-gray-600 mt-2">Complete your profile to help employers find you</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          {/* Basic Information */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Globe className="h-5 w-5 mr-2 text-blue-600" />
              Basic Information
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={(e) => handleInputChange('firstName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={(e) => handleInputChange('lastName', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div className="mt-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Professional Headline <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                required
                value={formData.headline}
                onChange={(e) => handleInputChange('headline', e.target.value)}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="e.g., Computer Science Student | Full-Stack Developer"
              />
            </div>
          </div>

          {/* Education */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <GraduationCap className="h-5 w-5 mr-2 text-green-600" />
              Education
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SearchableDropdown
                options={UNIVERSITIES}
                value={formData.school}
                onChange={(value) => handleInputChange('school', value)}
                placeholder="Select your university"
                label="University"
                required
                allowCustom
              />
              
              <SearchableDropdown
                options={MAJORS}
                value={formData.major}
                onChange={(value) => handleInputChange('major', value)}
                placeholder="Select your major"
                label="Major"
                required
                allowCustom
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
              <SearchableDropdown
                options={MINORS}
                value={formData.minor}
                onChange={(value) => handleInputChange('minor', value)}
                placeholder="Select your minor (optional)"
                label="Minor"
                allowCustom
              />
              
              <SearchableDropdown
                options={GRADUATION_YEARS}
                value={formData.graduationYear}
                onChange={(value) => handleInputChange('graduationYear', value)}
                placeholder="Select graduation year"
                label="Expected Graduation Year"
                required
              />
              
              <SearchableDropdown
                options={GPA_RANGES}
                value={formData.gpa}
                onChange={(value) => handleInputChange('gpa', value)}
                placeholder="Select GPA range"
                label="GPA Range"
              />
            </div>
          </div>

          {/* Location & Preferences */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <MapPin className="h-5 w-5 mr-2 text-purple-600" />
              Location & Work Preferences
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <SearchableDropdown
                options={LOCATIONS}
                value={formData.location}
                onChange={(value) => handleInputChange('location', value)}
                placeholder="Select preferred work location"
                label="Preferred Work Location"
                required
                allowCustom
              />
              
              <MultiSelectDropdown
                options={WORK_PREFERENCES}
                values={formData.workPreferences}
                onChange={(values) => handleInputChange('workPreferences', values)}
                placeholder="Select work arrangements"
                label="Work Arrangements"
                allowCustom
              />
            </div>

            <div className="mt-6">
              <MultiSelectDropdown
                options={JOB_TYPES}
                values={formData.jobTypes}
                onChange={(values) => handleInputChange('jobTypes', values)}
                placeholder="Select job types"
                label="Job Types"
                allowCustom
              />
            </div>
          </div>

          {/* Skills */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Award className="h-5 w-5 mr-2 text-yellow-600" />
              Skills & Expertise
            </h2>
            
            <MultiSelectDropdown
              options={SKILLS}
              values={formData.skills}
              onChange={(values) => handleInputChange('skills', values)}
              placeholder="Select your skills"
              label="Technical & Professional Skills"
              allowCustom
              maxSelections={20}
            />
          </div>

          {/* Experience & Activities */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Briefcase className="h-5 w-5 mr-2 text-indigo-600" />
              Experience & Activities
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Relevant Experience
              </label>
              <textarea
                value={formData.experience}
                onChange={(e) => handleInputChange('experience', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Describe your relevant work experience, internships, projects, etc."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <MultiSelectDropdown
                options={[]}
                values={formData.extracurriculars}
                onChange={(values) => handleInputChange('extracurriculars', values)}
                placeholder="Add extracurricular activities"
                label="Extracurricular Activities"
                allowCustom
              />
              
              <MultiSelectDropdown
                options={[]}
                values={formData.certifications}
                onChange={(values) => handleInputChange('certifications', values)}
                placeholder="Add certifications"
                label="Certifications"
                allowCustom
              />
              
              <MultiSelectDropdown
                options={[]}
                values={formData.languages}
                onChange={(values) => handleInputChange('languages', values)}
                placeholder="Add languages"
                label="Languages"
                allowCustom
              />
            </div>
          </div>

          {/* Personal & Links */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <BookOpen className="h-5 w-5 mr-2 text-red-600" />
              Personal & Links
            </h2>
            
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Bio
              </label>
              <textarea
                value={formData.bio}
                onChange={(e) => handleInputChange('bio', e.target.value)}
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="Tell employers about yourself, your goals, and what makes you unique..."
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  LinkedIn URL
                </label>
                <input
                  type="url"
                  value={formData.linkedinUrl}
                  onChange={(e) => handleInputChange('linkedinUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://linkedin.com/in/yourprofile"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Portfolio/Website URL
                </label>
                <input
                  type="url"
                  value={formData.portfolioUrl}
                  onChange={(e) => handleInputChange('portfolioUrl', e.target.value)}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="https://yourportfolio.com"
                />
              </div>
            </div>
          </div>

          {/* Profile Picture & Resume */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <User className="h-5 w-5 mr-2 text-purple-600" />
              Profile Picture & Resume
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              {/* Profile Picture */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Profile Picture
                </label>
                <FileUpload
                  type="profile-image"
                  currentFile={formData.profileImageUrl}
                  onUploadComplete={(url) => handleInputChange('profileImageUrl', url)}
                  onDelete={() => handleInputChange('profileImageUrl', '')}
                  userId={user.uid}
                />
              </div>

              {/* Resume */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-4">
                  Resume
                </label>
                <FileUpload
                  type="resume"
                  currentFile={formData.resumeUrl}
                  onUploadComplete={(url) => handleInputChange('resumeUrl', url)}
                  onDelete={() => handleInputChange('resumeUrl', '')}
                  userId={user.uid}
                />
              </div>
            </div>
          </div>

          {/* Profile Video */}
          <div className="bg-white rounded-xl shadow-lg p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
              <Video className="h-5 w-5 mr-2 text-orange-600" />
              Profile Video
            </h2>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-4">
                Profile Video (Max 1 minute)
              </label>
              <VideoUpload
                currentVideo={formData.videoUrl}
                onUploadComplete={(url) => handleInputChange('videoUrl', url)}
                onDelete={() => handleInputChange('videoUrl', '')}
                userId={user.uid}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end">
            <button
              type="submit"
              disabled={isSubmitting}
              className="inline-flex items-center px-8 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg"
            >
              <Save className="h-5 w-5 mr-2" />
              {isSubmitting ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}