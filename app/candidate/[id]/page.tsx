"use client";
import { useParams } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState, useRef } from "react";
import { User, MapPin, GraduationCap, Star, MessageSquare, Heart, Loader2, ArrowLeft, Send, Video, FileText, Download, X, Code, Briefcase, Plane, Calendar, Copy, Check, Building2, UserCircle, Award, Globe } from "lucide-react";
import { getDocument, getOrCreateThread, sendMessage, saveCandidate, isCandidateSaved, getEndorsements } from '@/lib/firebase-firestore';
import Link from 'next/link';
import { trackProfileView } from '@/lib/firebase-firestore';
import { getEmployerJobs, getCompanyJobs } from '@/lib/firebase-firestore';
import { calculateCompletion } from '@/components/ProfileCompletionProvider';

interface CandidateProfile {
  id: string;
  firstName?: string;
  lastName?: string;
  headline?: string;
  school?: string;
  major?: string;
  minor?: string;
  skills?: string[];
  location?: string;
  bio?: string;
  graduationYear?: string;
  gpa?: string;
  workPreferences?: string[];
  jobTypes?: string[];
  extracurriculars?: string[];
  experience?: string;
  certifications?: string[];
  languages?: string[];
  careerInterests?: string[];
  workAuthorization?: {
    authorizedToWork: boolean | null;
    requiresVisaSponsorship: boolean | null;
  };
  linkedinUrl?: string;
  portfolioUrl?: string;
  locations?: string[];
  email: string;
  createdAt?: any;
  profileImageUrl?: string;
  resumeUrl?: string;
  videoUrl?: string;
  education?: Array<{
    school: string;
    degree: string;
    majors: string[];
    minors: string[];
    graduationYear: string;
    gpa: string;
  }>;
  [key: string]: any;
}

export default function CandidateProfilePage() {
  const params = useParams();
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [candidate, setCandidate] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showMessageDialog, setShowMessageDialog] = useState(false);
  const [messageContent, setMessageContent] = useState('');
  const [isSendingMessage, setIsSendingMessage] = useState(false);
  const [selectedJobId, setSelectedJobId] = useState<string | null>(null);
  const [employerJobs, setEmployerJobs] = useState<any[]>([]);
  const [isSaved, setIsSaved] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [showResumeModal, setShowResumeModal] = useState(false);
  const [resumePreviewError, setResumePreviewError] = useState(false);
  const [useGoogleViewer, setUseGoogleViewer] = useState(false);
  const [endorsements, setEndorsements] = useState<any[]>([]);
  const [experienceExpanded, setExperienceExpanded] = useState(false);
  const [stickyBarVisible, setStickyBarVisible] = useState(false);
  const [copyLinkSuccess, setCopyLinkSuccess] = useState(false);
  const heroCardRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchCandidateProfile = async () => {
      if (!params.id) return;

      setIsLoading(true);
      try {
        // Use profile from auth context if viewing own profile, otherwise fetch
        if (user && user.uid === params.id && profile) {
          console.log('Using profile from auth context for own profile');
          setCandidate(profile as any);
        } else {
          const { data, error } = await getDocument('users', params.id as string);

          if (error) {
            setError(error);
            return;
          }

          if (!data) {
            setError('Candidate not found');
            return;
          }

          // Check if this is actually a job seeker
          if ((data as any).role !== 'JOB_SEEKER') {
            setError('Profile not found');
            return;
          }

          // If user is an employer/recruiter viewing someone else's profile, check completion
          // Admins can view any profile regardless of completion
          if (user && user.uid !== params.id && (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER')) {
            // Allow admins to bypass completion check
            const isAdmin = user.email === 'officialhiremeapp@gmail.com' || profile?.role === 'ADMIN';
            if (!isAdmin) {
              const completion = calculateCompletion(data);
              if (completion < 70) {
                setError('This candidate profile is not yet complete. Profiles must be at least 70% complete to be visible to employers.');
                return;
              }
            }
          }

          setCandidate(data);
        }

        // Track profile view if user is logged in and viewing someone else's profile
        // Only track for employers/recruiters if profile is 70%+ complete (already checked above)
        if (user && user.uid !== params.id) {
          await trackProfileView(params.id as string, user.uid);
        }

        // Check if candidate is saved (for employers and recruiters)
        if (user && (profile?.role === 'EMPLOYER' || profile?.role === 'RECRUITER')) {
          const { saved } = await isCandidateSaved(user.uid, params.id as string);
          setIsSaved(saved);
        }

        // Fetch endorsements
        const { data: endorsementsData } = await getEndorsements(params.id as string);
        if (endorsementsData) {
          setEndorsements(endorsementsData);
        }

      } catch (err) {
        console.error('Error fetching candidate profile:', err);
        setError('Failed to load candidate profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandidateProfile();
  }, [params.id, user, profile]);

  // Handle sticky bar visibility
  useEffect(() => {
    const handleScroll = () => {
      if (heroCardRef.current) {
        const rect = heroCardRef.current.getBoundingClientRect();
        setStickyBarVisible(rect.bottom < 100);
      }
    };

    window.addEventListener('scroll', handleScroll);
    handleScroll(); // Initial check

    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Copy profile link
  const handleCopyLink = async () => {
    try {
      await navigator.clipboard.writeText(window.location.href);
      setCopyLinkSuccess(true);
      setTimeout(() => setCopyLinkSuccess(false), 2000);
    } catch (err) {
      console.error('Failed to copy link:', err);
    }
  };

  // Get initials
  const getInitials = (firstName?: string, lastName?: string) => {
    const first = firstName?.[0] || '';
    const last = lastName?.[0] || '';
    return (first + last).toUpperCase() || 'U';
  };

  const handleSendMessage = async () => {
    if (!user || !profile || !candidate || !messageContent.trim()) return;

    // For employers and recruiters, require job selection
    if ((profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && !selectedJobId) {
      setError('Please select a job position to attach to your message');
      return;
    }

    setIsSendingMessage(true);
    try {
      const participantIds = [user.uid, candidate.id].sort();
      const { id: threadId, error: threadError } = await getOrCreateThread(participantIds);

      if (threadError || !threadId) {
        console.error('Error creating thread:', threadError);
        setError('Failed to create message thread');
        return;
      }

      // Auto-accept the thread for the employer who is initiating contact
      const { acceptMessageThread } = await import('@/lib/firebase-firestore');
      await acceptMessageThread(threadId, user.uid);

      // Get job details if employer or recruiter
      let jobDetails = null;
      if ((profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && selectedJobId) {
        const selectedJob = employerJobs.find(job => job.id === selectedJobId);
        if (selectedJob) {
          jobDetails = {
            jobId: selectedJob.id,
            jobTitle: selectedJob.title,
            jobDescription: selectedJob.description,
            employmentType: selectedJob.employment,
            location: `${selectedJob.locationCity || ''} ${selectedJob.locationState || ''}`.trim()
          };
        }
      }

      const messageData: any = {
        senderId: user.uid,
        senderName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Employer',
        content: messageContent.trim()
      };
      
      // Only add jobDetails if it exists
      if (jobDetails) {
        messageData.jobDetails = jobDetails;
      }

      const { error: messageError } = await sendMessage(threadId, messageData);

      if (messageError) {
        console.error('Error sending message:', messageError);
        setError('Failed to send message');
        return;
      }

      // Close dialog and redirect to messages
      setShowMessageDialog(false);
      setMessageContent('');
      setSelectedJobId('');
      router.push(`/messages/${threadId}`);

    } catch (err) {
      console.error('Error in handleSendMessage:', err);
      setError('Failed to send message');
    } finally {
      setIsSendingMessage(false);
    }
  };

  const handleOpenMessageDialog = async () => {
    if (!user || (profile?.role !== 'EMPLOYER' && profile?.role !== 'RECRUITER')) {
      setShowMessageDialog(true);
      return;
    }
    
    // Fetch employer/recruiter jobs
    try {
      let jobs: any[] = [];
      
      if (profile.role === 'RECRUITER' && profile.companyId) {
        // Fetch company jobs for recruiters (their jobs + owner's jobs)
        const { data, error } = await getCompanyJobs(profile.companyId, user.uid, profile.isCompanyOwner || false);
        if (!error && data) {
          jobs = data;
        }
      } else {
        // Fetch employer's own jobs
        const { data, error } = await getEmployerJobs(user.uid);
        if (!error && data) {
          jobs = data;
        }
      }
      
      setEmployerJobs(jobs);
      if (jobs.length > 0) {
        setSelectedJobId(jobs[0].id); // Select first job by default
      }
    } catch (err) {
      console.error('Error fetching jobs:', err);
    }
    
    setShowMessageDialog(true);
  };

  const handleSaveCandidate = async () => {
    if (!user || (profile?.role !== 'EMPLOYER' && profile?.role !== 'RECRUITER') || !candidate) return;

    setIsSaving(true);
    try {
      const { error, saved } = await saveCandidate(user.uid, candidate.id);
      
      if (error) {
        console.error('Error saving candidate:', error);
        return;
      }

      setIsSaved(saved);
    } catch (err) {
      console.error('Error in handleSaveCandidate:', err);
    } finally {
      setIsSaving(false);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  if (error) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link 
            href="/search/candidates" 
            className="text-navy-800 hover:text-navy-600 underline"
          >
            Back to candidate search
          </Link>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  const candidateName = `${candidate.firstName || 'First'} ${candidate.lastName || 'Last'}`;

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      {/* Sticky Action Bar */}
      {user?.uid !== candidate.id && (
        <div className={`fixed top-20 left-0 right-0 bg-white/95 backdrop-blur-sm border-b border-slate-200 z-30 transition-all duration-200 mobile-safe-top ${stickyBarVisible ? 'translate-y-0 opacity-100' : '-translate-y-full opacity-0'}`}>
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 py-4">
              <div className="flex items-center gap-4 min-w-0 flex-1">
                {candidate.profileImageUrl ? (
                  <img src={candidate.profileImageUrl} alt={candidateName} className="w-10 h-10 rounded-full object-cover flex-shrink-0" />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-sky-200 to-sky-300 flex items-center justify-center flex-shrink-0">
                    <span className="font-bold text-navy-900 text-sm">{getInitials(candidate.firstName, candidate.lastName)}</span>
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <h3 className="font-bold text-navy-900 text-base truncate">{candidateName}</h3>
                  <p className="text-sm text-slate-600 truncate">{candidate.headline || 'Job Seeker'}</p>
                </div>
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <button
                  onClick={handleOpenMessageDialog}
                  className="bg-navy-800 text-white px-4 sm:px-6 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center justify-center gap-2 text-sm sm:text-base flex-1 sm:flex-initial min-h-[48px]"
                >
                  <MessageSquare className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>Message</span>
                </button>
                <button
                  onClick={handleSaveCandidate}
                  disabled={isSaving}
                  className={`p-2.5 sm:p-3 rounded-lg transition-all w-12 h-12 sm:w-10 sm:h-10 flex items-center justify-center min-h-[48px] sm:min-h-0 ${
                    isSaved 
                      ? 'bg-green-50 text-green-600 border-2 border-green-600' 
                      : 'bg-white border border-slate-200 text-slate-700 hover:border-navy-800 hover:text-navy-900'
                  }`}
                >
                  <Heart className={`h-5 w-5 sm:h-4 sm:w-4 ${isSaved ? 'fill-current' : ''}`} />
                </button>
                {candidate.resumeUrl && (
                  <button
                    onClick={() => {
                      setShowResumeModal(true);
                      setResumePreviewError(false);
                      setUseGoogleViewer(false);
                    }}
                    className="bg-white border border-slate-200 text-navy-900 px-4 py-2.5 sm:py-3 rounded-lg font-semibold hover:bg-slate-50 transition-all flex items-center justify-center gap-2 text-sm sm:text-base min-h-[48px]"
                  >
                    <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span className="hidden sm:inline">Resume</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-3 sm:py-4 flex items-center justify-between">
          <Link
            href={user?.uid === candidate.id ? "/home/seeker" : "/search/candidates"}
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[48px]"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform" />
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Back to Dashboard</span>
            <span className="font-medium text-sm sm:text-base sm:hidden">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="white"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">HireMe</span>
          </Link>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 py-6 sm:py-8 lg:py-10 xl:py-12">

        {/* Hero Summary Card */}
        <section ref={heroCardRef} className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
          <div className="flex flex-col lg:flex-row lg:items-start lg:justify-between gap-4 sm:gap-6">
            <div className="flex items-start space-x-3 sm:space-x-4 md:space-x-6 w-full lg:w-auto">
              {candidate.profileImageUrl ? (
                <img src={candidate.profileImageUrl} alt={candidateName} className="w-20 h-20 rounded-full object-cover flex-shrink-0 border-4 border-white shadow-lg" />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-br from-sky-200 to-sky-300 flex items-center justify-center flex-shrink-0 border-4 border-white shadow-lg">
                  <span className="font-bold text-navy-900 text-2xl">{getInitials(candidate.firstName, candidate.lastName)}</span>
                </div>
              )}
              <div className="flex-1 min-w-0">
                <h1 className="text-3xl sm:text-4xl font-bold text-navy-900 tracking-tight mb-2 break-words">{candidateName}</h1>
                <p className="text-xl text-slate-600 mb-4 break-words">{candidate.headline || 'Job Seeker'}</p>
                {candidate.bio && (
                  <p className="text-slate-600 mb-4 leading-relaxed break-words">{candidate.bio}</p>
                )}
                <div className="flex flex-wrap items-center gap-4 text-sm text-slate-600">
                  {candidate.school && (
                    <div className="flex items-center gap-2">
                      <GraduationCap className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="break-words">{candidate.school}{candidate.major ? ` • ${candidate.major}` : ''}</span>
                    </div>
                  )}
                  {candidate.location && (
                    <div className="flex items-center gap-2">
                      <MapPin className="h-4 w-4 text-slate-400 flex-shrink-0" />
                      <span className="break-words">{candidate.location}</span>
                    </div>
                  )}
                  <div className="flex items-center gap-2">
                    <Code className="h-4 w-4 text-slate-400 flex-shrink-0" />
                    <span>{candidate.skills?.length || 0} skills</span>
                  </div>
                </div>
              </div>
            </div>
            {user?.uid !== candidate.id && (
              <div className="flex flex-col gap-2 sm:gap-3 lg:flex-shrink-0 w-full lg:w-auto">
                <button
                  onClick={handleOpenMessageDialog}
                  className="bg-navy-800 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Message {candidate.firstName || 'Candidate'}</span>
                </button>
                <button
                  onClick={handleSaveCandidate}
                  disabled={isSaving}
                  className={`bg-white border border-slate-200 text-navy-900 px-8 py-4 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 ${
                    isSaved ? 'text-green-600 border-green-600 bg-green-50' : ''
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                  <span>Save Candidate</span>
                </button>
                {candidate.resumeUrl && (
                  <button
                    onClick={() => {
                      setShowResumeModal(true);
                      setResumePreviewError(false);
                      setUseGoogleViewer(false);
                    }}
                    className="bg-white border border-slate-200 text-navy-900 px-8 py-4 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                  >
                    <FileText className="h-5 w-5" />
                    <span>View Resume</span>
                  </button>
                )}
              </div>
            )}
          </div>
        </section>

        {/* Video Section */}
        {candidate.videoUrl && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Video className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Profile Video</h2>
            </div>
            <div className="aspect-video rounded-lg overflow-hidden">
              <video 
                src={candidate.videoUrl} 
                controls 
                className="w-full h-full"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </section>
        )}

        {/* Education Card */}
        {(candidate.education && candidate.education.length > 0) || candidate.graduationYear || candidate.gpa ? (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <GraduationCap className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Education</h2>
            </div>
            <div className="space-y-6">
              {candidate.education && candidate.education.length > 0 ? (
                candidate.education.map((edu: any, index: number) => (
                  <div key={index} className="timeline-item">
                    <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                      <div>
                        <h3 className="font-bold text-navy-900 text-lg">
                          {edu.degree}{edu.majors?.length > 0 ? ` in ${edu.majors.join(', ')}` : ''}
                        </h3>
                        {edu.majors?.length > 0 && <p className="text-slate-600">{edu.majors.join(', ')}</p>}
                        {edu.school && <p className="text-slate-600 text-sm">{edu.school}</p>}
                        {edu.minors?.length > 0 && <p className="text-slate-600 text-sm">Minor: {edu.minors.join(', ')}</p>}
                        {edu.gpa && <p className="text-slate-600 text-sm">GPA: {edu.gpa}</p>}
                      </div>
                      {edu.graduationYear && (
                        <div className="text-sm text-slate-500 font-medium">{edu.graduationYear}</div>
                      )}
                    </div>
                  </div>
                ))
              ) : (
                <div className="timeline-item">
                  <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2">
                    <div>
                      {candidate.graduationYear && <h3 className="font-bold text-navy-900 text-lg">Graduation: {candidate.graduationYear}</h3>}
                      {candidate.gpa && <p className="text-slate-600">GPA: {candidate.gpa}</p>}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </section>
        ) : null}

        {/* Resume Card */}
        {candidate.resumeUrl && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <FileText className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Resume</h2>
            </div>
            <div className="flex items-center justify-between p-6 bg-sky-50 rounded-xl border border-sky-100">
              <div className="flex items-center gap-4">
                <FileText className="h-8 w-8 text-navy-700" />
                <div>
                  <p className="font-semibold text-navy-900">Resume available</p>
                  <p className="text-sm text-slate-600">Click to view or download</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowResumeModal(true);
                  setResumePreviewError(false);
                  setUseGoogleViewer(false);
                }}
                className="bg-navy-800 text-white px-6 py-3 rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center gap-2"
              >
                <FileText className="h-5 w-5" />
                <span>View Resume</span>
              </button>
            </div>
          </section>
        )}

        {/* Professional Links Card */}
        {(candidate.linkedinUrl || candidate.portfolioUrl) && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Globe className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Professional Links</h2>
            </div>
            <div className="space-y-4">
              {candidate.linkedinUrl && (
                <a
                  href={candidate.linkedinUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-sky-50 rounded-xl border border-sky-100 hover:bg-sky-100 transition-all"
                >
                  <i className="fa-brands fa-linkedin text-2xl text-[#0077B5]"></i>
                  <div>
                    <p className="font-semibold text-navy-900">LinkedIn Profile</p>
                    <p className="text-sm text-slate-600">{candidate.linkedinUrl}</p>
                  </div>
                </a>
              )}
              {candidate.portfolioUrl && (
                <a
                  href={candidate.portfolioUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-4 p-4 bg-sky-50 rounded-xl border border-sky-100 hover:bg-sky-100 transition-all"
                >
                  <Globe className="h-6 w-6 text-navy-700" />
                  <div>
                    <p className="font-semibold text-navy-900">Portfolio</p>
                    <p className="text-sm text-slate-600">{candidate.portfolioUrl}</p>
                  </div>
                </a>
              )}
            </div>
          </section>
        )}

        {/* Skills Card */}
        {candidate.skills && candidate.skills.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Code className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Skills</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.skills.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Work Preferences Card */}
        {candidate.workPreferences && candidate.workPreferences.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Briefcase className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Work Preferences</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.workPreferences.map((pref: string, index: number) => (
                <span
                  key={index}
                  className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {pref}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Preferred Job Types Card */}
        {candidate.jobTypes && candidate.jobTypes.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <UserCircle className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Preferred Job Types</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.jobTypes.map((type: string, index: number) => (
                <span
                  key={index}
                  className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {type}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Relevant Experience Card */}
        {candidate.experience && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Star className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Relevant Experience</h2>
            </div>
            <div className={`text-slate-600 leading-relaxed ${experienceExpanded ? 'expanded' : ''}`} style={{maxHeight: experienceExpanded ? '50rem' : '8rem', overflow: 'hidden', transition: 'max-height 0.22s ease'}}>
              <p className="whitespace-pre-wrap">{candidate.experience}</p>
            </div>
            <button
              onClick={() => setExperienceExpanded(!experienceExpanded)}
              className="mt-4 text-navy-900 font-semibold hover:text-navy-700 transition-colors flex items-center gap-2"
            >
              <span>{experienceExpanded ? 'Read less' : 'Read more'}</span>
              {experienceExpanded ? (
                <ArrowLeft className="h-4 w-4 rotate-90" />
              ) : (
                <ArrowLeft className="h-4 w-4 -rotate-90" />
              )}
            </button>
          </section>
        )}

        {/* Preferred Work Locations Card */}
        {candidate.locations && candidate.locations.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <MapPin className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Preferred Work Locations</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.locations.map((location: string, index: number) => (
                <span
                  key={index}
                  className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium flex items-center gap-2"
                >
                  <MapPin className="h-3 w-3" />
                  <span>{location}</span>
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Extracurricular Activities Card */}
        {candidate.extracurriculars && candidate.extracurriculars.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Star className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Extracurricular Activities</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.extracurriculars.map((activity: string, index: number) => (
                <span
                  key={index}
                  className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {activity}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Certifications Card */}
        {candidate.certifications && candidate.certifications.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Award className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Certifications</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.certifications.map((cert: string, index: number) => (
                <span
                  key={index}
                  className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {cert}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Languages Card */}
        {candidate.languages && candidate.languages.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Globe className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Languages</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.languages.map((language: string, index: number) => (
                <span
                  key={index}
                  className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {language}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Career Interests Card */}
        {candidate.careerInterests && candidate.careerInterests.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Briefcase className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Career Interests</h2>
            </div>
            <div className="flex flex-wrap gap-3">
              {candidate.careerInterests.map((interest: string, index: number) => (
                <span
                  key={index}
                  className="bg-sky-50 border border-sky-200 text-navy-900 px-4 py-2 rounded-full text-sm font-medium"
                >
                  {interest}
                </span>
              ))}
            </div>
          </section>
        )}

        {/* Work Authorization Card */}
        {candidate.workAuthorization && (candidate.workAuthorization.authorizedToWork !== null || candidate.workAuthorization.requiresVisaSponsorship !== null) && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Globe className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Work Authorization</h2>
            </div>
            <div className="space-y-3">
              {candidate.workAuthorization.authorizedToWork !== null && (
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${candidate.workAuthorization.authorizedToWork ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  <span className="text-slate-600">
                    <strong className="text-navy-900">Authorized to work in the US:</strong> {candidate.workAuthorization.authorizedToWork ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
              {candidate.workAuthorization.requiresVisaSponsorship !== null && (
                <div className="flex items-center gap-3">
                  <div className={`w-2 h-2 rounded-full ${!candidate.workAuthorization.requiresVisaSponsorship ? 'bg-green-500' : 'bg-orange-500'}`}></div>
                  <span className="text-slate-600">
                    <strong className="text-navy-900">Requires visa sponsorship:</strong> {candidate.workAuthorization.requiresVisaSponsorship ? 'Yes' : 'No'}
                  </span>
                </div>
              )}
            </div>
          </section>
        )}

        {/* Endorsements Card */}
        {endorsements && endorsements.length > 0 && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex items-center mb-6">
              <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
                <Star className="h-6 w-6 text-navy-700" />
              </div>
              <h2 className="text-xl font-bold text-navy-900">Endorsements</h2>
            </div>
            <div className="space-y-6">
              {endorsements.map((endorsement: any, index: number) => (
                <div key={index} className="bg-sky-50 rounded-xl p-6 border border-sky-100">
                  <div className="flex items-start space-x-4">
                    {endorsement.endorserProfileImage ? (
                      <img 
                        src={endorsement.endorserProfileImage} 
                        alt={endorsement.endorserName} 
                        className="w-12 h-12 rounded-full object-cover flex-shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-gradient-to-br from-light-blue to-blue-300 flex items-center justify-center flex-shrink-0">
                        <span className="font-bold text-navy-800 text-sm">
                          {endorsement.endorserName?.charAt(0) || 'E'}
                        </span>
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex items-center justify-between mb-3">
                        <div>
                          {endorsement.endorserLinkedIn ? (
                            <a 
                              href={endorsement.endorserLinkedIn}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="font-bold text-navy-900 hover:text-navy-700 transition-colors flex items-center gap-2"
                            >
                              <span>{endorsement.endorserName || 'Anonymous'}</span>
                              <i className="fa-brands fa-linkedin text-[#0077B5] text-lg"></i>
                            </a>
                          ) : (
                            <h3 className="font-bold text-navy-900">{endorsement.endorserName || 'Anonymous'}</h3>
                          )}
                          {endorsement.endorserTitle && (
                            <p className="text-sm text-slate-600 font-medium">{endorsement.endorserTitle}</p>
                          )}
                          {endorsement.endorserCompany && (
                            <p className="text-sm text-slate-600">{endorsement.endorserCompany}</p>
                          )}
                        </div>
                        {endorsement.createdAt && (
                          <span className="text-sm text-slate-500">
                            {new Date(endorsement.createdAt.seconds * 1000).toLocaleDateString()}
                          </span>
                        )}
                      </div>
                      {endorsement.skill && (
                        <div className="mb-3">
                          <span className="inline-block px-3 py-1 bg-sky-100 text-navy-900 rounded-full text-sm font-medium">
                            <i className="fa-solid fa-star text-yellow-500 mr-1"></i>
                            {endorsement.skill}
                          </span>
                        </div>
                      )}
                      {endorsement.message && (
                        <p className="text-slate-600 leading-relaxed italic border-l-4 border-sky-200 pl-4">
                          "{endorsement.message}"
                        </p>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </section>
        )}

        {/* Get in Touch Card */}
        {user?.uid !== candidate.id && (
          <section className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 mb-8">
            <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-6">
              <div>
                <h2 className="text-2xl font-bold text-navy-900 mb-2">Get in Touch</h2>
                <p className="text-slate-600">Ready to connect? Send {candidate.firstName || 'this candidate'} a message to start the conversation.</p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3">
                <button
                  onClick={handleOpenMessageDialog}
                  className="bg-navy-800 text-white px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-all flex items-center justify-center gap-2"
                >
                  <MessageSquare className="h-5 w-5" />
                  <span>Message {candidate.firstName || 'Candidate'}</span>
                </button>
                <button
                  onClick={handleSaveCandidate}
                  disabled={isSaving}
                  className={`bg-white border border-slate-200 text-navy-900 px-8 py-4 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2 ${
                    isSaved ? 'text-green-600 border-green-600 bg-green-50' : ''
                  }`}
                >
                  <Heart className={`h-5 w-5 ${isSaved ? 'fill-current' : ''}`} />
                  <span>Save Candidate</span>
                </button>
                <button
                  onClick={handleCopyLink}
                  className="bg-white border border-slate-200 text-navy-900 px-8 py-4 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center justify-center gap-2"
                >
                  {copyLinkSuccess ? <Check className="h-5 w-5" /> : <Copy className="h-5 w-5" />}
                  <span className="hidden sm:inline">Copy profile link</span>
                </button>
              </div>
            </div>
          </section>
        )}
      </div>

      {/* Message Compose Dialog */}
      {showMessageDialog && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 w-full max-w-md">
            <h3 className="text-xl font-bold text-navy-900 mb-6">Send Message to {candidate?.firstName || 'Candidate'}</h3>
            
            <textarea
              value={messageContent}
              onChange={(e) => setMessageContent(e.target.value)}
              placeholder="Type your message here..."
              className="w-full p-4 border border-slate-200 rounded-lg mb-4 h-32 resize-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400"
              disabled={isSendingMessage}
            />
            
            {(profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && (
              <div className="mb-6">
                <label htmlFor="jobSelect" className="block text-sm font-medium text-navy-900 mb-2">
                  Select Job Position:
                </label>
                <select
                  id="jobSelect"
                  value={selectedJobId || ''}
                  onChange={(e) => setSelectedJobId(e.target.value || null)}
                  className="w-full p-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900"
                  disabled={isSendingMessage}
                >
                  <option value="">Select a job</option>
                  {employerJobs.map((job) => (
                    <option key={job.id} value={job.id}>
                      {job.title}
                    </option>
                  ))}
                </select>
              </div>
            )}

            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowMessageDialog(false);
                  setMessageContent('');
                  setSelectedJobId('');
                }}
                className="px-6 py-2.5 text-slate-600 hover:text-navy-900 transition-colors font-medium"
                disabled={isSendingMessage}
              >
                Cancel
              </button>
              <button
                onClick={handleSendMessage}
                disabled={!messageContent.trim() || isSendingMessage}
                className="px-6 py-2.5 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center gap-2"
              >
                {isSendingMessage ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Send className="h-4 w-4" />
                )}
                Send Message
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Resume Modal */}
      {showResumeModal && candidate.resumeUrl && (
        <div className="fixed inset-0 bg-black/75 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 w-full max-w-5xl h-[90vh] flex flex-col">
            {/* Modal Header */}
            <div className="flex items-center justify-between p-6 border-b border-slate-200">
              <h3 className="text-xl font-bold text-navy-900">
                {candidate.firstName}'s Resume
              </h3>
              <div className="flex items-center gap-3">
                <a
                  href={candidate.resumeUrl}
                  download
                  className="px-4 py-2 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center gap-2 text-sm"
                >
                  <Download className="h-4 w-4" />
                  Download Resume
                </a>
                <button
                  onClick={() => {
                    setShowResumeModal(false);
                    setResumePreviewError(false);
                    setUseGoogleViewer(false);
                  }}
                  className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-slate-600" />
                </button>
              </div>
            </div>

            {/* Modal Body - Resume Preview */}
            <div className="flex-1 overflow-hidden p-4 bg-slate-50">
              {!resumePreviewError ? (
                <iframe
                  src={useGoogleViewer ? `https://docs.google.com/viewer?url=${encodeURIComponent(candidate.resumeUrl)}&embedded=true` : candidate.resumeUrl}
                  className="w-full h-full border-0 rounded-lg bg-white"
                  title="Resume Preview"
                  frameBorder="0"
                  allowFullScreen
                  onError={() => {
                    if (!useGoogleViewer) {
                      // Try Google Docs viewer as fallback
                      setUseGoogleViewer(true);
                    } else {
                      // Both methods failed
                      setResumePreviewError(true);
                    }
                  }}
                  onLoad={(e) => {
                    // Check if iframe loaded successfully
                    const iframe = e.target as HTMLIFrameElement;
                    setTimeout(() => {
                      try {
                        // If we can't access the iframe content, it might have failed to load
                        if (!iframe.contentDocument || iframe.contentDocument.body.children.length === 0) {
                          if (!useGoogleViewer) {
                            // Try Google Docs viewer as fallback
                            setUseGoogleViewer(true);
                          } else {
                            // Both methods failed
                            setResumePreviewError(true);
                          }
                        }
                      } catch (error) {
                        // Cross-origin restrictions might prevent access, but that's okay
                        // The iframe might still be working
                      }
                    }, 2000); // Wait 2 seconds before checking
                  }}
                />
              ) : (
                <div className="w-full h-full flex flex-col items-center justify-center bg-white rounded-lg border-2 border-dashed border-slate-200">
                  <FileText className="h-16 w-16 text-slate-400 mb-4" />
                  <h3 className="text-lg font-semibold text-navy-900 mb-2">Resume Preview Unavailable</h3>
                  <p className="text-sm text-slate-600 mb-6 text-center max-w-md">
                    The resume preview couldn't be loaded. This is common in development environments (localhost) due to browser security restrictions. Use the options below to view the resume.
                  </p>
                  <div className="flex gap-3">
                    <a
                      href={candidate.resumeUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="px-6 py-3 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 transition-all flex items-center gap-2"
                    >
                      <FileText className="h-4 w-4" />
                      Open in New Tab
                    </a>
                    <a
                      href={candidate.resumeUrl}
                      download
                      className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-all flex items-center gap-2"
                    >
                      <Download className="h-4 w-4" />
                      Download Resume
                    </a>
                  </div>
                  <button
                    onClick={() => {
                      setResumePreviewError(false);
                      setUseGoogleViewer(false);
                    }}
                    className="mt-3 text-sm text-blue-600 hover:text-blue-800 underline"
                  >
                    Try Preview Again
                  </button>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="p-4 border-t bg-gray-50">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-600">
                  💡 Tip: Use scroll to navigate through the resume
                </p>
                <button
                  onClick={() => {
                    setShowResumeModal(false);
                    setResumePreviewError(false);
                    setUseGoogleViewer(false);
                  }}
                  className="px-6 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}