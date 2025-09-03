"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2 } from "lucide-react";
import { signUpWithFirebase } from "@/lib/firebase-auth";
import { createDocument } from "@/lib/firebase-firestore";
import SearchableDropdown from '@/components/SearchableDropdown';
import { UNIVERSITIES, MAJORS, MINORS, GRADUATION_YEARS } from '@/lib/profile-data';

export default function SeekerSignupPage() {
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    school: "",
    major: "",
    minor: "",
    graduationYear: "",
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

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErr("First name and last name are required");
      return;
    }

    if (!formData.school || !formData.major || !formData.graduationYear) {
      setErr("University, major, and graduation year are required");
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
        // Create user profile in Firestore
        const profileData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: 'JOB_SEEKER',
          school: formData.school,
          major: formData.major,
          minor: formData.minor || '',
          graduationYear: formData.graduationYear,
          createdAt: new Date(),
          openToOpp: true
        };

        const { error: profileError } = await createDocument('users', profileData, user.uid);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          // User account was created but profile failed - we can handle this later
        }

        // Success! Redirect to verification or dashboard
        router.push("/home/seeker");
      }
    } catch (error: any) {
      setErr("An error occurred during signup. Please try again.");
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center py-8">
      <div className="w-full max-w-2xl p-8 bg-white rounded-xl shadow-lg">
        <div className="text-center mb-8">
          <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="text-2xl">👤</span>
          </div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Create Your Job Seeker Account</h1>
          <p className="text-gray-600">Start building your professional profile</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Basic Information */}
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
                placeholder="Doe"
              />
            </div>
          </div>

          <div>
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
              placeholder="john.doe@example.com"
            />
          </div>

          {/* Education Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableDropdown
              options={UNIVERSITIES}
              value={formData.school}
              onChange={(value) => handleDropdownChange('school', value)}
              placeholder="Select your university"
              label="University"
              required
              allowCustom
            />
            
            <SearchableDropdown
              options={MAJORS}
              value={formData.major}
              onChange={(value) => handleDropdownChange('major', value)}
              placeholder="Select your major"
              label="Major"
              required
              allowCustom
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <SearchableDropdown
              options={MINORS}
              value={formData.minor}
              onChange={(value) => handleDropdownChange('minor', value)}
              placeholder="Select your minor (optional)"
              label="Minor"
              allowCustom
            />
            
            <SearchableDropdown
              options={GRADUATION_YEARS}
              value={formData.graduationYear}
              onChange={(value) => handleDropdownChange('graduationYear', value)}
              placeholder="Select graduation year"
              label="Expected Graduation Year"
              required
            />
          </div>

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
                Creating Account...
              </div>
            ) : (
              'Create Account'
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
