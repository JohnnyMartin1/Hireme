"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
import { signUpWithFirebase } from "@/lib/firebase-auth";
import { createDocument, createCompany } from "@/lib/firebase-firestore";
import SearchableDropdown from '@/components/SearchableDropdown';
import { LOCATIONS } from '@/lib/profile-data';

export default function CompanySignupPage() {
  const [formData, setFormData] = useState({
    companyName: "",
    companyLocation: "",
    email: "",
    password: "",
    confirmPassword: "",
    firstName: "",
    lastName: "",
    companySize: "",
    industry: "",
    website: "",
    phone: ""
  });
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleDropdownChange = (field: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setErr("Passwords don't match");
      return;
    }

    if (formData.password.length < 8) {
      setErr("Password must be at least 8 characters long");
      return;
    }

    if (!formData.companyName.trim()) {
      setErr("Company name is required");
      return;
    }

    if (!formData.companyLocation) {
      setErr("Company location is required");
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErr("First and last name are required");
      return;
    }

    setIsLoading(true);

    try {
      // Create Firebase user account
      const { user, error } = await signUpWithFirebase(formData.email, formData.password);

      if (error) {
        setErr(error);
        return;
      }

      if (user) {
        // Create company profile
        const { id: companyId, error: companyError } = await createCompany({
          companyName: formData.companyName,
          companyLocation: formData.companyLocation,
          createdBy: user.uid
        });

        if (companyError || !companyId) {
          console.error('Company creation error:', companyError);
          setErr('Failed to create company profile');
          return;
        }

        // Create user profile linked to company
        const profileData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          companyName: formData.companyName,
          role: 'EMPLOYER',
          companyId: companyId,
          isCompanyOwner: true,
          createdAt: new Date(),
          isActive: true,
          status: 'pending_verification', // Require admin approval
          companySize: formData.companySize,
          industry: formData.industry,
          website: formData.website,
          phone: formData.phone,
          address: formData.companyLocation
        };

        const { error: profileError } = await createDocument('users', profileData, user.uid);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          setErr('Failed to create user profile');
          return;
        }

        // Send verification email via Resend (better deliverability)
        try {
          await fetch('/api/auth/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              email: formData.email,
              userName: `${formData.firstName} ${formData.lastName}`
            })
          });
        } catch (verifyError) {
          console.error('Failed to send verification email:', verifyError);
        }

        // Send admin notification about new company registration
        try {
          await fetch('/api/admin/notify-new-company', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-user-id': user.uid
            },
            body: JSON.stringify({
              companyName: formData.companyName,
              contactName: `${formData.firstName} ${formData.lastName}`,
              contactEmail: formData.email,
              companySize: formData.companySize,
              industry: formData.industry
            })
          });
        } catch (notifyError) {
          console.error('Failed to send admin notification:', notifyError);
        }

        // Wait a moment for Firestore to propagate, then redirect
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        // Success! Redirect to verification pending page (not dashboard)
        router.push("/auth/verification-pending");
      }
    } catch (error: any) {
      setErr("An error occurred during signup. Please try again.");
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-8 px-4">
      <div className="w-full max-w-2xl p-8 bg-white rounded-xl shadow-lg">
        {/* Back Button */}
        <Link 
          href="/auth/signup/employer/type"
          className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to profile type
        </Link>

        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">🏢</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Company Profile</h1>
          <p className="text-gray-600">Set up your company and start hiring</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Company Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Company Information</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Company Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="companyName"
                  type="text"
                  required
                  value={formData.companyName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Your Company Name"
                />
              </div>

              <SearchableDropdown
                options={LOCATIONS}
                value={formData.companyLocation}
                onChange={(value) => handleDropdownChange('companyLocation', value)}
                placeholder="Select company location"
                label="Company Location"
                required
                allowCustom
              />

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Size
                  </label>
                  <SearchableDropdown
                    options={['1-10 employees', '11-50 employees', '51-200 employees', '201-500 employees', '500+ employees']}
                    value={formData.companySize}
                    onChange={(value) => handleDropdownChange('companySize', value)}
                    placeholder="Select company size"
                    label="Company Size"
                    allowCustom
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <SearchableDropdown
                    options={['Technology', 'Finance', 'Healthcare', 'Education', 'Retail', 'Manufacturing', 'Consulting', 'Real Estate', 'Other']}
                    value={formData.industry}
                    onChange={(value) => handleDropdownChange('industry', value)}
                    placeholder="Select industry"
                    label="Industry"
                    allowCustom
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Website
                  </label>
                  <input
                    name="website"
                    type="url"
                    value={formData.website}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="https://yourcompany.com"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Phone Number
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    placeholder="(555) 123-4567"
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Personal Information */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Your Information</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="John"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="Smith"
                />
              </div>
            </div>

            <div className="mt-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                placeholder="you@company.com"
              />
            </div>
          </div>

          {/* Account Security */}
          <div className="bg-gray-50 rounded-lg p-4">
            <h3 className="font-semibold text-gray-900 mb-4">Account Security</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password <span className="text-red-500">*</span>
                </label>
                <input
                  name="password"
                  type="password"
                  required
                  value={formData.password}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
                <p className="text-xs text-gray-500 mt-1">Must be at least 8 characters long</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Confirm Password <span className="text-red-500">*</span>
                </label>
                <input
                  name="confirmPassword"
                  type="password"
                  required
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder="••••••••"
                />
              </div>
            </div>
          </div>

          {err && (
            <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
              <p className="text-sm text-red-600">{err}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium"
          >
            {isLoading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-5 w-5 animate-spin mr-2" />
                Creating Company...
              </div>
            ) : (
              'Create Company Profile'
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Already have an account?{" "}
            <Link href="/auth/login" className="text-blue-600 hover:text-blue-700 font-medium">
              Log in
            </Link>
          </p>
        </div>
      </div>
    </main>
  );
}

