"use client";
import { useState, useEffect, useRef } from "react";
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
    majors: [""], // Array to support up to 2 majors
    minor: "",
    graduationYear: "",
  });
  const [verificationCode, setVerificationCode] = useState("");
  const [emailSent, setEmailSent] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [termsAccepted, setTermsAccepted] = useState(false);
  const [termsModalOpen, setTermsModalOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [additionalEducation, setAdditionalEducation] = useState<Array<{
    school: string;
    major: string;
    minor: string;
    graduationYear: string;
  }>>([]);
  const firstInputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    // Clear error when user starts typing
    if (error) {
      setError(null);
    }
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  const handleDropdownChange = (field: string, value: string) => {
    // Clear error when user makes a selection
    if (error) {
      setError(null);
    }
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleMajorChange = (index: number, value: string) => {
    setFormData(prev => {
      const newMajors = [...prev.majors];
      newMajors[index] = value;
      // If first major is filled and we don't have a second slot, add it
      if (index === 0 && value && newMajors.length === 1) {
        newMajors.push("");
      }
      // Remove empty majors at the end (but keep at least one)
      while (newMajors.length > 1 && newMajors[newMajors.length - 1] === "" && newMajors[newMajors.length - 2] === "") {
        newMajors.pop();
      }
      return {
        ...prev,
        majors: newMajors
      };
    });
  };

  const removeMajor = (index: number) => {
    setFormData(prev => ({
      ...prev,
      majors: prev.majors.filter((_, i) => i !== index)
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
    
    // Optimistic update - show success immediately
    setError(null);
    setIsLoading(true);

    try {
      // Use AbortController for timeout (5 seconds max)
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 5000);

      const response = await fetch('/api/auth/send-verification-code', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: formData.email,
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const data = await response.json();

      if (!response.ok) {
        setError(data.error || 'Failed to send verification code. Please try again.');
        setIsLoading(false);
        return;
      }

      if (data.success) {
        // Success - show immediately
        setEmailSent(true);
        setIsLoading(false);
      } else {
        setError(data.error || 'Failed to send verification code');
        setIsLoading(false);
      }
    } catch (error: any) {
      if (error.name === 'AbortError') {
        setError('Request timed out. Please try again.');
      } else {
        console.error('Error sending verification code:', error);
        setError('Failed to send verification code. Please try again.');
      }
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

    const validMajors = formData.majors.filter(m => m.trim() !== "");
    if (!formData.school || validMajors.length === 0 || !formData.graduationYear) {
      setError("University, at least one major, and graduation year are required");
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
        setIsLoading(false);
        return;
      }

      if (user) {
        // Create user profile in Firestore
        const validMajors = formData.majors.filter(m => m.trim() !== "");
        // Filter out empty additional education entries
        const validAdditionalEducation = additionalEducation.filter(edu => 
          edu.school.trim() !== '' || edu.major.trim() !== '' || edu.graduationYear.trim() !== ''
        );

        const profileData = {
          firstName: formData.firstName,
          lastName: formData.lastName,
          email: formData.email,
          role: 'JOB_SEEKER',
          school: formData.school,
          major: validMajors[0] || '', // Keep first major for backward compatibility
          majors: validMajors, // Store as array
          minor: formData.minor || '',
          graduationYear: formData.graduationYear,
          additionalEducation: validAdditionalEducation.length > 0 ? validAdditionalEducation : undefined,
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

  // Detect mobile device
  useEffect(() => {
    const checkMobile = () => {
      if (typeof window !== 'undefined') {
        // Check screen width
        const isMobileWidth = window.innerWidth < 1024; // lg breakpoint
        // Check user agent for mobile devices
        const isMobileUA = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
          navigator.userAgent
        );
        setIsMobile(isMobileWidth || isMobileUA);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  return (
    <main className="min-h-screen flex flex-col lg:flex-row bg-brand-gray mobile-safe-top mobile-safe-bottom">
      {/* Left Column - Content & Form */}
      <div className="w-full lg:w-[48%] flex flex-col bg-white relative overflow-y-auto lg:max-h-screen">
        <div className="flex flex-col w-full max-w-[560px] mx-auto p-4 sm:p-6 md:p-8 py-4 sm:py-6">
          {/* Progress Stepper */}
          <div className="flex flex-wrap items-center gap-2 sm:flex-nowrap sm:gap-4 text-xs sm:text-sm mb-4 sm:mb-6">
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
          <div className="w-full bg-light-gray rounded-full h-2 mb-4 sm:mb-6">
            <div 
              className="bg-navy-800 h-2 rounded-full transition-all duration-300" 
              style={{ width: `${getProgressPercentage()}%` }}
            ></div>
          </div>

          {/* Step 1: Email Verification */}
          {currentStep === 1 && (
            <div>
              <h1 className="text-2xl sm:text-4xl font-bold text-text-primary mb-3 sm:mb-4">Enter your email to get started</h1>
              <div className="space-y-3 sm:space-y-4">
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
                  <div className="space-y-4 pb-6">
                    <div className="text-sm text-success-green">Code sent to {formData.email}</div>
                    {/* Hidden inputs for autofill support */}
                    {/* Hidden email input for mobile autofill - must be visible to browser but not to user */}
                    <input
                      type="email"
                      name="email"
                      value={formData.email}
                      autoComplete="email"
                      readOnly
                      style={{ position: 'absolute', left: '-9999px', opacity: 0, pointerEvents: 'none', width: '1px', height: '1px' }}
                      tabIndex={-1}
                      aria-hidden="true"
                    />
                    <div className="grid grid-cols-6 gap-2 sm:gap-3 justify-center">
                      {[1, 2, 3, 4, 5, 6].map((digit) => {
                        const isFirstInput = digit === 1;
                        return (
                        <input 
                          key={digit}
                          ref={isFirstInput ? firstInputRef : null}
                          type="tel"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          maxLength={isFirstInput ? 6 : 1}
                          autoComplete={isFirstInput ? "one-time-code" : "off"}
                          value={verificationCode[digit - 1] || ''}
                          onChange={(e) => {
                            // Only allow numeric input
                            const value = e.target.value.replace(/[^0-9]/g, '');
                            
                            // If browser autofills or user pastes multiple digits in first input
                            if (value.length > 1 && isFirstInput) {
                              const fullCode = value.slice(0, 6).padEnd(6, '');
                              setVerificationCode(fullCode);
                              // Clear the first input and show only the first digit
                              if (firstInputRef.current) {
                                firstInputRef.current.value = fullCode[0] || '';
                              }
                              // Focus the last input after autofill
                              setTimeout(() => {
                                const lastInput = document.querySelector(`input[data-digit="6"]`) as HTMLInputElement;
                                if (lastInput) {
                                  lastInput.focus();
                                }
                              }, 100);
                              return;
                            }
                            
                            if (value.length > 1 && !isFirstInput) return; // Only single digit for other inputs
                            
                            const newCode = verificationCode.split('');
                            newCode[digit - 1] = value;
                            setVerificationCode(newCode.join(''));
                            
                            // Auto-advance to next input if a digit was entered
                            if (value && digit < 6) {
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
                            // Only allow numeric keys, backspace, delete, arrow keys
                            if (!/[0-9]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab', 'Enter'].includes(e.key)) {
                              e.preventDefault();
                            }
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
                          className="w-12 h-14 sm:w-12 sm:h-14 text-center text-xl sm:text-xl font-bold border-2 border-slate-200 rounded-xl focus:border-navy-800 focus:outline-none transition-all duration-200 min-h-[56px]"
                        />
                        );
                      })}
                    </div>
                    {error && <div className="text-sm text-error-red">{error}</div>}
                    <button 
                      type="button" 
                      onClick={verifyCode}
                      disabled={isLoading || verificationCode.length !== 6}
                      className="w-full bg-navy-800 text-white py-4 rounded-xl font-semibold hover:bg-opacity-90 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed min-h-[48px]"
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
              <h1 className="text-4xl font-bold text-text-primary mb-4">Create your account</h1>
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      First name <span className="text-red-500">*</span>
                    </label>
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
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Last name <span className="text-red-500">*</span>
                    </label>
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
                
                <div>
                  <label className="block text-sm font-medium text-slate-700 mb-2">
                    Email <span className="text-red-500">*</span>
                  </label>
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
                </div>

                {/* College Section */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                    College <span className="text-red-500">*</span>
                  </label>
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

                {/* Majors Section */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                    Majors <span className="text-red-500">*</span>
                  </label>
                  <div className="space-y-3">
                    {formData.majors.map((major, index) => (
                      <div key={index} className="flex items-start gap-2">
                        <div className="flex-1">
                          <SearchableDropdown
                            options={MAJORS}
                            value={major}
                            onChange={(value) => handleMajorChange(index, value)}
                            placeholder={index === 0 ? "Select your major" : "Select second major (optional)"}
                            label={index === 0 ? "Major" : `Major ${index + 1}`}
                            required={index === 0}
                            allowCustom
                          />
                        </div>
                        {index > 0 && (
                          <button
                            type="button"
                            onClick={() => removeMajor(index)}
                            className="mt-8 p-2 text-slate-400 hover:text-red-500 transition-colors"
                            aria-label="Remove major"
                          >
                            <i className="fa-solid fa-times"></i>
                          </button>
                        )}
                      </div>
                    ))}
                    {formData.majors.length < 2 && formData.majors[0] && (
                      <button
                        type="button"
                        onClick={() => {
                          setFormData(prev => ({
                            ...prev,
                            majors: [...prev.majors, ""]
                          }));
                        }}
                        className="text-sm text-navy-800 hover:text-navy-600 font-medium flex items-center gap-2"
                      >
                        <i className="fa-solid fa-plus"></i>
                        Add Second Major
                      </button>
                    )}
                  </div>
                </div>

                {/* Minor Section */}
                <div>
                  <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">Minor</label>
                  <SearchableDropdown
                    options={MINORS}
                    value={formData.minor}
                    onChange={(value) => handleDropdownChange('minor', value)}
                    placeholder="Select your minor (optional)"
                    label="Minor"
                    allowCustom
                  />
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

                {/* Additional Education Entries */}
                {additionalEducation.map((edu, index) => (
                  <div key={index} className="mt-4 p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-3">
                    <div className="flex items-center justify-between mb-3">
                      <h3 className="text-sm font-semibold text-slate-700">Additional Education {index + 1}</h3>
                      <button
                        type="button"
                        onClick={() => {
                          setAdditionalEducation(prev => prev.filter((_, i) => i !== index));
                        }}
                        className="text-slate-400 hover:text-red-500 transition-colors"
                      >
                        <i className="fa-solid fa-times"></i>
                      </button>
                    </div>
                    
                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                        College
                      </label>
                      <SearchableDropdown
                        options={UNIVERSITIES}
                        value={edu.school}
                        onChange={(value) => {
                          setAdditionalEducation(prev => prev.map((item, i) => 
                            i === index ? { ...item, school: value } : item
                          ));
                        }}
                        placeholder="Select your university"
                        label="University"
                        allowCustom
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                        Major
                      </label>
                      <SearchableDropdown
                        options={MAJORS}
                        value={edu.major}
                        onChange={(value) => {
                          setAdditionalEducation(prev => prev.map((item, i) => 
                            i === index ? { ...item, major: value } : item
                          ));
                        }}
                        placeholder="Select your major"
                        label="Major"
                        allowCustom
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-slate-500 mb-2 uppercase tracking-wide">
                        Minor (optional)
                      </label>
                      <SearchableDropdown
                        options={MINORS}
                        value={edu.minor}
                        onChange={(value) => {
                          setAdditionalEducation(prev => prev.map((item, i) => 
                            i === index ? { ...item, minor: value } : item
                          ));
                        }}
                        placeholder="Select your minor (optional)"
                        label="Minor"
                        allowCustom
                      />
                    </div>

                    <div>
                      <SearchableDropdown
                        options={GRADUATION_YEARS}
                        value={edu.graduationYear}
                        onChange={(value) => {
                          setAdditionalEducation(prev => prev.map((item, i) => 
                            i === index ? { ...item, graduationYear: value } : item
                          ));
                        }}
                        placeholder="Select graduation year"
                        label="Graduation Year"
                      />
                    </div>
                  </div>
                ))}

                <div className="mt-2">
                  <button
                    type="button"
                    onClick={() => {
                      setAdditionalEducation(prev => [...prev, {
                        school: '',
                        major: '',
                        minor: '',
                        graduationYear: ''
                      }]);
                    }}
                    className="text-sm text-navy-800 hover:text-navy-600 font-medium flex items-center gap-2 transition-colors"
                  >
                    <i className="fa-solid fa-plus text-xs"></i>
                    Add education
                  </button>
                </div>

                <div className="space-y-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-700 mb-2">
                      Password <span className="text-red-500">*</span>
                    </label>
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
                  <div className="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700 flex items-start gap-3">
                    <i className="fa-solid fa-circle-exclamation text-red-600 mt-0.5 flex-shrink-0"></i>
                    <div className="flex-1">
                      <strong className="font-semibold">Error:</strong> {error}
                    </div>
                  </div>
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
                  Let's finish setting up your profile so<br />employers can discover your amazing<br />potential.
                </p>

                {/* Mobile Device Message */}
                {isMobile && (
                  <div className="bg-sky-50 border-2 border-sky-200 rounded-xl p-6 text-left">
                    <div className="flex items-start gap-3">
                      <div className="flex-shrink-0 mt-1">
                        <i className="fa-solid fa-mobile-screen-button text-sky-600 text-2xl"></i>
                      </div>
                      <div className="flex-1">
                        <h3 className="font-semibold text-navy-900 mb-2 text-lg">
                          Complete Your Profile on Desktop
                        </h3>
                        <p className="text-slate-700 text-sm leading-relaxed">
                          We've noticed you're on a mobile device. While you can complete your profile setup here, 
                          many users find it easier and create more detailed profiles when using a computer. 
                          Feel free to skip the next sections by pressing "Next" on each step, and we'll send you 
                          a friendly reminder email to finish your profile setup when you're at your computer.
                        </p>
                      </div>
                    </div>
                  </div>
                )}

                <button 
                  onClick={(e) => {
                    e.preventDefault();
                    try {
                      router.replace("/auth/signup/seeker/steps");
                    } catch (err) {
                      console.error('Navigation error:', err);
                      window.location.href = "/auth/signup/seeker/steps";
                    }
                  }}
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
      <div className="hidden lg:block w-[52%] bg-brand-gray p-8 overflow-y-auto lg:h-screen relative">
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