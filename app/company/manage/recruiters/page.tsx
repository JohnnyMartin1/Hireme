"use client";
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { 
  inviteRecruiter, 
  getCompanyInvitations, 
  getCompanyRecruiters, 
  cancelInvitation,
  deleteDocument 
} from '@/lib/firebase-firestore';
import { ArrowLeft, UserPlus, Mail, Trash2, Clock } from 'lucide-react';
import Link from 'next/link';

export default function ManageRecruitersPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [recruiters, setRecruiters] = useState<any[]>([]);
  const [invitations, setInvitations] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }

    if (profile && !profile.isCompanyOwner) {
      router.push('/home/employer');
      return;
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    const loadData = async () => {
      if (!user || !profile?.companyId) return;

      setIsLoading(true);
      try {
        // Fetch recruiters
        const { data: recruitersData } = await getCompanyRecruiters(profile.companyId);
        // Filter out deleted accounts (those missing email or firstName)
        const validRecruiters = (recruitersData || []).filter(
          (r: any) => r.email && r.firstName
        );
        setRecruiters(validRecruiters);

        // Fetch invitations (only pending ones)
        const { data: invitationsData } = await getCompanyInvitations(profile.companyId);
        setInvitations(invitationsData || []);
      } catch (err) {
        console.error('Error loading data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    loadData();
  }, [user, profile]);

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !profile?.companyId) return;

    setError(null);
    setSuccess(null);
    setInviting(true);

    try {
      const { id, error: inviteError } = await inviteRecruiter(
        profile.companyId,
        email,
        user.uid
      );

      if (inviteError) {
        setError(inviteError);
        return;
      }

      setSuccess(`Invitation sent to ${email}`);
      setEmail('');

      // Reload invitations (only pending ones)
      const { data: invitationsData } = await getCompanyInvitations(profile.companyId);
      setInvitations(invitationsData || []);
      
      // Also reload recruiters in case invitation was accepted during this time
      const { data: recruitersData } = await getCompanyRecruiters(profile.companyId);
      const validRecruiters = (recruitersData || []).filter(
        (r: any) => r.email && r.firstName
      );
      setRecruiters(validRecruiters);
    } catch (err: any) {
      setError('Failed to send invitation');
      console.error('Invitation error:', err);
    } finally {
      setInviting(false);
    }
  };

  const handleCancelInvitation = async (invitationId: string) => {
    if (!profile?.companyId) return;

    try {
      await cancelInvitation(invitationId);
      
      // Reload invitations (only pending ones)
      const { data: invitationsData } = await getCompanyInvitations(profile.companyId);
      setInvitations(invitationsData || []);
      
      // Also reload recruiters to ensure list is current
      const { data: recruitersData } = await getCompanyRecruiters(profile.companyId);
      const validRecruiters = (recruitersData || []).filter(
        (r: any) => r.email && r.firstName
      );
      setRecruiters(validRecruiters);
      
      setSuccess('Invitation cancelled');
    } catch (err) {
      setError('Failed to cancel invitation');
      console.error('Cancel error:', err);
    }
  };

  const handleRemoveRecruiter = async (recruiterId: string, recruiterName: string) => {
    if (!profile?.companyId) return;
    
    if (!confirm(`Are you sure you want to remove ${recruiterName}? This will delete their account from the system.`)) {
      return;
    }

    try {
      const { error: deleteError } = await deleteDocument('users', recruiterId);
      
      if (deleteError) {
        setError('Failed to remove recruiter');
        return;
      }
      
      // Reload recruiters list
      const { data: recruitersData } = await getCompanyRecruiters(profile.companyId);
      const validRecruiters = (recruitersData || []).filter(
        (r: any) => r.email && r.firstName
      );
      setRecruiters(validRecruiters);
      
      setSuccess(`${recruiterName} has been removed`);
    } catch (err) {
      setError('Failed to remove recruiter');
      console.error('Remove error:', err);
    }
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile?.isCompanyOwner) {
    return null;
  }

  return (
    <main className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/home/employer"
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-200" />
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

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pb-6 sm:pb-8 lg:pb-10 min-w-0">
        {/* Page Title */}
        <div className="mb-8 lg:mb-12">
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-4 tracking-tight">Manage Recruiters</h1>
          <p className="text-lg sm:text-xl text-slate-600 max-w-3xl leading-relaxed">Invite and manage recruiters for your company</p>
        </div>

        {/* Invite Section */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 lg:p-10 mb-6 lg:mb-8">
          <div className="flex items-center mb-6">
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
              <UserPlus className="h-6 w-6 text-navy-700" />
            </div>
            <h2 className="text-xl font-bold text-navy-900">Invite Recruiter</h2>
          </div>
          
          <form onSubmit={handleInvite} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-2">
                Email Address
              </label>
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400 transition-all"
                placeholder="recruiter@company.com"
              />
              <p className="text-xs text-slate-500 mt-2 leading-relaxed">
                They'll receive an email with instructions to join your company
              </p>
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
                <p className="text-sm text-red-600">{error}</p>
              </div>
            )}

            {success && (
              <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                <p className="text-sm text-green-600">{success}</p>
              </div>
            )}

            <button
              type="submit"
              disabled={inviting}
              className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 hover:shadow-lg disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center"
            >
              <Mail className="h-5 w-5 mr-2" />
              {inviting ? 'Sending Invitation...' : 'Send Invitation'}
            </button>
          </form>
        </div>

        {/* Active Recruiters */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 lg:p-10 mb-6 lg:mb-8">
          <h2 className="text-xl font-bold text-navy-900 mb-6">Active Recruiters</h2>
          
          {recruiters.length === 0 ? (
            <div className="text-center py-12">
              <div className="w-16 h-16 bg-sky-100 rounded-lg flex items-center justify-center mx-auto mb-4">
                <UserPlus className="h-8 w-8 text-navy-700" />
              </div>
              <p className="text-lg font-medium text-navy-900 mb-2">No recruiters yet</p>
              <p className="text-slate-600 leading-relaxed">Invite recruiters to help manage your hiring</p>
            </div>
          ) : (
            <div className="space-y-3">
              {recruiters.map((recruiter) => (
                <Link
                  href={`/company/recruiter/${recruiter.id}`}
                  key={recruiter.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-sky-50 hover:shadow-md transition-all border border-transparent hover:border-sky-100 group"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <span className="text-navy-700 font-semibold text-lg">
                        {recruiter.firstName?.[0]}{recruiter.lastName?.[0]}
                      </span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy-900 group-hover:text-navy-700 transition-colors truncate">
                        {recruiter.firstName} {recruiter.lastName}
                      </p>
                      <p className="text-sm text-slate-600 truncate">{recruiter.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 flex-shrink-0">
                    <span className="px-3 py-1 bg-green-100 text-green-800 text-xs font-semibold rounded-full">
                      Active
                    </span>
                    <button
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        handleRemoveRecruiter(recruiter.id, `${recruiter.firstName} ${recruiter.lastName}`);
                      }}
                      className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all"
                      title="Remove recruiter"
                    >
                      <Trash2 className="h-5 w-5" />
                    </button>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </div>

        {/* Pending Invitations */}
        {invitations.length > 0 && (
          <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sm:p-8 lg:p-10">
            <h2 className="text-xl font-bold text-navy-900 mb-6">Pending Invitations</h2>
            
            <div className="space-y-3">
              {invitations.map((invitation) => (
                <div
                  key={invitation.id}
                  className="flex items-center justify-between p-4 bg-slate-50 rounded-lg hover:bg-sky-50 hover:shadow-sm transition-all border border-transparent hover:border-sky-100"
                >
                  <div className="flex items-center flex-1 min-w-0">
                    <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4 flex-shrink-0">
                      <Mail className="h-6 w-6 text-navy-700" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold text-navy-900 truncate">{invitation.invitedEmail}</p>
                      <p className="text-sm text-slate-600 flex items-center mt-1">
                        <Clock className="h-4 w-4 mr-1.5" />
                        Pending
                      </p>
                    </div>
                  </div>
                  
                  <button
                    onClick={() => handleCancelInvitation(invitation.id)}
                    className="text-red-600 hover:text-red-700 hover:bg-red-50 p-2 rounded-lg transition-all flex-shrink-0"
                    title="Cancel invitation"
                  >
                    <Trash2 className="h-5 w-5" />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
