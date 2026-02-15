"use client";
import { useParams, useRouter } from 'next/navigation';
import { useState, useEffect } from 'react';
import { createEndorsement, getDocument } from '@/lib/firebase-firestore';
import { ArrowLeft, User, Star, MessageSquare } from 'lucide-react';
import Link from 'next/link';

export default function EndorseFormPage() {
  const params = useParams();
  const router = useRouter();
  const userId = params?.userId as string;

  const [endorserName, setEndorserName] = useState('');
  const [endorserEmail, setEndorserEmail] = useState('');
  const [endorserLinkedIn, setEndorserLinkedIn] = useState('');
  const [endorserTitle, setEndorserTitle] = useState('');
  const [endorserCompany, setEndorserCompany] = useState('');
  const [skill, setSkill] = useState('');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [success, setSuccess] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [candidate, setCandidate] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Fetch candidate information
  useEffect(() => {
    const fetchCandidate = async () => {
      if (!userId) return;
      try {
        const { data, error } = await getDocument('users', userId);
        if (error) {
          console.error('Error fetching candidate:', error);
          setError('Candidate not found');
        } else if (data) {
          setCandidate(data);
        }
      } catch (err) {
        console.error('Error fetching candidate:', err);
        setError('Failed to load candidate information');
      } finally {
        setLoading(false);
      }
    };

    fetchCandidate();
  }, [userId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;
    setSubmitting(true);
    setError(null);
    setSuccess(null);
    
    const endorsementData = {
      endorserName,
      endorserEmail,
      endorserLinkedIn,
      endorserTitle,
      endorserCompany,
      skill,
      message
    };

    const { id, error } = await createEndorsement(userId, endorsementData);
    setSubmitting(false);
    if (error) {
      setError('Failed to submit endorsement. Please try again.');
      return;
    }
    setSuccess('Thank you! Your endorsement has been submitted successfully.');
    setEndorserName('');
    setEndorserEmail('');
    setEndorserLinkedIn('');
    setEndorserTitle('');
    setEndorserCompany('');
    setSkill('');
    setMessage('');
  };

  if (!userId) return null;

  if (loading) {
    return (
      <main className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading endorsement form...</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <button
            onClick={() => {
              if (typeof window !== 'undefined' && window.history.length > 1) {
                router.back();
              } else {
                router.push('/');
              }
            }}
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Back</span>
            <span className="font-medium text-sm sm:text-base sm:hidden">Back</span>
          </button>
          <Link href="/" className="shrink-0" aria-label="HireMe home">
            <img src="/logo.svg" alt="HireMe logo" className="h-7 sm:h-8 w-auto" role="img" aria-label="HireMe logo" />
          </Link>
        </div>
      </header>

      <div className="max-w-2xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="flex items-center justify-center mb-4">
            <Star className="h-8 w-8 text-blue-600 mr-2" />
            <h1 className="text-3xl font-bold text-gray-900">Endorse a Candidate</h1>
          </div>
          <p className="text-gray-600 text-lg">Help this candidate showcase their skills and experience</p>
        </div>

        {/* Candidate Information */}
        {candidate && (
          <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
            <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center">
              <User className="h-5 w-5 mr-2 text-blue-600" />
              About the Candidate
            </h2>
            <div className="flex items-center gap-4">
              {candidate.profileImageUrl ? (
                <img 
                  src={candidate.profileImageUrl} 
                  alt={`${candidate.firstName || 'Candidate'} profile`}
                  className="w-16 h-16 rounded-full object-cover border-2 border-gray-200"
                />
              ) : (
                <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                  <User className="h-8 w-8 text-blue-600" />
                </div>
              )}
              <div>
                <h3 className="text-lg font-semibold text-gray-900">
                  {candidate.firstName || 'First'} {candidate.lastName || 'Last'}
                </h3>
                <p className="text-gray-600">{candidate.headline || 'Job Seeker'}</p>
                {candidate.school && (
                  <p className="text-sm text-gray-500">{candidate.school}</p>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Endorsement Form */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-6 flex items-center">
            <MessageSquare className="h-5 w-5 mr-2 text-green-600" />
            Write Your Endorsement
          </h2>

          {success && (
            <div className="mb-6 p-4 bg-green-50 border border-green-200 text-green-700 rounded-lg">
              <div className="flex items-center">
                <Star className="h-5 w-5 mr-2 fill-current" />
                {success}
              </div>
            </div>
          )}

          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 text-red-700 rounded-lg">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Full Name <span className="text-red-500">*</span>
                </label>
                <input 
                  value={endorserName} 
                  onChange={(e)=>setEndorserName(e.target.value)} 
                  required 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="John Smith" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Email <span className="text-red-500">*</span>
                </label>
                <input 
                  value={endorserEmail} 
                  onChange={(e)=>setEndorserEmail(e.target.value)} 
                  type="email" 
                  required 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="john@company.com" 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Your LinkedIn Profile URL <span className="text-red-500">*</span>
              </label>
              <input 
                value={endorserLinkedIn} 
                onChange={(e)=>setEndorserLinkedIn(e.target.value)} 
                type="url" 
                required 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="https://linkedin.com/in/johnsmith" 
              />
              <p className="text-sm text-gray-500 mt-1">
                This helps verify your identity and adds credibility to your endorsement.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Job Title
                </label>
                <input 
                  value={endorserTitle} 
                  onChange={(e)=>setEndorserTitle(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="e.g., Senior Manager, Team Lead" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Your Company
                </label>
                <input 
                  value={endorserCompany} 
                  onChange={(e)=>setEndorserCompany(e.target.value)} 
                  className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                  placeholder="e.g., Google, Microsoft, Startup Inc." 
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Skill or Area of Expertise <span className="text-red-500">*</span>
              </label>
              <input 
                value={skill} 
                onChange={(e)=>setSkill(e.target.value)} 
                required 
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="e.g., Python Programming, Project Management, Leadership" 
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Endorsement Message <span className="text-red-500">*</span>
              </label>
              <textarea 
                value={message} 
                onChange={(e)=>setMessage(e.target.value)} 
                required
                rows={4}
                className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent" 
                placeholder="Share specific examples of how this candidate demonstrated this skill. For example: 'Sarah consistently delivered high-quality code and mentored junior developers on our team. Her problem-solving skills and attention to detail were exceptional.'"
              />
            </div>

            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h4 className="font-medium text-blue-900 mb-2">💡 Tips for a great endorsement:</h4>
              <ul className="text-sm text-blue-800 space-y-1">
                <li>• Be specific about their accomplishments</li>
                <li>• Mention concrete examples or projects</li>
                <li>• Highlight their impact on your team or organization</li>
                <li>• Keep it professional and honest</li>
              </ul>
            </div>

            <div className="bg-green-50 border border-green-200 rounded-lg p-4">
              <h4 className="font-medium text-green-900 mb-2 flex items-center">
                <svg className="h-4 w-4 mr-2" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/>
                </svg>
                LinkedIn Verification
              </h4>
              <p className="text-sm text-green-800">
                Providing your LinkedIn profile helps employers verify your identity and adds credibility to your endorsement. 
                Your LinkedIn profile will be visible to employers viewing this candidate's profile.
              </p>
            </div>

            <button 
              type="submit" 
              disabled={submitting} 
              className="w-full px-6 py-3 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-lg flex items-center justify-center"
            >
              {submitting ? (
                <>
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                  Submitting Endorsement...
                </>
              ) : (
                <>
                  <Star className="h-5 w-5 mr-2" />
                  Submit Endorsement
                </>
              )}
            </button>
          </form>
        </div>

        {/* Footer */}
        <div className="text-center mt-8 text-sm text-gray-500">
          <p>This endorsement will be visible on the candidate's profile and help them in their job search.</p>
          <p className="mt-1">No account required - your endorsement is submitted anonymously.</p>
        </div>
      </div>
    </main>
  );
}


