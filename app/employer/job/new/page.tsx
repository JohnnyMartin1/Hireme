"use client";
import { useState, useEffect, useMemo } from 'react';
import { useToast } from '@/components/NotificationSystem';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import { createDocument } from '@/lib/firebase-firestore';
import { auth } from '@/lib/firebase';
import SearchableDropdown from '@/components/SearchableDropdown';
import MultiSelectDropdown from '@/components/MultiSelectDropdown';
import { LOCATIONS, CAREER_INTERESTS, INDUSTRIES } from '@/lib/profile-data';
import { recruiterBtnPrimary } from "@/lib/recruiter-ui";

/**
 * Job posting wizard. Simplified to a single form for creating a job.
 * Includes fields for title, description, location, employment type,
 * salary and tags. Sends data to API endpoint /api/job/create.
 */
export default function NewJobPage() {
  const toast = useToast();
  const router = useRouter();
  const { user, profile } = useFirebaseAuth();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [location, setLocation] = useState('');
  const [employment, setEmployment] = useState('FULL_TIME');
  const [workMode, setWorkMode] = useState('IN_PERSON');
  const [salaryMin, setSalaryMin] = useState('');
  const [salaryMax, setSalaryMax] = useState('');
  const [tags, setTags] = useState('');
  const [requiredGpa, setRequiredGpa] = useState('');
  const [requiredCareerInterests, setRequiredCareerInterests] = useState<string[]>([]);
  const [industry, setIndustry] = useState('');
  const [experienceLevel, setExperienceLevel] = useState('');
  const [functionalArea, setFunctionalArea] = useState('');
  const [requiredSkillsStructured, setRequiredSkillsStructured] = useState('');
  const [preferredSkillsStructured, setPreferredSkillsStructured] = useState('');
  const [requiredMajors, setRequiredMajors] = useState('');
  const [preferredMajors, setPreferredMajors] = useState('');
  const [sponsorshipAccepted, setSponsorshipAccepted] = useState<boolean | null>(null);
  const [relocationAccepted, setRelocationAccepted] = useState<boolean | null>(null);
  const [isParsingPreview, setIsParsingPreview] = useState(false);
  const [parseSource, setParseSource] = useState<'openai' | 'heuristic' | 'failed' | null>(null);
  const [aiSuggestions, setAiSuggestions] = useState<any | null>(null);
  const [loading, setLoading] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  const salaryRangeError = useMemo(() => {
    if (!salaryMin.trim() || !salaryMax.trim()) return null;
    const min = Number(salaryMin);
    const max = Number(salaryMax);
    if (!Number.isFinite(min) || !Number.isFinite(max)) return null;
    if (max < min) return 'Salary max must be greater than or equal to salary min.';
    return null;
  }, [salaryMin, salaryMax]);

  useEffect(() => {
    setIsMounted(true);
  }, []);

  // Prevent hydration issues
  if (!isMounted) {
    return null;
  }

  // Redirect if not logged in or not an employer/recruiter
  if (!user || !profile || (profile.role !== 'EMPLOYER' && profile.role !== 'RECRUITER')) {
    router.push('/auth/login');
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Parse location (format: "City, State")
      const locationParts = location.split(',').map(s => s.trim());
      const locationCity = locationParts[0] || '';
      const locationState = locationParts[1] || '';

      // Prefer secure server-side creation with token verification
      const idToken = await auth.currentUser?.getIdToken();
      const locationDisplay = [locationCity, locationState].filter(Boolean).join(', ');
      const jobData = {
        title: title.trim(),
        description: description.trim(),
        locationCity,
        locationState,
        location: locationDisplay || null,
        employment,
        workMode,
        salaryMin: Number(salaryMin) || null,
        salaryMax: Number(salaryMax) || null,
        tags: tags.split(',').map((t) => t.trim()).filter(t => t),
        requiredGpa: requiredGpa || null,
        minGpa: requiredGpa || null,
        requiredCareerInterests,
        experienceLevel: experienceLevel.trim() || null,
        functionalArea: functionalArea.trim() || null,
        requiredSkillsStructured: requiredSkillsStructured
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        preferredSkillsStructured: preferredSkillsStructured
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        requiredMajors: requiredMajors
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        preferredMajors: preferredMajors
          .split(',')
          .map((t) => t.trim())
          .filter(Boolean),
        sponsorshipAccepted,
        relocationAccepted,
        industry: industry.trim() || null,
        employerId: user.uid,
        companyId: profile?.companyId || null,
        companyName: profile?.companyName || null,
        companyWebsite: profile?.companyWebsite || null,
        status: 'ACTIVE' as const
      };

      if (jobData.title.length < 2) {
        toast.error('Validation', 'Please enter a job title.');
        return;
      }
      if (jobData.description.length < 20) {
        toast.error('Validation', 'Description should be at least 20 characters.');
        return;
      }
      if (salaryRangeError) {
        toast.error('Validation', salaryRangeError);
        return;
      }

      const res = await fetch('/api/job/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...jobData,
          idToken
        })
      });

      const payload = await res.json().catch(() => ({}));

      if (!res.ok) {
        const errMsg =
          (payload.details && JSON.stringify(payload.details)) ||
          payload.error ||
          'Unknown error';
        console.warn('Server create failed, attempting client fallback:', errMsg);

        const { id: fallbackId, error: clientError } = await createDocument('jobs', jobData as any);

        if (clientError) {
          toast.error('Error', `Failed to create job: ${clientError}`);
          return;
        }
        toast.info(
          'Job saved',
          'Created without full server processing. Open the job and use Top Matches when available.'
        );
        if (fallbackId) {
          router.push(`/employer/job/${fallbackId}/matches`);
        } else {
          router.push('/home/employer');
        }
        return;
      }

      const newJobId = payload.jobId as string | undefined;
      if (newJobId) {
        router.push(`/employer/job/${newJobId}/matches`);
      } else {
        router.push('/home/employer');
      }
    } catch (error) {
      console.error('Error creating job:', error);
      toast.error('Error', 'Failed to create job. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleAiParsePreview = async () => {
    if (!user) return;
    if (title.trim().length < 2 || description.trim().length < 20) {
      toast.error('Missing input', 'Please add a title and a detailed description first.');
      return;
    }

    setIsParsingPreview(true);
    try {
      const idToken = await auth.currentUser?.getIdToken();
      const res = await fetch('/api/job/parse-preview', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idToken,
          title: title.trim(),
          description: description.trim(),
          tags: tags.split(',').map((t) => t.trim()).filter(Boolean),
          location,
          employment,
          jobType: employment,
          minGpa: requiredGpa || null,
          industry: industry || null,
          experienceLevel: experienceLevel || null,
          functionalArea: functionalArea || null,
          requiredSkillsStructured: requiredSkillsStructured.split(',').map((s) => s.trim()).filter(Boolean),
          preferredSkillsStructured: preferredSkillsStructured.split(',').map((s) => s.trim()).filter(Boolean),
          requiredMajors: requiredMajors.split(',').map((s) => s.trim()).filter(Boolean),
          preferredMajors: preferredMajors.split(',').map((s) => s.trim()).filter(Boolean),
          sponsorshipAccepted,
          relocationAccepted,
        }),
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok || !payload?.parsed) {
        toast.error('Parse failed', payload?.error || 'Could not parse job description.');
        return;
      }

      const parsed = payload.parsed as any;
      setAiSuggestions(parsed);
      setParseSource(payload.aiProcessingSource || null);
      toast.success('AI suggestions ready', 'Review the suggested fields and click Apply Suggestions.');
    } catch (error) {
      console.error('Error generating parse preview:', error);
      toast.error('Parse failed', 'Could not generate AI suggestions right now.');
    } finally {
      setIsParsingPreview(false);
    }
  };

  const applyAiSuggestions = () => {
    if (!aiSuggestions) return;
    const parsed = aiSuggestions;
    if (parsed.functionalArea) setFunctionalArea(parsed.functionalArea);
    if (parsed.experienceLevel) setExperienceLevel(parsed.experienceLevel);
    if (Array.isArray(parsed.requiredSkills) && parsed.requiredSkills.length) {
      setRequiredSkillsStructured(parsed.requiredSkills.join(', '));
    }
    if (Array.isArray(parsed.preferredSkills) && parsed.preferredSkills.length) {
      setPreferredSkillsStructured(parsed.preferredSkills.join(', '));
    }
    if (Array.isArray(parsed.requiredMajors) && parsed.requiredMajors.length) {
      setRequiredMajors(parsed.requiredMajors.join(', '));
    }
    if (Array.isArray(parsed.preferredMajors) && parsed.preferredMajors.length) {
      setPreferredMajors(parsed.preferredMajors.join(', '));
    }
    if (parsed.minGpa && !requiredGpa) setRequiredGpa(String(parsed.minGpa));
    if (Array.isArray(parsed.industries) && parsed.industries.length && !industry) {
      setIndustry(parsed.industries[0]);
    }
    if (typeof parsed.sponsorshipAccepted === 'boolean' && sponsorshipAccepted == null) {
      setSponsorshipAccepted(parsed.sponsorshipAccepted);
    }
    if (typeof parsed.relocationAccepted === 'boolean' && relocationAccepted == null) {
      setRelocationAccepted(parsed.relocationAccepted);
    }
    toast.success('Suggestions applied', 'You can edit any field before posting.');
  };

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      {/* Header */}
      <header className="sticky top-0 z-50 border-b border-slate-100 bg-white shadow-sm">
        <div className="mx-auto flex max-w-7xl items-center px-4 py-3 sm:px-6 lg:px-8">
          <Link
            href="/home/employer"
            className="group flex min-h-[44px] items-center gap-2 rounded-lg px-3 py-2 text-navy-800 transition-all duration-200 hover:bg-sky-50 hover:text-navy-600 hover:shadow-md"
          >
            <ArrowLeft className="h-4 w-4 transition-transform duration-200 group-hover:-translate-x-1 sm:h-5 sm:w-5" />
            <span className="hidden text-sm font-medium sm:inline sm:text-base">Back to Dashboard</span>
            <span className="text-sm font-medium sm:hidden sm:text-base">Back</span>
          </Link>
        </div>
      </header>

      <div className="w-full md:max-w-4xl md:mx-auto px-4 sm:px-6 md:px-6 lg:px-8 pb-28 sm:pb-32 md:pb-36 min-w-0">

        {/* Page Header */}
        <section className="mb-4 sm:mb-6 md:mb-10 px-2 sm:px-0">
          <h1 className="text-2xl sm:text-3xl font-bold text-navy-900 break-words">Post a Job</h1>
        </section>

        <form onSubmit={handleSubmit} className="space-y-3 sm:space-y-4 md:space-y-6 lg:space-y-8">
          {/* Job Details Card */}
          <section className="mb-3 w-full min-w-0 overflow-visible rounded-none border-x-0 border-slate-200 bg-white/90 p-4 shadow-sm backdrop-blur-sm sm:mb-0 sm:rounded-xl sm:border md:rounded-2xl md:p-8 sm:p-6">
            <div className="space-y-6">
              {/* Job Title */}
              <div className="relative">
                <input 
                  id="title" 
                  type="text" 
                  value={title} 
                  onChange={(e) => setTitle(e.target.value)} 
                  className="form-input w-full px-4 py-3 text-base border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 min-h-[44px]" 
                  placeholder="e.g. Software Engineer" 
                  required 
                />
                <label htmlFor="title" className="absolute left-4 -top-2 text-sm text-navy-800 bg-white px-1">Job Title *</label>
              </div>

              {/* Description */}
              <div className="relative">
                <textarea 
                  id="description" 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  className="form-input w-full px-4 py-3 text-base border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 resize-none min-h-[120px]" 
                  rows={5}
                  placeholder="Describe the role, responsibilities, and what you're looking for..." 
                  required 
                />
                <label htmlFor="description" className="absolute left-4 -top-2 text-sm text-navy-800 bg-white px-1">Description *</label>
              </div>
              <div className="rounded-lg border border-sky-200 bg-sky-50 p-3 sm:p-4">
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <p className="text-xs sm:text-sm text-slate-700">
                    Description is the primary input. Generate structured requirements from AI, then confirm/edit before posting.
                  </p>
                  <button
                    type="button"
                    onClick={handleAiParsePreview}
                    disabled={isParsingPreview}
                    className="bg-navy-800 text-white px-4 py-2 rounded-lg text-sm font-semibold hover:bg-navy-700 disabled:opacity-60"
                  >
                    {isParsingPreview ? 'Parsing...' : 'Generate AI Suggestions'}
                  </button>
                </div>
                {parseSource && (
                  <p className="text-xs text-slate-500 mt-2">
                    Last parse source: <span className="font-medium">{parseSource}</span>
                  </p>
                )}
                {aiSuggestions && (
                  <div className="mt-3 rounded-lg border border-slate-200 bg-white p-3">
                    <p className="text-xs font-semibold text-navy-900 mb-2">AI Suggested Structured Fields</p>
                    <p className="text-xs text-slate-600 mb-2">
                      Normalized title: <span className="font-medium">{aiSuggestions.normalizedTitle || 'N/A'}</span>
                    </p>
                    <div className="text-xs text-slate-600 space-y-1">
                      <p>Required skills: {(aiSuggestions.requiredSkills || []).slice(0, 8).join(', ') || 'none'}</p>
                      <p>Preferred skills: {(aiSuggestions.preferredSkills || []).slice(0, 8).join(', ') || 'none'}</p>
                      <p>Functions: {(aiSuggestions.jobFunctions || []).slice(0, 6).join(', ') || 'none'}</p>
                      <p>Role aliases: {(aiSuggestions.roleAliases || []).slice(0, 6).join(', ') || 'none'}</p>
                      <p>Min GPA: {aiSuggestions.minGpa || 'none'}</p>
                    </div>
                    <button
                      type="button"
                      onClick={applyAiSuggestions}
                      className="mt-3 bg-navy-800 text-white px-3 py-2 rounded-lg text-xs font-semibold hover:bg-navy-700"
                    >
                      Apply Suggestions
                    </button>
                  </div>
                )}
              </div>

              {/* Location */}
              <div className="relative">
                <SearchableDropdown
                  label="Location"
                  options={LOCATIONS}
                  value={location}
                  onChange={setLocation}
                  placeholder="Search for a city..."
                  required={true}
                />
              </div>

              {/* Job Type & Work Mode */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <select 
                    id="employment" 
                    value={employment} 
                    onChange={(e) => setEmployment(e.target.value)} 
                    className="form-input w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 appearance-none" 
                    required
                  >
                    <option value="FULL_TIME">Full-time</option>
                    <option value="PART_TIME">Part-time</option>
                    <option value="CONTRACT">Contract</option>
                    <option value="INTERNSHIP">Internship</option>
                  </select>
                  <label htmlFor="employment" className="absolute left-4 -top-2 text-sm text-navy-800 bg-white px-1">Job Type *</label>
                  <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                </div>

                <div className="relative">
                  <select 
                    id="workMode" 
                    value={workMode} 
                    onChange={(e) => setWorkMode(e.target.value)} 
                    className="form-input w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 appearance-none" 
                    required
                  >
                    <option value="IN_PERSON">In-person</option>
                    <option value="HYBRID">Hybrid</option>
                    <option value="REMOTE">Remote</option>
                  </select>
                  <label htmlFor="workMode" className="absolute left-4 -top-2 text-sm text-navy-800 bg-white px-1">Work Mode *</label>
                  <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                </div>
              </div>

              {/* Salary Range */}
              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <div className="relative">
                  <label htmlFor="salaryMin" className="absolute -top-2 left-3 z-[1] bg-white px-1 text-sm text-slate-600">
                    Salary Min (optional)
                  </label>
                  <div className="mt-1 flex min-h-[48px] items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-navy-800 focus-within:ring-2 focus-within:ring-navy/10">
                    <span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-slate-600">$</span>
                    <input
                      id="salaryMin"
                      type="number"
                      value={salaryMin}
                      onChange={(e) => setSalaryMin(e.target.value)}
                      className="form-input min-w-0 flex-1 border-0 py-3 pr-4 pl-3 text-base focus:outline-none focus:ring-0"
                      placeholder="50000"
                      min="0"
                    />
                  </div>
                </div>

                <div className="relative">
                  <label htmlFor="salaryMax" className="absolute -top-2 left-3 z-[1] bg-white px-1 text-sm text-slate-600">
                    Salary Max (optional)
                  </label>
                  <div className="mt-1 flex min-h-[48px] items-stretch overflow-hidden rounded-lg border border-slate-300 bg-white focus-within:border-navy-800 focus-within:ring-2 focus-within:ring-navy/10">
                    <span className="flex shrink-0 items-center border-r border-slate-200 bg-slate-50 px-3 text-slate-600">$</span>
                    <input
                      id="salaryMax"
                      type="number"
                      value={salaryMax}
                      onChange={(e) => setSalaryMax(e.target.value)}
                      className="form-input min-w-0 flex-1 border-0 py-3 pr-4 pl-3 text-base focus:outline-none focus:ring-0"
                      placeholder="80000"
                      min="0"
                    />
                  </div>
                </div>
              </div>
              {salaryRangeError ? <p className="text-sm text-rose-600">{salaryRangeError}</p> : null}

              {/* Tags */}
              <div className="relative">
                <input 
                  id="tags" 
                  type="text" 
                  value={tags} 
                  onChange={(e) => setTags(e.target.value)} 
                  className="form-input w-full px-4 py-3 text-base border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 min-h-[44px]" 
                  placeholder="Enter tags separated by commas (e.g. React, JavaScript, Remote)" 
                />
                <label htmlFor="tags" className="absolute left-4 -top-2 text-sm text-slate-600 bg-white px-1">Tags</label>
              </div>

              <div className="relative">
                <SearchableDropdown
                  label="Industry"
                  options={INDUSTRIES}
                  value={industry}
                  onChange={setIndustry}
                  placeholder="Select industry (used for matching)"
                  required={false}
                />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input
                    id="functionalArea"
                    type="text"
                    value={functionalArea}
                    onChange={(e) => setFunctionalArea(e.target.value)}
                    className="form-input w-full px-4 py-3 text-base border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 min-h-[44px]"
                    placeholder="e.g. Financial Analysis, Product Design"
                  />
                  <label htmlFor="functionalArea" className="absolute left-4 -top-2 text-sm text-slate-600 bg-white px-1">Functional Area / Role Track</label>
                </div>
                <div className="relative">
                  <select
                    id="experienceLevel"
                    value={experienceLevel}
                    onChange={(e) => setExperienceLevel(e.target.value)}
                    className="form-input w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 appearance-none"
                  >
                    <option value="">Any experience level</option>
                    <option value="intern">Intern</option>
                    <option value="entry">Entry level</option>
                    <option value="mid">Mid level</option>
                    <option value="senior">Senior</option>
                    <option value="leadership">Leadership</option>
                  </select>
                  <label htmlFor="experienceLevel" className="absolute left-4 -top-2 text-sm text-slate-600 bg-white px-1">Experience Level</label>
                  <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                </div>
              </div>
            </div>
          </section>

          {/* Candidate Requirements Card */}
          <section className="w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-6 md:p-8 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-slate-200 mb-3 sm:mb-0">
            <h3 className="text-base sm:text-lg md:text-xl font-bold text-navy-800 mb-2">Structured Matching Anchors</h3>
            <p className="text-xs sm:text-sm text-slate-600 mb-4 sm:mb-6">Optional but high-value fields. AI suggests defaults from your paragraph, then you confirm/edit for matching accuracy.</p>

            <div className="space-y-6">
              {/* Minimum GPA */}
              <div className="relative">
                <select 
                  id="requiredGpa" 
                  value={requiredGpa} 
                  onChange={(e) => setRequiredGpa(e.target.value)} 
                  className="form-input w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 appearance-none"
                >
                  <option value="">No GPA requirement</option>
                  <option value="2.5">2.5+</option>
                  <option value="3.0">3.0+</option>
                  <option value="3.5">3.5+</option>
                  <option value="3.8">3.8+</option>
                </select>
                <label htmlFor="requiredGpa" className="absolute left-4 -top-2 text-sm text-slate-600 bg-white px-1">Minimum GPA</label>
                <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
              </div>

              {/* Required Career Interests */}
              <div className="relative">
                <MultiSelectDropdown
                  options={CAREER_INTERESTS}
                  values={requiredCareerInterests}
                  onChange={setRequiredCareerInterests}
                  placeholder="Select career interests"
                  label={`Required Career Interests (${requiredCareerInterests.length}/5)`}
                  allowCustom={false}
                  maxSelections={5}
                />
                <p className="text-xs text-slate-500 mt-1">
                  Select up to 5 career interests that candidates should have
                </p>
              </div>

              <div className="relative">
                <input
                  id="requiredSkillsStructured"
                  type="text"
                  value={requiredSkillsStructured}
                  onChange={(e) => setRequiredSkillsStructured(e.target.value)}
                  className="form-input w-full px-4 py-3 text-base border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 min-h-[44px]"
                  placeholder="e.g. valuation, excel, financial modeling"
                />
                <label htmlFor="requiredSkillsStructured" className="absolute left-4 -top-2 text-sm text-slate-600 bg-white px-1">Required Skills</label>
              </div>

              <div className="relative">
                <input
                  id="preferredSkillsStructured"
                  type="text"
                  value={preferredSkillsStructured}
                  onChange={(e) => setPreferredSkillsStructured(e.target.value)}
                  className="form-input w-full px-4 py-3 text-base border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 min-h-[44px]"
                  placeholder="e.g. SQL, Tableau, Python"
                />
                <label htmlFor="preferredSkillsStructured" className="absolute left-4 -top-2 text-sm text-slate-600 bg-white px-1">Preferred Skills</label>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <input
                    id="requiredMajors"
                    type="text"
                    value={requiredMajors}
                    onChange={(e) => setRequiredMajors(e.target.value)}
                    className="form-input w-full px-4 py-3 text-base border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 min-h-[44px]"
                    placeholder="e.g. Finance, Accounting"
                  />
                  <label htmlFor="requiredMajors" className="absolute left-4 -top-2 text-sm text-slate-600 bg-white px-1">Required Majors</label>
                </div>
                <div className="relative">
                  <input
                    id="preferredMajors"
                    type="text"
                    value={preferredMajors}
                    onChange={(e) => setPreferredMajors(e.target.value)}
                    className="form-input w-full px-4 py-3 text-base border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 min-h-[44px]"
                    placeholder="e.g. Economics, Math"
                  />
                  <label htmlFor="preferredMajors" className="absolute left-4 -top-2 text-sm text-slate-600 bg-white px-1">Preferred Majors</label>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="relative">
                  <select
                    id="sponsorshipAccepted"
                    value={sponsorshipAccepted == null ? "" : sponsorshipAccepted ? "yes" : "no"}
                    onChange={(e) => {
                      if (!e.target.value) setSponsorshipAccepted(null);
                      else setSponsorshipAccepted(e.target.value === "yes");
                    }}
                    className="form-input w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 appearance-none"
                  >
                    <option value="">Sponsorship not specified</option>
                    <option value="yes">Sponsorship accepted</option>
                    <option value="no">Sponsorship not accepted</option>
                  </select>
                  <label htmlFor="sponsorshipAccepted" className="absolute left-4 -top-2 text-sm text-slate-600 bg-white px-1">Sponsorship Policy</label>
                  <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                </div>
                <div className="relative">
                  <select
                    id="relocationAccepted"
                    value={relocationAccepted == null ? "" : relocationAccepted ? "yes" : "no"}
                    onChange={(e) => {
                      if (!e.target.value) setRelocationAccepted(null);
                      else setRelocationAccepted(e.target.value === "yes");
                    }}
                    className="form-input w-full px-4 py-3 border border-slate-300 rounded-lg bg-white focus:outline-none focus:border-navy-800 focus:ring-2 focus:ring-navy/10 transition-all duration-200 appearance-none"
                  >
                    <option value="">Relocation not specified</option>
                    <option value="yes">Relocation accepted</option>
                    <option value="no">Relocation not accepted</option>
                  </select>
                  <label htmlFor="relocationAccepted" className="absolute left-4 -top-2 text-sm text-slate-600 bg-white px-1">Relocation Policy</label>
                  <i className="fa-solid fa-chevron-down absolute right-4 top-4 text-slate-400 pointer-events-none"></i>
                </div>
              </div>
            </div>
          </section>

          <div
            className="fixed bottom-0 left-0 right-0 z-40 border-t border-slate-200 bg-white/95 backdrop-blur-sm shadow-[0_-8px_30px_rgba(15,23,42,0.06)]"
            style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
          >
            <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 flex justify-end">
              <button
                type="submit"
                disabled={loading || Boolean(salaryRangeError)}
                className={`${recruiterBtnPrimary} min-h-[44px] px-6 sm:px-8 py-2.5 sm:py-3`}
              >
                <span>{loading ? "Posting…" : "Post job"}</span>
                <i className={`fa-solid ${loading ? "fa-spinner animate-spin" : "fa-plus"}`} />
              </button>
            </div>
          </div>
        </form>
      </div>
    </main>
  );
}