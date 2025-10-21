"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft } from "lucide-react";
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
          // Don't block signup if email fails to send
        }

        // Success! Redirect to verification page
        router.push("/auth/verify-email");
      }
    } catch (error: any) {
      setErr("An error occurred during signup. Please try again.");
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <main className="flex flex-col items-center justify-center min-h-screen py-10 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="w-full max-w-2xl mx-auto">
        
        <div className="mb-6">
          <button
            onClick={() => router.back()}
            className="inline-flex items-center px-4 py-2 bg-blue-50 text-navy-800 rounded-full hover:bg-blue-100 hover:shadow-sm transition-all duration-200 hover:-translate-y-1"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
        </div>

        <div className="bg-white rounded-2xl p-8 md:p-12 shadow-lg border border-light-gray">
          <div className="text-center mb-10">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-light-blue rounded-full mb-6">
              <i className="fa-solid fa-user text-navy text-3xl"></i>
            </div>
            <h1 className="text-3xl md:text-4xl font-bold text-navy mb-2">Create Your Job Seeker Account</h1>
            <p className="text-gray-600">Start building your professional profile</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">
                  First Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="firstName"
                  type="text"
                  required
                  value={formData.firstName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="John"
                />
              </div>
              <div>
                <label className="form-label">
                  Last Name <span className="text-red-500">*</span>
                </label>
                <input
                  name="lastName"
                  type="text"
                  required
                  value={formData.lastName}
                  onChange={handleChange}
                  className="form-input"
                  placeholder="Doe"
                />
              </div>
            </div>

            <div>
              <label className="form-label">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                name="email"
                type="email"
                required
                value={formData.email}
                onChange={handleChange}
                className="form-input"
                placeholder="john.doe@example.com"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">
                  University <span className="text-red-500">*</span>
                </label>
                <div className="form-select-wrapper">
                  <SearchableDropdown
                    options={UNIVERSITIES}
                    value={formData.school}
                    onChange={(value) => handleDropdownChange('school', value)}
                    placeholder="Select your university"
                    label="University"
                    required
                    allowCustom
                  />
                </div>
              </div>
              <div>
                <label className="form-label">
                  Major <span className="text-red-500">*</span>
                </label>
                <div className="form-select-wrapper">
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
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="form-label">Minor</label>
                <div className="form-select-wrapper">
                  <SearchableDropdown
                    options={MINORS}
                    value={formData.minor}
                    onChange={(value) => handleDropdownChange('minor', value)}
                    placeholder="Select your minor (optional)"
                    label="Minor"
                    allowCustom
                  />
                </div>
              </div>
              <div>
                <label className="form-label">
                  Expected Graduation Year <span className="text-red-500">*</span>
                </label>
                <div className="form-select-wrapper">
                  <SearchableDropdown
                    options={GRADUATION_YEARS}
                    value={formData.graduationYear}
                    onChange={(value) => handleDropdownChange('graduationYear', value)}
                    placeholder="Select graduation year"
                    label="Graduation Year"
                    required
                  />
                </div>
              </div>
            </div>

            <div>
              <label className="form-label">
                Password <span className="text-red-500">*</span>
              </label>
              <input
                name="password"
                type="password"
                required
                value={formData.password}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
              />
              <p className="text-xs text-gray-500 mt-2">Must be at least 8 characters long</p>
            </div>
            
            <div>
              <label className="form-label">
                Confirm Password <span className="text-red-500">*</span>
              </label>
              <input
                name="confirmPassword"
                type="password"
                required
                value={formData.confirmPassword}
                onChange={handleChange}
                className="form-input"
                placeholder="••••••••"
              />
            </div>

            {err && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{err}</p>
              </div>
            )}

            <div className="pt-4">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full bg-navy text-white font-bold py-4 px-4 rounded-xl hover:bg-opacity-90 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-navy transition-all duration-300 border border-light-gray disabled:opacity-50 disabled:cursor-not-allowed"
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
            </div>
          </form>

          <div className="text-center mt-8">
            <p className="text-sm text-gray-600">
              Already have an account?{" "}
              <Link href="/auth/login" className="font-medium text-navy hover:text-light-blue cursor-pointer transition-colors duration-200">
                Log in
              </Link>
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
