"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { Loader2, ArrowLeft, CheckCircle, XCircle } from "lucide-react";
import { signUpWithFirebase } from "@/lib/firebase-auth";
import { createDocument, getInvitationByEmail, acceptInvitation, getCompany } from "@/lib/firebase-firestore";

export default function RecruiterSignupPage() {
  const [step, setStep] = useState<'email' | 'details'>('email');
  const [email, setEmail] = useState("");
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    password: "",
    confirmPassword: "",
  });
  const [invitation, setInvitation] = useState<any>(null);
  const [companyName, setCompanyName] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [checkingEmail, setCheckingEmail] = useState(false);
  const router = useRouter();

  const handleCheckEmail = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr(null);
    setCheckingEmail(true);

    try {
      const { data, error } = await getInvitationByEmail(email);

      if (error) {
        console.error('Invitation check error:', error);
        setErr(`Error checking invitation: ${error}`);
        setCheckingEmail(false);
        return;
      }

      if (!data) {
        setErr('No invitation found for this email address. Please contact your company administrator.');
        setCheckingEmail(false);
        return;
      }

      // Fetch company details
      const { data: company } = await getCompany((data as any).companyId);
      if (company) {
        setCompanyName((company as any).companyName);
      }

      setInvitation(data);
      setStep('details');
    } catch (error: any) {
      setErr('Error checking invitation. Please try again.');
      console.error('Invitation check error:', error);
    } finally {
      setCheckingEmail(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
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
      setErr("First and last name are required");
      return;
    }

    setIsLoading(true);

    try {
      // Create Firebase user account
      const { user, error } = await signUpWithFirebase(email, formData.password);

      if (error) {
        setErr(error);
        return;
      }

      if (user && invitation) {
        // Create recruiter profile linked to company
        const profileData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: email,
          role: 'RECRUITER',
          companyId: invitation.companyId,
          isCompanyOwner: false,
          createdAt: new Date(),
          isActive: true
        };

        const { error: profileError } = await createDocument('users', profileData, user.uid);

        if (profileError) {
          console.error('Profile creation error:', profileError);
          setErr('Failed to create user profile');
          return;
        }

        // Mark invitation as accepted
        await acceptInvitation(invitation.id, user.uid);

        // Send verification email via Resend (better deliverability)
        try {
          await fetch('/api/auth/send-verification', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              userId: user.uid,
              email: email,
              userName: `${formData.firstName} ${formData.lastName}`
            })
          });
        } catch (verifyError) {
          console.error('Failed to send verification email:', verifyError);
        }

        // Wait a moment for Firestore to propagate, then redirect
        await new Promise(resolve => setTimeout(resolve, 1000));
        
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
    <main className="min-h-screen bg-slate-50 flex items-center justify-center py-12 px-4 sm:py-16">
      <div className="w-full max-w-2xl">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 md:p-12">
          {/* Back Button */}
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
                <i className="fa-solid fa-users text-navy-700 text-3xl"></i>
              </div>
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 mb-2 tracking-tight">Join as Recruiter</h1>
            <p className="text-slate-600 text-base sm:text-lg">
              {step === 'email' 
                ? 'Enter your email to check for invitations' 
                : `Create your account for ${companyName}`
              }
            </p>
          </div>

        {step === 'email' ? (
          // Email Check Step
          <form onSubmit={handleCheckEmail} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-1.5">
                Email Address <span className="text-red-500">*</span>
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                autoComplete="email"
                className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                placeholder="you@company.com"
              />
              <p className="text-xs text-slate-500 mt-2">
                Use the email address where you received your invitation
              </p>
            </div>

            {err && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg flex items-start">
                <XCircle className="h-5 w-5 text-red-600 mr-3 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-600 font-medium">{err}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={checkingEmail}
              className="w-full bg-navy-800 text-white font-semibold py-3.5 px-6 rounded-lg hover:bg-navy-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-base"
            >
              {checkingEmail ? (
                <div className="flex items-center justify-center">
                  <Loader2 className="h-5 w-5 animate-spin mr-2" />
                  Checking Invitation...
                </div>
              ) : (
                'Check Invitation'
              )}
            </button>
          </form>
        ) : (
          // Account Details Step
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Invitation Confirmation */}
            <div className="p-4 bg-green-50 border border-green-200 rounded-lg flex items-start">
              <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-0.5 flex-shrink-0" />
              <div>
                <p className="text-sm font-medium text-green-900">Invitation Found!</p>
                <p className="text-sm text-green-700">You've been invited to join {companyName} as a recruiter.</p>
              </div>
            </div>

            {/* Personal Information */}
            <div className="bg-sky-50/50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-xl font-bold text-navy-900 mb-4">Personal Information</h3>
              
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
                    autoComplete="given-name"
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
                    autoComplete="family-name"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                    placeholder="Smith"
                  />
                </div>
              </div>

              <div className="mt-4">
                <label className="block text-sm font-medium text-navy-900 mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  autoComplete="email"
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-100 text-slate-600"
                />
              </div>
            </div>

            {/* Account Security */}
            <div className="bg-sky-50/50 rounded-xl p-6 border border-slate-200">
              <h3 className="text-xl font-bold text-navy-900 mb-4">Account Security</h3>
              
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
                    autoComplete="new-password"
                    className="w-full px-4 py-3 bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-500/30 focus:border-sky-500 transition-all duration-200 text-navy-900 placeholder-slate-400"
                    placeholder="••••••••"
                  />
                  <p className="text-xs text-slate-500 mt-1">Must be at least 8 characters long</p>
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
                    autoComplete="new-password"
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

            <div className="flex gap-4">
              <button
                type="button"
                onClick={() => setStep('email')}
                className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg hover:bg-slate-50 transition-colors font-semibold"
              >
                Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="flex-1 bg-navy-800 text-white font-semibold py-3.5 px-6 rounded-lg hover:bg-navy-700 hover:shadow-lg focus:outline-none focus:ring-2 focus:ring-sky-500/30 transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed text-base"
              >
                {isLoading ? (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-5 w-5 animate-spin mr-2" />
                    Creating Account...
                  </div>
                ) : (
                  'Create Recruiter Account'
                )}
              </button>
            </div>
          </form>
        )}

        <div className="mt-8 text-center">
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

