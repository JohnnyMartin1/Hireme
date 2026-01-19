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

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
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

    if (!formData.website.trim()) {
      setErr("Company website is required");
      return;
    }

    // Basic URL validation
    try {
      new URL(formData.website);
    } catch {
      setErr("Please enter a valid website URL (e.g., https://www.yourcompany.com)");
      return;
    }

    if (!formData.companySize) {
      setErr("Company size is required");
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setErr("First and last name are required");
      return;
    }

    if (!formData.phone.trim()) {
      setErr("Phone number is required");
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
    <main className="min-h-screen bg-slate-50 flex flex-col items-center justify-center px-6 py-12 sm:py-16">
      <div className="w-full max-w-3xl">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-12">
          <div className="mb-8">
            <Link 
              href="/"
              className="inline-flex items-center text-navy-800 font-semibold hover:text-navy-900 transition-all duration-300 bg-sky-200/10 hover:bg-sky-200/20 hover:shadow-md hover:scale-105 px-3 sm:px-4 py-2 rounded-full group"
            >
              <ArrowLeft className="h-4 w-4 mr-2 group-hover:-translate-x-1 transition-transform duration-300" />
              Back to home page
            </Link>
          </div>

          <div className="text-center mb-8">
            <div className="flex justify-center mb-5">
              <div className="w-16 h-16 bg-sky-100 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-building text-navy-700 text-3xl"></i>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-2 tracking-tight">Create Company Profile</h1>
            <p className="text-slate-600 text-base sm:text-lg">Set up your company and start hiring</p>
          </div>

            <form onSubmit={handleSubmit} className="space-y-8">
              <div className="bg-sky-50/50 p-6 rounded-xl border border-slate-200">
                <h2 className="text-xl font-bold text-navy-900 mb-4">Company Information</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1.5">
                      Company Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="companyName"
                      type="text"
                      required
                      value={formData.companyName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                      placeholder="Your Company Name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1.5">
                      Company Location <span className="text-red-500">*</span>
                    </label>
                    <div className="relative">
                      <SearchableDropdown
                        options={LOCATIONS}
                        value={formData.companyLocation}
                        onChange={(value) => handleDropdownChange('companyLocation', value)}
                        placeholder="Select company location"
                        label="Company Location"
                        required
                        allowCustom
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1.5">
                      Company Website <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="website"
                      type="url"
                      required
                      value={formData.website}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                      placeholder="https://www.yourcompany.com"
                    />
                    <p className="mt-2 text-xs text-slate-500">Enter your company's website URL</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1.5">
                      Number of Employees <span className="text-red-500">*</span>
                    </label>
                    <select
                      name="companySize"
                      required
                      value={formData.companySize}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900"
                    >
                      <option value="">Select company size</option>
                      <option value="1-10">1-10 employees</option>
                      <option value="11-50">11-50 employees</option>
                      <option value="51-200">51-200 employees</option>
                      <option value="201-500">201-500 employees</option>
                      <option value="501-1000">501-1000 employees</option>
                      <option value="1001-5000">1001-5000 employees</option>
                      <option value="5000+">5000+ employees</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="bg-sky-50/50 p-6 rounded-xl border border-slate-200">
                <h2 className="text-xl font-bold text-navy-900 mb-4">Your Information</h2>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1.5">
                      First Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="firstName"
                      type="text"
                      required
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                      placeholder="John"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1.5">
                      Last Name <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="lastName"
                      type="text"
                      required
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                      placeholder="Smith"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-navy-900 mb-1.5">
                    Email Address <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="email"
                    type="email"
                    required
                    value={formData.email}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                    placeholder="you@company.com"
                  />
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium text-navy-900 mb-1.5">
                    Phone Number <span className="text-red-500">*</span>
                  </label>
                  <input
                    name="phone"
                    type="tel"
                    required
                    value={formData.phone}
                    onChange={handleChange}
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                    placeholder="(555) 123-4567"
                  />
                  <p className="mt-2 text-xs text-slate-500">Your business phone number</p>
                </div>
              </div>

              <div className="bg-sky-50/50 p-6 rounded-xl border border-slate-200">
                <h2 className="text-xl font-bold text-navy-900 mb-4">Account Security</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1.5">
                      Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="password"
                      type="password"
                      required
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                      placeholder="••••••••"
                    />
                    <p className="mt-2 text-xs text-slate-500">Must be at least 8 characters long.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-navy-900 mb-1.5">
                      Confirm Password <span className="text-red-500">*</span>
                    </label>
                    <input
                      name="confirmPassword"
                      type="password"
                      required
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                      placeholder="••••••••"
                    />
                  </div>
                </div>
              </div>

              {err && (
                <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-sm text-red-600 font-medium">{err}</p>
                </div>
              )}

              <div className="pt-4">
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full bg-navy-800 text-white font-semibold py-3.5 px-6 rounded-lg hover:bg-navy-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-base"
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
              </div>
            </form>

            <div className="text-center mt-8">
              <p className="text-sm text-slate-600">
                Already have an account?{" "}
                <Link href="/auth/login" className="font-semibold text-navy-800 hover:text-navy-700 hover:underline transition-colors">
                  Log in
                </Link>
              </p>
            </div>
          </div>
        </div>
      </main>
    );
  }

