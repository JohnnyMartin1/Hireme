"use client";
import { useParams } from 'next/navigation';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { User, MapPin, GraduationCap, Star, MessageSquare, Heart, Loader2, ArrowLeft, Send, Video } from "lucide-react";
import { getDocument, getOrCreateThread, sendMessage, saveCandidate, isCandidateSaved } from '@/lib/firebase-firestore';
import Link from 'next/link';
import { trackProfileView } from '@/lib/firebase-firestore';
import { getEmployerJobs } from '@/lib/firebase-firestore';

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
  email: string;
  createdAt?: any;
  profileImageUrl?: string;
  resumeUrl?: string;
  videoUrl?: string;
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

        setCandidate(data);

        // Track profile view if user is logged in and viewing someone else's profile
        if (user && user.uid !== params.id) {
          await trackProfileView(params.id as string, user.uid);
        }

        // Check if candidate is saved (for employers only)
        if (user && profile?.role === 'EMPLOYER') {
          const { saved } = await isCandidateSaved(user.uid, params.id as string);
          setIsSaved(saved);
        }

      } catch (err) {
        console.error('Error fetching candidate profile:', err);
        setError('Failed to load candidate profile');
      } finally {
        setIsLoading(false);
      }
    };

    fetchCandidateProfile();
  }, [params.id, user]);

  const handleSendMessage = async () => {
    if (!user || !profile || !candidate || !messageContent.trim()) return;

    // For employers, require job selection
    if (profile.role === 'EMPLOYER' && !selectedJobId) {
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

      // Get job details if employer
      let jobDetails = null;
      if (profile.role === 'EMPLOYER' && selectedJobId) {
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

      const messageData = {
        senderId: user.uid,
        senderName: `${profile.firstName || ''} ${profile.lastName || ''}`.trim() || 'Employer',
        content: messageContent.trim(),
        jobDetails: jobDetails
      };

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
    if (!user || profile?.role !== 'EMPLOYER') {
      setShowMessageDialog(true);
      return;
    }
    
    // Fetch employer jobs
    try {
      const { data: jobs, error } = await getEmployerJobs(user.uid);
      if (!error && jobs) {
        setEmployerJobs(jobs);
        if (jobs.length > 0) {
          setSelectedJobId(jobs[0].id); // Select first job by default
        }
      }
    } catch (err) {
      console.error('Error fetching employer jobs:', err);
    }
    
    setShowMessageDialog(true);
  };

  const handleSaveCandidate = async () => {
    if (!user || profile?.role !== 'EMPLOYER' || !candidate) return;

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
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading candidate profile...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">{error}</p>
          <Link 
            href="/search/candidates" 
            className="text-blue-600 hover:text-blue-800 underline"
          >
            Back to candidate search
          </Link>
        </div>
      </div>
    );
  }

  if (!candidate) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6">
        {/* Back Button */}
        <div className="mb-6">
          <Link 
            href="/search/candidates"
            className="inline-flex items-center text-blue-600 hover:text-blue-800 transition-colors"
          >
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to candidate search
          </Link>
        </div>

        {/* Header */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-8">
          <div className="flex items-start justify-between mb-6">
            <div className="flex items-center gap-4">
              {candidate.profileImageUrl ? (
                <img 
                  src={candidate.profileImageUrl} 
                  alt={`${candidate.firstName || 'Candidate'} profile`}
                  className="w-20 h-20 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-10 w-10 text-blue-600" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-gray-900">
                  {candidate.firstName || 'First'} {candidate.lastName || 'Last'}
                </h1>
                <p className="text-xl text-gray-600">{candidate.headline || 'Job Seeker'}</p>
              </div>
            </div>
            
            <div className="flex gap-3">
              <button 
                onClick={handleSaveCandidate}
                disabled={isSaving}
                className={`px-4 py-2 border rounded-lg transition-colors flex items-center ${
                  isSaved 
                    ? 'border-red-600 text-red-600 hover:bg-red-50' 
                    : 'border-blue-600 text-blue-600 hover:bg-blue-50'
                } ${isSaving ? 'opacity-50 cursor-not-allowed' : ''}`}
              >
                {isSaving ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Heart className={`h-4 w-4 mr-2 ${isSaved ? 'fill-current' : ''}`} />
                )}
                {isSaved ? 'Saved' : 'Save'}
              </button>
              <button
                onClick={handleOpenMessageDialog}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <MessageSquare className="h-4 w-4 mr-2" />
                Send Message
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {candidate.school && (
              <div className="flex items-center text-gray-600">
                <GraduationCap className="h-5 w-5 mr-3" />
                <span>
                  {candidate.school}
                  {candidate.major && ` - ${candidate.major}`}
                  {candidate.minor && ` (Minor: ${candidate.minor})`}
                </span>
              </div>
            )}
            {candidate.location && (
              <div className="flex items-center text-gray-600">
                <MapPin className="h-5 w-5 mr-3" />
                <span>{candidate.location}</span>
              </div>
            )}
            <div className="flex items-center text-gray-600">
              <Star className="h-5 w-5 mr-3" />
              <span>{candidate.skills?.length || 0} skills</span>
            </div>
          </div>

          {/* Additional Education Info */}
          {(candidate.graduationYear || candidate.gpa) && (
            <div className="mt-4 pt-4 border-t border-gray-200">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {candidate.graduationYear && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">Graduation Year:</span> {candidate.graduationYear}
                  </div>
                )}
                {candidate.gpa && (
                  <div className="text-sm text-gray-600">
                    <span className="font-medium">GPA:</span> {candidate.gpa}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Skills */}
        {candidate.skills && candidate.skills.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Skills</h2>
            <div className="flex flex-wrap gap-3">
              {candidate.skills.map((skill: string, index: number) => (
                <span
                  key={index}
                  className="px-4 py-2 bg-blue-100 text-blue-800 rounded-full text-sm font-medium"
                >
                  {skill}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Work Preferences */}
        {candidate.workPreferences && candidate.workPreferences.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Work Preferences</h2>
            <div className="flex flex-wrap gap-3">
              {candidate.workPreferences.map((pref: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm"
                >
                  {pref}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Job Types */}
        {candidate.jobTypes && candidate.jobTypes.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Preferred Job Types</h2>
            <div className="flex flex-wrap gap-3">
              {candidate.jobTypes.map((type: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm"
                >
                  {type}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Extracurricular Activities */}
        {candidate.extracurriculars && candidate.extracurriculars.length > 0 && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Extracurricular Activities</h2>
            <div className="flex flex-wrap gap-3">
              {candidate.extracurriculars.map((activity: string, index: number) => (
                <span
                  key={index}
                  className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm"
                >
                  {activity}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Bio */}
        {candidate.bio && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">About</h2>
            <p className="text-gray-700 leading-relaxed">{candidate.bio}</p>
          </div>
        )}

        {/* Resume */}
        {candidate.resumeUrl && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">Resume</h2>
            <div className="border border-gray-200 rounded-lg overflow-hidden bg-gray-50">
              <div className="p-4">
                <iframe
                  src={`https://docs.google.com/viewer?url=${encodeURIComponent(candidate.resumeUrl)}&embedded=true`}
                  className="w-full h-96 border-0"
                  title="Resume Preview"
                  frameBorder="0"
                  allowFullScreen
                  sandbox="allow-same-origin allow-scripts allow-forms allow-popups"
                  style={{ pointerEvents: 'auto' }}
                />
              </div>
            </div>
            <div className="mt-3 flex justify-between items-center">
              <p className="text-sm text-gray-500">
                Use scroll to navigate the resume
              </p>
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    const iframe = document.querySelector('iframe[title="Resume Preview"]') as HTMLIFrameElement;
                    if (iframe && iframe.contentWindow) {
                      iframe.contentWindow.print();
                    }
                  }}
                  className="text-sm text-gray-600 hover:text-gray-800 underline flex items-center"
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Print
                </button>
                <a 
                  href={candidate.resumeUrl} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-sm text-blue-600 hover:text-blue-800 underline flex items-center"
                  onClick={(e) => {
                    e.preventDefault();
                    window.open(candidate.resumeUrl, '_blank', 'noopener,noreferrer');
                  }}
                >
                  <svg className="h-4 w-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                  Open in new tab
                </a>
              </div>
            </div>
          </div>
        )}

        {/* Profile Video */}
        {candidate.videoUrl && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <Video className="h-5 w-5 mr-2 text-orange-600" />
              Profile Video
            </h2>
            <div className="aspect-video rounded-lg overflow-hidden">
              <video 
                src={candidate.videoUrl} 
                controls 
                className="w-full h-full object-cover"
                preload="metadata"
              >
                Your browser does not support the video tag.
              </video>
            </div>
          </div>
        )}

        {/* Contact Actions */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Get in Touch</h2>
          <div className="flex gap-4">
            <button 
              onClick={handleOpenMessageDialog}
              className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center justify-center"
            >
              <MessageSquare className="h-5 w-5 mr-2" />
              Send Message
            </button>
            <button className="flex-1 px-6 py-3 border border-blue-600 text-blue-600 rounded-lg hover:bg-blue-50 transition-colors flex items-center justify-center">
              <Heart className="h-5 w-5 mr-2" />
              Save Candidate
            </button>
          </div>
        </div>

        {/* Message Compose Dialog */}
        {showMessageDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-xl p-6 w-full max-w-md mx-4">
              <h3 className="text-lg font-semibold mb-4">Send Message to {candidate?.firstName || 'Candidate'}</h3>
              
              <textarea
                value={messageContent}
                onChange={(e) => setMessageContent(e.target.value)}
                placeholder="Type your message here..."
                className="w-full p-3 border border-gray-300 rounded-lg mb-4 h-32 resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={isSendingMessage}
              />
              
              {profile.role === 'EMPLOYER' && (
                <div className="mb-4">
                  <label htmlFor="jobSelect" className="block text-sm font-medium text-gray-700 mb-1">
                    Select Job Position:
                  </label>
                  <select
                    id="jobSelect"
                    value={selectedJobId || ''}
                    onChange={(e) => setSelectedJobId(e.target.value || null)}
                    className="w-full p-2 border border-gray-300 rounded-lg"
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
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
                  disabled={isSendingMessage}
                >
                  Cancel
                </button>
                <button
                  onClick={handleSendMessage}
                  disabled={!messageContent.trim() || isSendingMessage}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {isSendingMessage ? (
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                  ) : (
                    <Send className="h-4 w-4 mr-2" />
                  )}
                  Send Message
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}