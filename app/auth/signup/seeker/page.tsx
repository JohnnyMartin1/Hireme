"use client";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { signUpWithFirebase } from "@/lib/firebase-auth";
import { createDocument } from "@/lib/firebase-firestore";
import SearchableDropdown from '@/components/SearchableDropdown';
import { UNIVERSITIES, MAJORS, MINORS, GRADUATION_YEARS } from '@/lib/profile-data';
import TermsModal from '@/components/TermsModal';

export default function SeekerSignupPage() {
  const [currentStep, setCurrentStep] = useState(1);
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
  const [verificationCode, setVerificationCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
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

  const nextStep = () => {
    setCurrentStep(prev => prev + 1);
  };

  const sendVerificationCode = async () => {
    if (!formData.email || !isValidEmail(formData.email)) {
      setError("Please enter a valid email address");
      return;
    }
    
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
      });

      const data = await response.json();

      if (data.success) {
        setEmailSent(true);
      } else {
        setError(data.error || 'Failed to send verification code');
      }
    } catch (error: any) {
      console.error('Error sending verification code:', error);
      setError('Failed to send verification code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const verifyCode = async () => {
    if (verificationCode.length !== 6) {
      setError("Please enter a 6-digit verification code.");
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/auth/verify-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
          code: verificationCode,
        }),
      });

      const data = await response.json();

      if (data.success) {
        nextStep();
      } else {
        setError(data.error || 'Invalid verification code. Please try again.');
      }
    } catch (error: any) {
      console.error('Error verifying code:', error);
      setError('Failed to verify code. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError("Passwords don't match");
      return;
    }

    if (formData.password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError("First name and last name are required");
      return;
    }

    if (!formData.school || !formData.major || !formData.graduationYear) {
      setError("University, major, and graduation year are required");
      return;
    }

    if (!termsAccepted) {
      setError("You must accept the Terms of Service to create an account");
      return;
    }

    setIsLoading(true);

    try {
      // Create Firebase user account
      const { user, error } = await signUpWithFirebase(formData.email, formData.password);

      if (error) {
        setError(error);
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
          openToOpp: true,
          emailVerified: true, // Email is already verified with 6-digit code
          emailVerifiedAt: new Date().toISOString(),
          termsAcceptedAt: new Date().toISOString()
        };

        const { error: profileError } = await createDocument('users', profileData, user.uid);

        if (profileError) {
          console.error('Profile creation error:', profileError);
        }

        // Email is already verified through the 6-digit code verification
        // No need to send additional verification email

        // Move to welcome step
        nextStep();
      }
    } catch (error: any) {
      setError("An error occurred during signup. Please try again.");
      console.error('Signup error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const isValidEmail = (email: string) => {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  };

  const getProgressPercentage = () => {
    return (currentStep / 3) * 100;
  };

  return (
    <main className="min-h-screen sm:h-screen flex flex-col lg:flex-row bg-brand-gray overflow-hidden mobile-safe-top mobile-safe-bottom">
      {/* Left Column - Content & Form */}
      <div className="w-full lg:w-[48%] flex flex-col justify-center p-4 sm:p-6 md:p-8 bg-white relative overflow-y-auto">
        <div className="flex-grow flex flex-col justify-center w-full max-w-[560px] mx-auto py-6 sm:py-0">
          {/* Progress Stepper */}
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-4 text-xs sm:text-sm mb-6 sm:mb-8">
            <div className={`flex items-center ${currentStep >= 1 ? 'text-navy-800 font-semibold' : 'text-text-secondary'} whitespace-nowrap gap-2`}>
              <span className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs ${
                currentStep > 1 ? 'bg-success-green text-white' : currentStep === 1 ? 'bg-navy-800 text-white' : 'bg-light-gray text-text-secondary'
              }`}>
                {currentStep > 1 ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-envelope"></i>}
              </span>
              Search
            </div>
            <i className="fa-solid fa-chevron-right text-light-gray text-xs hidden sm:block"></i>
            <div className={`flex items-center ${currentStep >= 2 ? 'text-navy-800 font-semibold' : 'text-text-secondary'} whitespace-nowrap gap-2`}>
              <span className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs ${
                currentStep > 2 ? 'bg-success-green text-white' : currentStep === 2 ? 'bg-navy-800 text-white' : 'bg-light-gray text-text-secondary'
              }`}>
                {currentStep > 2 ? <i className="fa-solid fa-check"></i> : <i className="fa-solid fa-user-plus"></i>}
              </span>
              Create Account
            </div>
            <i className="fa-solid fa-chevron-right text-light-gray text-xs hidden sm:block"></i>
            <div className={`flex items-center ${currentStep >= 3 ? 'text-navy-800 font-semibold' : 'text-text-secondary'} whitespace-nowrap gap-2`}>
              <span className={`flex items-center justify-center w-6 h-6 sm:w-8 sm:h-8 rounded-full text-xs ${
                currentStep === 3 ? 'bg-navy-800 text-white' : 'bg-light-gray text-text-secondary'
              }`}>
                <i className="fa-solid fa-smile"></i>
              </span>
              Personalize
            </div>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-light-gray rounded-full h-2 mb-6 sm:mb-8">
            <div 
              className="bg-navy-800 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>

          {/* Step 1: Email Verification */}
          {currentStep === 1 && (
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-text-primary mb-4 sm:mb-6">Enter your email to get started</h1>
              <div className="space-y-4 sm:space-y-6">
                <div className="relative">
                  <input 
                    type="email" 
                    name="email"
                    placeholder="Enter your email address"
                    value={formData.email}
                    onChange={handleChange}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        sendVerificationCode();
                      }
                    }}
                    className="w-full bg-white border border-slate-200 rounded-xl py-3 sm:py-4 px-4 sm:px-6 text-text-primary focus:border-navy-800 focus:outline-none transition-all duration-200 text-base min-h-[44px]"
                    required
                  />
                  <button 
                    type="button" 
                    onClick={sendVerificationCode}
                    disabled={isLoading}
                    className="absolute right-2 top-1/2 -translate-y-1/2 bg-navy-800 text-white px-3 sm:px-6 py-2 rounded-lg hover:bg-opacity-90 transition-all duration-200 font-medium disabled:opacity-50 disabled:cursor-not-allowed text-sm sm:text-base min-h-[44px]"
                  >
                    {isLoading ? (
                      <i className="fa-solid fa-spinner animate-spin"></i>
                    ) : (
                      'Send Code'
                    )}
                  </button>
                </div>
                <p className="text-sm text-text-secondary">We'll email a 6-digit code to verify your address.</p>
                
                {emailSent && (
                  <div className="space-y-6">
                    <div className="text-sm text-success-green">Code sent to {formData.email}</div>
                    <div className="grid grid-cols-6 gap-2 sm:gap-3">
                      {[1, 2, 3, 4, 5, 6].map((digit) => (
                        <input 
                          key={digit}
                          type="text" 
                          maxLength={1}
                          value={verificationCode[digit - 1] || ''}
                          onChange={(e) => {
                            const newCode = verificationCode.split('');
                            newCode[digit - 1] = e.target.value;
                            setVerificationCode(newCode.join(''));
                            
                            // Auto-advance to next input if a digit was entered
                            if (e.target.value && digit < 6) {
                              const nextInput = document.querySelector(`input[data-digit="${digit + 1}"]`) as HTMLInputElement;
                              if (nextInput) {
                                nextInput.focus();
                              }
                            }
                          }}
                          onPaste={(e) => {
                            e.preventDefault();
                            const pastedData = e.clipboardData.getData('text');
                            // Only accept 6-digit codes
                            if (/^\d{6}$/.test(pastedData)) {
                              setVerificationCode(pastedData);
                              // Focus the last input after pasting
                              const lastInput = document.querySelector(`input[data-digit="6"]`) as HTMLInputElement;
                              if (lastInput) {
                                lastInput.focus();
                              }
                            }
                          }}
                          onKeyDown={(e) => {
                            // Handle backspace to go to previous input
                            if (e.key === 'Backspace' && !e.currentTarget.value && digit > 1) {
                              const prevInput = document.querySelector(`input[data-digit="${digit - 1}"]`) as HTMLInputElement;
                              if (prevInput) {
                                prevInput.focus();
                              }
                            }
                            // Handle Enter key to verify code when all 6 digits are entered
                            if (e.key === 'Enter' && verificationCode.length === 6) {
                              verifyCode();
                            }
                          }}
                          data-digit={digit}
                          className="w-10 h-12 sm:w-12 sm:h-14 text-center text-lg sm:text-xl font-bold border border-slate-200 rounded-xl focus:border-navy-800 focus:outline-none transition-all duration-200"
                        />
                      ))}
                    </div>
                    {error && <div className="text-sm text-error-red">{error}</div>}
                    <button 
                      type="button" 
                      onClick={verifyCode}
                      disabled={isLoading || verificationCode.length !== 6}
                      className="w-full bg-navy-800 text-white py-4 rounded-xl font-semibold hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      {isLoading ? (
                        <i className="fa-solid fa-spinner animate-spin"></i>
                      ) : (
                        'Verify Code'
                      )}
                    </button>
                  </div>
                )}
                {error && !emailSent && <div className="text-sm text-error-red">{error}</div>}
              </div>
            </div>
          )}

          {/* Step 2: Create Account */}
          {currentStep === 2 && (
            <div>
              <h1 className="text-4xl font-bold text-text-primary mb-6">Create your account</h1>
              <form onSubmit={handleSubmit} className="space-y-6">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <input 
                      type="text" 
                      name="firstName"
                      placeholder="First name"
                      value={formData.firstName}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-text-primary focus:border-navy-800 focus:outline-none transition-all duration-200"
                      required
                    />
                  </div>
                  <div>
                    <input 
                      type="text" 
                      name="lastName"
                      placeholder="Last name"
                      value={formData.lastName}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-text-primary focus:border-navy-800 focus:outline-none transition-all duration-200"
                      required
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <input 
                    type="email" 
                    name="email"
                    value={formData.email}
                    readOnly
                    className="w-full bg-gray-50 border-2 border-success-green rounded-xl py-4 px-6 pr-20 text-text-primary"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 bg-success-green text-white px-3 py-1 rounded-full text-xs font-medium">
                    <i className="fa-solid fa-check mr-1"></i>Verified
                  </span>
                </div>

                <div>
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

                <div className="grid grid-cols-2 gap-4">
                  <div>
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
                  <div>
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
                  <SearchableDropdown
                    options={GRADUATION_YEARS}
                    value={formData.graduationYear}
                    onChange={(value) => handleDropdownChange('graduationYear', value)}
                    placeholder="Select graduation year"
                    label="Graduation Year"
                    required
                  />
                </div>

                <div className="space-y-4">
                  <div className="relative">
                    <input 
                      type="password" 
                      name="password"
                      placeholder="Password"
                      value={formData.password}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-text-primary focus:border-navy-800 focus:outline-none transition-all duration-200"
                      required
                    />
                  </div>
                  <div className="relative">
                    <input 
                      type="password" 
                      name="confirmPassword"
                      placeholder="Confirm password"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      className="w-full bg-white border border-slate-200 rounded-xl py-4 px-6 text-text-primary focus:border-navy-800 focus:outline-none transition-all duration-200"
                      required
                    />
                    {formData.password === formData.confirmPassword && formData.confirmPassword.length > 0 && (
                      <div className="absolute right-4 top-1/2 -translate-y-1/2">
                        <i className="fa-solid fa-check text-success-green"></i>
                      </div>
                    )}
                  </div>
                </div>

                {/* Terms of Service Acceptance */}
                <div className="bg-sky-50 border border-sky-200 rounded-xl p-4">
                  <label className="flex items-start gap-3 cursor-pointer group">
                    <input
                      type="checkbox"
                      checked={termsAccepted}
                      onChange={(e) => setTermsAccepted(e.target.checked)}
                      className="mt-1 w-5 h-5 text-navy-800 border-slate-300 rounded focus:ring-2 focus:ring-navy-800 focus:ring-offset-2 cursor-pointer flex-shrink-0"
                      required
                    />
                    <div className="flex-1">
                      <span className="text-sm text-slate-700 leading-relaxed">
                        I have read and agree to the{" "}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.preventDefault();
                            setTermsModalOpen(true);
                          }}
                          className="text-navy-800 hover:text-navy-700 font-semibold underline underline-offset-2"
                        >
                          Terms of Service
                        </button>
                        {" "}and{" "}
                        <Link href="/terms/privacy" target="_blank" className="text-navy-800 hover:text-navy-700 font-semibold underline underline-offset-2">
                          Privacy Policy
                        </Link>
                        .
                      </span>
                    </div>
                  </label>
                </div>

                {error && (
                  <div className="text-sm text-error-red">{error}</div>
                )}

                <button 
                  type="submit"
                  disabled={isLoading || !termsAccepted}
                  className="w-full bg-navy-800 text-white py-4 rounded-xl font-semibold hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoading ? 'Creating Account...' : 'Create Account'}
                </button>
              </form>
            </div>
          )}

          {/* Step 3: Welcome */}
          {currentStep === 3 && (
            <div className="text-center">
              <div className="space-y-8">
                <h1 className="text-4xl font-bold text-text-primary">
                  Welcome, {formData.firstName} — ready to get hired?
                </h1>
                <p className="text-lg text-text-secondary">
                  Let's finish setting up your profile so employers can discover your amazing potential.
                </p>
                <button 
                  onClick={() => router.push("/auth/signup/seeker/steps")}
                  className="bg-navy-800 text-white px-8 py-4 rounded-xl font-semibold hover:bg-opacity-90 transition-all duration-200"
                >
                  Start profile setup
                  <i className="fa-solid fa-arrow-right ml-2"></i>
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Right Column - Profile Gallery */}
      <div className="hidden lg:block w-[52%] bg-brand-gray p-8 overflow-hidden relative">
        <div className="absolute inset-0 bg-gradient-to-br from-brand-gray via-subtle-gray to-brand-gray"></div>
        
        <div className="h-full w-full relative">
          <div className="grid grid-cols-4 gap-4 h-full content-start">
            {Array.from({ length: 32 }).map((_, i) => (
              <div key={i} className="bg-white rounded-xl p-4 shadow-sm border border-gray-200/50 aspect-[3/4] flex flex-col items-center justify-center space-y-3 transition-all duration-300 hover:shadow-md hover:-translate-y-1 opacity-0 animate-fade-in" style={{ animationDelay: `${i * 30}ms` }}>
                <div className="w-12 h-12 bg-light-gray rounded-full flex items-center justify-center">
                  <svg className="w-7 h-7 text-text-secondary" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 9a3 3 0 100-6 3 3 0 000 6zm-7 9a7 7 0 1114 0H3z" clipRule="evenodd"></path>
                  </svg>
                </div>
                <div className="w-3/4 h-2 bg-light-gray rounded-full"></div>
                <div className="w-1/2 h-2 bg-light-gray rounded-full"></div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Terms of Service Modal */}
      <TermsModal 
        isOpen={termsModalOpen} 
        onClose={() => setTermsModalOpen(false)}
        onAccept={() => setTermsAccepted(true)}
      />
    </main>
  );
}