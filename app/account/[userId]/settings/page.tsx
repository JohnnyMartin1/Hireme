"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function UserSettingsPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const params = useParams();
  const userId = params.userId as string;
  const [activeTab, setActiveTab] = useState('account');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Verify the userId matches the current user
    if (!loading && user && user.uid !== userId) {
      const dashboardRoute = profile?.role === 'JOB_SEEKER' ? '/home/seeker' : '/home/employer';
      router.push(dashboardRoute);
      return;
    }
  }, [user, profile, loading, router, userId]);

  useEffect(() => {
    // Handle URL hash on page load
    const hash = window.location.hash.substring(1);
    if (hash) {
      setActiveTab(hash);
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile || user.uid !== userId) {
    return null;
  }

  const dashboardUrl = profile.role === 'JOB_SEEKER' 
    ? '/home/seeker' 
    : profile.role === 'EMPLOYER' || profile.role === 'RECRUITER'
    ? '/home/employer'
    : '/';

  const toast = (message: string) => {
    setToastMessage(message);
    setShowToast(true);
    setTimeout(() => setShowToast(false), 3000);
  };

  const handleTabClick = (tab: string) => {
    setActiveTab(tab);
    window.history.pushState(null, '', '#' + tab);
  };

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      <style jsx global>{`
        .toggle-switch {
          position: relative;
          width: 48px;
          height: 24px;
          background: #cbd5e1;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .toggle-switch.active {
          background: #0ea5e9;
        }
        
        .toggle-switch::after {
          content: '';
          position: absolute;
          top: 2px;
          left: 2px;
          width: 20px;
          height: 20px;
          background: white;
          border-radius: 50%;
          transition: transform 0.2s;
          box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .toggle-switch.active::after {
          transform: translateX(24px);
        }
        
        .danger-zone {
          border: 1px solid #DC2626;
          background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%);
        }
      `}</style>

      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href={dashboardUrl}
            className="flex items-center gap-2 text-navy-900 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm hidden sm:inline">Back to Dashboard</span>
            <span className="font-medium text-sm sm:hidden">Back</span>
          </Link>
          <Link href="/" className="shrink-0" aria-label="HireMe home">
            <img src="/logo.svg" alt="HireMe logo" className="h-7 sm:h-8 w-auto" role="img" aria-label="HireMe logo" />
          </Link>
        </div>
      </header>

      {/* Toast Notification */}
      {showToast && (
        <div className={`fixed top-24 right-6 z-50 bg-navy-800 text-white px-4 py-3 rounded-lg shadow-lg flex items-center gap-2 transition-all duration-300 ${showToast ? 'opacity-100 translate-x-0' : 'opacity-0 translate-x-full'}`}>
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          <span>{toastMessage}</span>
        </div>
      )}

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-12 tracking-tight">Settings</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-80 shrink-0">
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 sticky top-24">
              <nav className="space-y-2">
                {(profile.role === 'JOB_SEEKER' ? [
                  { id: 'account', icon: 'user', label: 'Account' },
                  { id: 'information', icon: 'circle-info', label: 'Information' },
                  { id: 'security', icon: 'shield-halved', label: 'Security' },
                  { id: 'notifications', icon: 'bell', label: 'Notifications' },
                  { id: 'legal', icon: 'gavel', label: 'Legal' },
                  { id: 'danger', icon: 'trash', label: 'Delete Account' },
                ] : [
                  { id: 'account', icon: 'user', label: 'Account' },
                  { id: 'information', icon: 'circle-info', label: 'Information' },
                  { id: 'security', icon: 'shield-halved', label: 'Security' },
                  { id: 'privacy', icon: 'eye', label: 'Privacy & Visibility' },
                  { id: 'notifications', icon: 'bell', label: 'Notifications' },
                  { id: 'billing', icon: 'credit-card', label: 'Billing' },
                  { id: 'team', icon: 'users', label: 'Team & Recruiters' },
                  { id: 'company', icon: 'building', label: 'Company Profile' },
                  { id: 'integrations', icon: 'plug', label: 'Integrations' },
                  { id: 'data', icon: 'database', label: 'Data & Export' },
                  { id: 'accessibility', icon: 'universal-access', label: 'Accessibility' },
                  { id: 'legal', icon: 'gavel', label: 'Legal' },
                  { id: 'danger', icon: 'trash', label: 'Delete Account' },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-lg font-semibold transition-all duration-200 ${
                      activeTab === tab.id
                        ? 'bg-navy-800 text-white'
                        : 'bg-white text-navy-900 hover:bg-sky-50 border border-transparent hover:border-sky-100'
                    }`}
                  >
                    <i className={`fa-solid fa-${tab.icon} mr-3`}></i>{tab.label}
                  </button>
                ))}
              </nav>
            </div>
          </aside>

          {/* Content Area */}
          <div className="flex-1">
            {activeTab === 'account' && <AccountSection toast={toast} profile={profile} />}
            {activeTab === 'information' && <InformationSection profile={profile} />}
            {activeTab === 'security' && <SecuritySection toast={toast} profile={profile} />}
            {activeTab === 'privacy' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <PrivacySection toast={toast} />}
            {activeTab === 'notifications' && <NotificationsSection toast={toast} profile={profile} />}
            {activeTab === 'billing' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <BillingSection />}
            {activeTab === 'team' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <TeamSection toast={toast} />}
            {activeTab === 'company' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <CompanySection toast={toast} />}
            {activeTab === 'integrations' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <IntegrationsSection toast={toast} />}
            {activeTab === 'data' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <DataSection />}
            {activeTab === 'accessibility' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <AccessibilitySection toast={toast} />}
            {activeTab === 'legal' && <LegalSection />}
            {activeTab === 'danger' && <DangerSection />}
          </div>
        </div>
      </main>
    </div>
  );
}

// Account Section Component
function AccountSection({ toast, profile }: { toast: (msg: string) => void; profile: any }) {
  const [firstName, setFirstName] = useState(profile.firstName || '');
  const [lastName, setLastName] = useState(profile.lastName || '');

  return (
    <section className="space-y-6 ">
      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-user text-sky-500 mr-3"></i>
          Profile Information
        </h2>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-2">First Name</label>
              <input 
                type="text" 
                value={firstName}
                onChange={(e) => setFirstName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" 
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-navy-900 mb-2">Last Name</label>
              <input 
                type="text" 
                value={lastName}
                onChange={(e) => setLastName(e.target.value)}
                className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" 
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">
              Email
              <span className="ml-2 text-xs text-slate-500 font-normal">(Cannot be changed)</span>
            </label>
            <input 
              type="email" 
              value={profile.email || ''}
              disabled
              className="w-full px-4 py-3 border border-slate-200 rounded-lg bg-slate-50 text-slate-600 cursor-not-allowed" 
            />
          </div>
        </div>
      </div>

      {/* Only show Login Settings and Session Management for employers */}
      {(profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && (
        <>
          <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
            <h3 className="text-xl font-bold text-navy-900 mb-6">Login Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">Username</label>
                <input type="text" defaultValue="johnsmith" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
              </div>
              <div>
                <h4 className="font-semibold text-navy-900 mb-3">Connected Accounts</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <i className="fa-brands fa-google text-xl text-red-500"></i>
                      <span className="font-medium text-navy-900">Google</span>
                    </div>
                    <button className="text-red-500 hover:text-red-600 font-semibold">Disconnect</button>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-slate-200 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <i className="fa-brands fa-linkedin text-xl text-blue-600"></i>
                      <span className="font-medium text-navy-900">LinkedIn</span>
                    </div>
                    <button className="text-sky-500 hover:text-navy-900 font-semibold">Connect</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
            <h3 className="text-xl font-bold text-navy-900 mb-6">Session Management</h3>
            <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors">Sign out of other devices</button>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button onClick={() => toast('Changes saved successfully')} className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors">Save Changes</button>
      </div>
    </section>
  );
}

// Security Section Component
function SecuritySection({ toast, profile }: { toast: (msg: string) => void; profile: any }) {
  const { user } = useFirebaseAuth();
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [passwordStrength, setPasswordStrength] = useState('Weak');
  const [isUpdating, setIsUpdating] = useState(false);

  // Calculate password strength
  const calculatePasswordStrength = (password: string) => {
    if (password.length === 0) return 'Weak';
    if (password.length < 6) return 'Weak';
    if (password.length < 8) return 'Fair';
    
    let strength = 0;
    if (password.length >= 8) strength++;
    if (/[a-z]/.test(password)) strength++;
    if (/[A-Z]/.test(password)) strength++;
    if (/[0-9]/.test(password)) strength++;
    if (/[^a-zA-Z0-9]/.test(password)) strength++;

    if (strength <= 2) return 'Weak';
    if (strength <= 3) return 'Fair';
    if (strength <= 4) return 'Good';
    return 'Strong';
  };

  const handleNewPasswordChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const pwd = e.target.value;
    setNewPassword(pwd);
    setPasswordStrength(calculatePasswordStrength(pwd));
  };

  const getStrengthBars = () => {
    const bars = ['bg-[#D3D3D3]', 'bg-[#D3D3D3]', 'bg-[#D3D3D3]', 'bg-[#D3D3D3]'];
    if (passwordStrength === 'Weak') {
      bars[0] = 'bg-red-500';
    } else if (passwordStrength === 'Fair') {
      bars[0] = 'bg-yellow-500';
      bars[1] = 'bg-yellow-500';
    } else if (passwordStrength === 'Good') {
      bars[0] = 'bg-blue-500';
      bars[1] = 'bg-blue-500';
      bars[2] = 'bg-blue-500';
    } else if (passwordStrength === 'Strong') {
      bars[0] = 'bg-green-500';
      bars[1] = 'bg-green-500';
      bars[2] = 'bg-green-500';
      bars[3] = 'bg-green-500';
    }
    return bars;
  };

  const handleUpdatePassword = async () => {
    if (!user) {
      toast('You must be logged in to change your password');
      return;
    }

    // Validation
    if (!currentPassword) {
      toast('Please enter your current password');
      return;
    }

    if (!newPassword) {
      toast('Please enter a new password');
      return;
    }

    if (newPassword.length < 6) {
      toast('Password must be at least 6 characters long');
      return;
    }

    if (newPassword !== confirmPassword) {
      toast('New passwords do not match');
      return;
    }

    if (currentPassword === newPassword) {
      toast('New password must be different from current password');
      return;
    }

    setIsUpdating(true);

    try {
      const { EmailAuthProvider, reauthenticateWithCredential, updatePassword } = await import('firebase/auth');
      
      // Reauthenticate user with current password
      const credential = EmailAuthProvider.credential(
        user.email!,
        currentPassword
      );

      await reauthenticateWithCredential(user, credential);

      // Update password
      await updatePassword(user, newPassword);

      // Clear form
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      setPasswordStrength('Weak');

      toast('Password updated successfully');
    } catch (error: any) {
      console.error('Password update error:', error);
      
      if (error.code === 'auth/wrong-password' || error.code === 'auth/invalid-credential') {
        toast('Current password is incorrect');
      } else if (error.code === 'auth/weak-password') {
        toast('Password is too weak');
      } else if (error.code === 'auth/requires-recent-login') {
        toast('Please sign out and sign in again before changing your password');
      } else {
        toast('Failed to update password. Please try again.');
      }
    } finally {
      setIsUpdating(false);
    }
  };

  return (
    <section className="space-y-6 ">
      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-shield-halved text-sky-500 mr-3"></i>
          Password & Authentication
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-navy-900 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" 
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" 
                />
                <div className="mt-2 flex space-x-1">
                  {getStrengthBars().map((bg, index) => (
                    <div key={index} className={`h-1 w-full ${bg} rounded`}></div>
                  ))}
                </div>
                <p className="text-xs text-slate-600 mt-1">Password strength: {passwordStrength}</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" 
                />
              </div>
            </div>
            <button 
              onClick={handleUpdatePassword} 
              disabled={isUpdating}
              className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors px-6 py-3 rounded-lg font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>

      {/* Only show Two-Factor Authentication and Active Sessions for employers */}
      {(profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && (
        <>
          <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
            <h3 className="text-xl font-bold text-navy-900 mb-6">Two-Factor Authentication</h3>
            <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
              <div>
                <h4 className="font-semibold text-navy-900">Authenticator App</h4>
                <p className="text-sm text-slate-600">Use an authenticator app to generate codes</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Disabled</span>
                <button onClick={() => toast('2FA enabled')} className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors px-4 py-2 rounded-lg font-semibold">Enable</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
            <h3 className="text-xl font-bold text-navy-900 mb-6">Active Sessions</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-slate-200">
                    <th className="text-left py-3 font-semibold text-navy-900">Device</th>
                    <th className="text-left py-3 font-semibold text-navy-900">Location</th>
                    <th className="text-left py-3 font-semibold text-navy-900">Last Active</th>
                    <th className="text-left py-3 font-semibold text-navy-900">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-slate-200">
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-desktop text-sky-500"></i>
                        <span>Chrome on MacOS</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Current</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">New York, NY</td>
                    <td className="py-3 text-slate-600">Now</td>
                    <td className="py-3">-</td>
                  </tr>
                  <tr className="border-b border-slate-200">
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-mobile text-sky-500"></i>
                        <span>Safari on iPhone</span>
                      </div>
                    </td>
                    <td className="py-3 text-slate-600">New York, NY</td>
                    <td className="py-3 text-slate-600">2 hours ago</td>
                    <td className="py-3">
                      <button onClick={() => toast('Session revoked')} className="text-red-500 hover:text-red-600 font-semibold">Revoke</button>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </section>
  );
}

// Privacy Section Component
function PrivacySection({ toast }: { toast: (msg: string) => void }) {
  const [settings, setSettings] = useState({
    companyProfile: true,
    candidateMessages: false,
    recruiterNames: true
  });

  const toggleSetting = (key: keyof typeof settings) => {
    setSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast('Setting saved');
  };

  return (
    <section className="space-y-6 ">
      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-eye text-sky-500 mr-3"></i>
          Privacy & Visibility Settings
        </h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <h3 className="font-semibold text-navy-900">Show company profile to candidates</h3>
              <p className="text-sm text-slate-600">Allow candidates to view your company profile</p>
            </div>
            <div className={`toggle-switch ${settings.companyProfile ? 'active' : ''}`} onClick={() => toggleSetting('companyProfile')}></div>
          </div>
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <h3 className="font-semibold text-navy-900">Allow candidates to message first</h3>
              <p className="text-sm text-slate-600">Let candidates initiate conversations</p>
            </div>
            <div className={`toggle-switch ${settings.candidateMessages ? 'active' : ''}`} onClick={() => toggleSetting('candidateMessages')}></div>
          </div>
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div>
              <h3 className="font-semibold text-navy-900">Share recruiter names in outreach</h3>
              <p className="text-sm text-slate-600">Include recruiter information in messages</p>
            </div>
            <div className={`toggle-switch ${settings.recruiterNames ? 'active' : ''}`} onClick={() => toggleSetting('recruiterNames')}></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Do-Not-Contact List</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Add email or domain</label>
            <div className="flex space-x-2">
              <input type="text" placeholder="email@domain.com" className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
              <button onClick={() => toast('Added to list')} className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors px-6 py-3 rounded-lg font-semibold">Add</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2 bg-[#ADD8E6]/20 px-3 py-2 rounded-full">
              <span className="text-sm text-navy-900">competitor@company.com</span>
              <button className="text-red-500 hover:text-red-600">
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            </div>
            <div className="flex items-center space-x-2 bg-[#ADD8E6]/20 px-3 py-2 rounded-full">
              <span className="text-sm text-navy-900">@blockedcompany.com</span>
              <button className="text-red-500 hover:text-red-600">
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Compliance</h3>
        <div className="space-y-3">
          <a href="#" className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
            <span className="text-navy-900 font-medium">Privacy Policy</span>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
          <a href="#" className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
            <span className="text-navy-900 font-medium">Data Processing Agreement</span>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
          <a href="#" className="flex items-center justify-between p-3 border border-slate-200 rounded-lg hover:bg-slate-50">
            <span className="text-navy-900 font-medium">Subprocessors</span>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
        </div>
      </div>
    </section>
  );
}

// Notifications Section Component  
function NotificationsSection({ toast, profile }: { toast: (msg: string) => void; profile: any }) {
  const { user } = useFirebaseAuth();
  const [emailNotifs, setEmailNotifs] = useState([true, true, true, true]);
  const [inAppNotifs, setInAppNotifs] = useState([true, true, true, true]);
  const [isLoading, setIsLoading] = useState(true);

  // Different notification labels based on role
  const candidateNotifications = [
    { label: 'New recruiter message', description: 'Get notified when a recruiter reaches out to you for the first time', key: 'new_recruiter_message' },
    { label: 'Recruiter follow-up message', description: 'Be alerted when a recruiter follows up or replies to your message thread', key: 'recruiter_followup' },
    { label: 'New endorsement received', description: 'Receive a notification when someone endorses your skills or experience', key: 'new_endorsement' },
    { label: 'Profile viewed by recruiter', description: 'Know when your profile has been viewed by a recruiter or company', key: 'profile_viewed' },
  ];

  const employerNotifications = [
    { label: 'New candidate messages', description: '', key: 'new_candidate_messages' },
    { label: 'Candidate applied/saved', description: '', key: 'candidate_applied' },
    { label: 'Weekly talent digest', description: '', key: 'weekly_digest' },
    { label: 'Account/billing alerts', description: '', key: 'billing_alerts' },
  ];

  const notifications = profile.role === 'JOB_SEEKER' ? candidateNotifications : employerNotifications;

  // Load notification preferences from Firestore
  useEffect(() => {
    const loadPreferences = async () => {
      if (!user) return;
      
      try {
        const { getDocument } = await import('@/lib/firebase-firestore');
        const { data } = await getDocument('users', user.uid);
        
        if (data && (data as any).notificationPreferences) {
          const prefs = (data as any).notificationPreferences;
          
          if (profile.role === 'JOB_SEEKER') {
            setEmailNotifs([
              prefs.new_recruiter_message ?? true,
              prefs.recruiter_followup ?? true,
              prefs.new_endorsement ?? true,
              prefs.profile_viewed ?? true,
            ]);
          } else {
            setEmailNotifs([
              prefs.new_candidate_messages ?? true,
              prefs.candidate_applied ?? true,
              prefs.weekly_digest ?? false,
              prefs.billing_alerts ?? true,
            ]);
            setInAppNotifs([
              prefs.new_candidate_messages ?? true,
              prefs.candidate_applied ?? true,
              prefs.weekly_digest ?? true,
              prefs.billing_alerts ?? true,
            ]);
          }
        }
      } catch (error) {
        console.error('Error loading notification preferences:', error);
      } finally {
        setIsLoading(false);
      }
    };
    
    loadPreferences();
  }, [user, profile.role]);

  // Save notification preference to Firestore
  const savePreference = async (key: string, value: boolean) => {
    if (!user) {
      console.error('No user found');
      toast('You must be logged in to save preferences');
      return;
    }
    
    try {
      console.log('Saving preference:', { key, value, userId: user.uid });
      
      const response = await fetch('/api/notifications/update-preferences', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: user.uid,
          preferences: { [key]: value },
        }),
      });
      
      console.log('Response status:', response.status);
      
      const data = await response.json();
      console.log('Response data:', data);
      
      if (data.success) {
        toast('Notification preference saved');
      } else {
        const errorMsg = data.error || 'Unknown error';
        toast(`Failed to save: ${errorMsg}`);
        console.error('Error saving preference:', errorMsg);
      }
    } catch (error) {
      console.error('Error saving notification preference:', error);
      toast('Failed to save preference - network error');
    }
  };

  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-bell text-sky-500 mr-3"></i>
          Notification Preferences
        </h2>
        {isLoading ? (
          <div className="text-center py-8 text-slate-600">Loading preferences...</div>
        ) : (
          <div className={`grid grid-cols-1 ${profile.role === 'EMPLOYER' || profile.role === 'RECRUITER' ? 'lg:grid-cols-2' : ''} gap-8`}>
            <div>
              <h3 className="text-lg font-bold text-navy-900 mb-4">Email Notifications</h3>
              <div className="space-y-4">
                {notifications.map((notif, i) => (
                  <div key={i} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                    <div className="flex-1 mr-4">
                      <div className="text-navy-900 font-semibold">{notif.label}</div>
                      {notif.description && (
                        <div className="text-sm text-slate-600 mt-1">{notif.description}</div>
                      )}
                    </div>
                    <div 
                      className={`toggle-switch ${emailNotifs[i] ? 'active' : ''} ${i === 3 && profile.role !== 'JOB_SEEKER' ? 'opacity-50 cursor-not-allowed' : ''}`}
                      onClick={async () => {
                        if (i !== 3 || profile.role === 'JOB_SEEKER') {
                          const newValue = !emailNotifs[i];
                          const newNotifs = [...emailNotifs];
                          newNotifs[i] = newValue;
                          setEmailNotifs(newNotifs);
                          await savePreference(notif.key, newValue);
                        }
                      }}
                    ></div>
                  </div>
                ))}
              </div>
            </div>
            {/* Only show In-App Notifications for employers */}
            {(profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && (
              <div>
                <h3 className="text-lg font-bold text-navy-900 mb-4">In-App Notifications</h3>
                <div className="space-y-4">
                  {notifications.map((notif, i) => (
                    <div key={i} className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
                      <div className="flex-1 mr-4">
                        <div className="text-navy-900 font-semibold">{notif.label}</div>
                      </div>
                      <div 
                        className={`toggle-switch ${inAppNotifs[i] ? 'active' : ''} ${i === 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                        onClick={async () => {
                          if (i !== 3) {
                            const newValue = !inAppNotifs[i];
                            const newNotifs = [...inAppNotifs];
                            newNotifs[i] = newValue;
                            setInAppNotifs(newNotifs);
                            await savePreference(`${notif.key}_inapp`, newValue);
                          }
                        }}
                      ></div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  );
}

// Information Section Component (Employer)
function InformationSection({ profile }: { profile: any }) {
  const router = useRouter();

  // Show candidate-specific information for job seekers
  if (profile.role === 'JOB_SEEKER') {
    return (
      <section className="space-y-8">
      {/* Hero Banner */}
      <div className="bg-gradient-to-r from-navy-800 via-navy-700 to-navy-800 text-white p-10 rounded-2xl shadow-xl">
        <div className="max-w-4xl">
          <h1 className="text-4xl font-bold mb-4">How It Works — Candidates</h1>
          <p className="text-sky-100 text-lg leading-relaxed">
            Flip the hiring script. Build your profile once—then let companies come to you.
          </p>
        </div>
      </div>

      {/* Step Cards */}
      <div className="space-y-6">
        {/* Step 1 - Build Your Complete Profile */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 hover:shadow-2xl transition-shadow">
          <div className="flex items-start space-x-6">
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0 text-navy-900">1</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-navy-900 mb-3">Build Your Complete Profile</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Create a comprehensive professional profile that showcases your skills, education, experience, and personality. Upload your resume, add a brief video introduction, and highlight your achievements to stand out to potential employers.
              </p>
              <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                <p className="text-sm font-semibold text-navy-900 flex items-center space-x-2">
                  <i className="fa-solid fa-star text-sky-500"></i>
                  <span>Pro tip: Complete profiles get 3x more employer views and messages</span>
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Step 2 - Get Discovered by Employers */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 hover:shadow-2xl transition-shadow">
          <div className="flex items-start space-x-6">
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0 text-navy-900">2</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-navy-900 mb-3">Get Discovered by Employers</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Once your profile is live, employers can find you through our advanced search and matching system. They'll browse verified candidate profiles and reach out directly to candidates who match their requirements—no more endless job applications.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 text-slate-700">
                  <i className="fa-solid fa-check text-sky-500 text-sm"></i>
                  <span>Employers search our verified database</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-700">
                  <i className="fa-solid fa-check text-sky-500 text-sm"></i>
                  <span>AI-powered matching connects you with relevant opportunities</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-700">
                  <i className="fa-solid fa-check text-sky-500 text-sm"></i>
                  <span>Get direct messages from interested companies</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Step 3 - Connect & Interview */}
        <div className="bg-white p-8 rounded-2xl shadow-xl border border-slate-100 hover:shadow-2xl transition-shadow">
          <div className="flex items-start space-x-6">
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center font-bold text-lg flex-shrink-0 text-navy-900">3</div>
            <div className="flex-1">
              <h3 className="text-xl font-bold text-navy-900 mb-3">Connect & Interview</h3>
              <p className="text-slate-700 leading-relaxed mb-4">
                Communicate directly with employers through our secure messaging platform. Track your conversations, schedule interviews, and manage your hiring pipeline all in one place. Our transparent process keeps you informed at every step.
              </p>
              <div className="space-y-2">
                <div className="flex items-center space-x-3 text-slate-700">
                  <i className="fa-solid fa-check text-sky-500 text-sm"></i>
                  <span>Secure, direct messaging with employers</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-700">
                  <i className="fa-solid fa-check text-sky-500 text-sm"></i>
                  <span>Track your application progress in real-time</span>
                </div>
                <div className="flex items-center space-x-3 text-slate-700">
                  <i className="fa-solid fa-check text-sky-500 text-sm"></i>
                  <span>Transparent hiring timeline and feedback</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Trust & Safety Section */}
      <div className="bg-sky-50/50 p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="flex items-start space-x-4">
          <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center flex-shrink-0">
            <i className="fa-solid fa-shield-check text-navy-700 text-xl"></i>
          </div>
          <div className="flex-1">
            <h3 className="text-xl font-bold text-navy-900 mb-4">Trust & Safety (your time matters)</h3>
            <div className="space-y-4">
              <div className="flex items-start space-x-3">
                <i className="fa-solid fa-check text-sky-500 text-sm mt-1"></i>
                <p className="text-slate-700">
                  <strong className="text-navy-900">Every company is screened:</strong> We verify all employer accounts and company information before they can access our candidate database, ensuring you only hear from legitimate opportunities.
                </p>
              </div>
              <div className="flex items-start space-x-3">
                <i className="fa-solid fa-star text-sky-500 text-sm mt-1"></i>
                <p className="text-slate-700">
                  <strong className="text-navy-900">Company reviews by candidates:</strong> See ratings and reviews from other candidates who have interviewed with companies, helping you make informed decisions about potential employers.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Want More Invites Section */}
      <div className="bg-sky-50/50 p-8 rounded-2xl shadow-xl border border-slate-100">
        <div className="flex items-center space-x-3 mb-6">
          <div className="w-10 h-10 bg-sky-100 rounded-lg flex items-center justify-center">
            <i className="fa-solid fa-arrow-trend-up text-navy-700 text-lg"></i>
          </div>
          <h3 className="text-xl font-bold text-navy-900">Want more invites?</h3>
        </div>
        
        <div className="space-y-3">
          <div className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-sky-200 transition-all duration-200">
            <i className="fa-solid fa-check text-sky-500"></i>
            <span className="text-slate-700 font-medium">Finish everything in your profile (yes, everything)</span>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-sky-200 transition-all duration-200">
            <i className="fa-solid fa-video text-sky-500"></i>
            <span className="text-slate-700 font-medium">Add the video (0–30 seconds, friendly and clear)</span>
          </div>
          
          <div className="flex items-center space-x-4 p-4 bg-white rounded-xl border border-slate-200 hover:shadow-md hover:border-sky-200 transition-all duration-200">
            <i className="fa-solid fa-arrow-up text-sky-500"></i>
            <span className="text-slate-700 font-medium">Keep it fresh with new skills, projects, and wins</span>
          </div>
        </div>
      </div>

      {/* Bottom CTA Section */}
      <div className="bg-gradient-to-r from-navy-800 via-navy-700 to-navy-800 text-white p-10 rounded-2xl shadow-xl text-center">
        <h2 className="text-3xl font-bold mb-4">Bottom line</h2>
        <p className="text-sky-100 text-lg mb-8 max-w-2xl mx-auto">
          Complete your profile, kick back, and let the interviews come to you.
        </p>
        <button 
          onClick={() => router.push('/account/profile')}
          className="bg-white text-navy-900 px-8 py-4 rounded-lg font-semibold text-lg shadow-md hover:bg-slate-50 hover:shadow-lg transition-all duration-300 inline-flex items-center space-x-3"
        >
          <span>Complete Your Profile</span>
          <i className="fa-solid fa-arrow-right"></i>
        </button>
      </div>
    </section>
    );
  }

  // Show employer-specific information for employers and recruiters
  return (
    <section className="space-y-14 ">
      {/* Welcome Hero */}
      <div className="bg-gradient-to-r from-[#000080] to-[#ADD8E6] text-white p-10 rounded-3xl shadow-lg">
        <div className="flex items-center space-x-6">
          <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center">
            <i className="fa-solid fa-building text-3xl text-white"></i>
          </div>
          <div>
            <h1 className="text-4xl font-bold mb-3">Welcome, Employers</h1>
            <p className="text-blue-100 text-lg leading-relaxed max-w-2xl">
              HireMe connects you with talented early-career professionals through our streamlined, 
              transparent hiring process. Here's everything you need to know to get started.
            </p>
            <div className="mt-4">
              <span className="text-blue-200 font-semibold">Learn more below →</span>
            </div>
          </div>
        </div>
      </div>

      {/* Placeholder for employer information */}
      <div className="bg-white p-10 rounded-2xl shadow-xl border border-slate-100 border-slate-200">
        <h2 className="text-2xl font-bold text-navy-900 mb-4">Employer Information</h2>
        <p className="text-gray-700">
          Detailed employer information and guidelines will be available here soon.
        </p>
      </div>
    </section>
  );
}

// Billing Section Component (Employer Only)
function BillingSection() {
  return (
    <section className="space-y-6 ">
      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-credit-card text-sky-500 mr-3"></i>
          Billing & Subscription
        </h2>
        <div className="p-6 bg-gradient-to-r from-[#000080] to-[#ADD8E6] text-white rounded-lg mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Professional Plan</h3>
              <p className="text-blue-100">Next invoice: March 15, 2024</p>
              <p className="text-2xl font-bold mt-2">$199/month</p>
            </div>
            <div className="text-right">
              <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-lg font-semibold transition-colors">
                Manage Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Payment Method</h3>
        <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center space-x-4">
            <i className="fa-brands fa-cc-visa text-2xl text-blue-600"></i>
            <div>
              <p className="font-semibold text-navy-900">•••• •••• •••• 4242</p>
              <p className="text-sm text-slate-600">Expires 12/26</p>
            </div>
          </div>
          <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors px-4 py-2 rounded-lg font-semibold">Update Card</button>
        </div>
      </div>

      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Invoice History</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 font-semibold text-navy-900">Date</th>
                <th className="text-left py-3 font-semibold text-navy-900">Amount</th>
                <th className="text-left py-3 font-semibold text-navy-900">Status</th>
                <th className="text-left py-3 font-semibold text-navy-900">Download</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-3">Feb 15, 2024</td>
                <td className="py-3 font-semibold">$199.00</td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Paid</span>
                </td>
                <td className="py-3">
                  <button className="text-sky-500 hover:text-navy-900">
                    <i className="fa-solid fa-download"></i>
                  </button>
                </td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3">Jan 15, 2024</td>
                <td className="py-3 font-semibold">$199.00</td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Paid</span>
                </td>
                <td className="py-3">
                  <button className="text-sky-500 hover:text-navy-900">
                    <i className="fa-solid fa-download"></i>
                  </button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

// Team Section Component (Employer Only)
function TeamSection({ toast }: { toast: (msg: string) => void }) {
  return (
    <section className="space-y-6 ">
      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-users text-sky-500 mr-3"></i>
          Team Members & Recruiters
        </h2>
        <div className="mb-6">
          <div className="flex space-x-2">
            <input type="email" placeholder="Enter email address" className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
            <select className="px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400">
              <option>Admin</option>
              <option>Recruiter</option>
            </select>
            <button onClick={() => toast('Invite sent')} className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors px-6 py-3 rounded-lg font-semibold">Send Invite</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-200">
                <th className="text-left py-3 font-semibold text-navy-900">Name</th>
                <th className="text-left py-3 font-semibold text-navy-900">Email</th>
                <th className="text-left py-3 font-semibold text-navy-900">Role</th>
                <th className="text-left py-3 font-semibold text-navy-900">Status</th>
                <th className="text-left py-3 font-semibold text-navy-900">Last Active</th>
                <th className="text-left py-3 font-semibold text-navy-900">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-slate-200">
                <td className="py-3 font-semibold text-navy-900">John Smith</td>
                <td className="py-3">john.smith@company.com</td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-[#000080]/10 text-navy-900 rounded-full text-xs font-semibold">Owner</span>
                </td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Active</span>
                </td>
                <td className="py-3 text-slate-600">Now</td>
                <td className="py-3">-</td>
              </tr>
              <tr className="border-b border-slate-200">
                <td className="py-3 font-semibold text-navy-900">Sarah Wilson</td>
                <td className="py-3">sarah.wilson@company.com</td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-[#ADD8E6]/20 text-navy-900 rounded-full text-xs font-semibold">Admin</span>
                </td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Active</span>
                </td>
                <td className="py-3 text-slate-600">2 hours ago</td>
                <td className="py-3">
                  <button className="text-sky-500 hover:text-navy-900 mr-2">Edit</button>
                  <button onClick={() => toast('Member removed')} className="text-red-500 hover:text-red-600">Remove</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Role Descriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-slate-200 rounded-lg">
            <h4 className="font-semibold text-navy-900 mb-2">Owner</h4>
            <p className="text-sm text-slate-600">Full access to all features and billing</p>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg">
            <h4 className="font-semibold text-navy-900 mb-2">Admin</h4>
            <p className="text-sm text-slate-600">Manage team members and company settings</p>
          </div>
          <div className="p-4 border border-slate-200 rounded-lg">
            <h4 className="font-semibold text-navy-900 mb-2">Recruiter</h4>
            <p className="text-sm text-slate-600">Search candidates and manage hiring</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Company Section Component (Employer Only)
function CompanySection({ toast }: { toast: (msg: string) => void }) {
  return (
    <section className="space-y-6 ">
      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-building text-sky-500 mr-3"></i>
          Company Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Company Name</label>
            <input type="text" defaultValue="TechCorp Inc." className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Website</label>
            <input type="url" defaultValue="https://techcorp.com" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Industry</label>
            <select className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400">
              <option>Technology</option>
              <option>Finance</option>
              <option>Healthcare</option>
              <option>Education</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Company Size</label>
            <select className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400">
              <option>1-10 employees</option>
              <option>11-50 employees</option>
              <option>51-200 employees</option>
              <option>201-500 employees</option>
              <option>500+ employees</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-medium text-navy-900 mb-2">Headquarters Location</label>
            <input type="text" defaultValue="New York, NY" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Company Logo</label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-[#ADD8E6]/20 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-building text-navy-900 text-xl"></i>
              </div>
              <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors px-4 py-2 rounded-lg font-semibold">Upload Logo</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Company Banner</label>
            <div className="w-full h-32 bg-[#ADD8E6]/20 rounded-lg flex items-center justify-center border-2 border-dashed border-[#ADD8E6]">
              <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors px-4 py-2 rounded-lg font-semibold">Upload Banner</button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-between items-center">
          <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors">Open Full Editor</button>
          <button onClick={() => toast('Changes saved')} className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors">Save Changes</button>
        </div>
      </div>
    </section>
  );
}

// Integrations Section Component (Employer Only)
function IntegrationsSection({ toast }: { toast: (msg: string) => void }) {
  return (
    <section className="space-y-6 ">
      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-plug text-sky-500 mr-3"></i>
          Integrations & Connections
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 border border-slate-200 rounded-lg card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-seedling text-green-600"></i>
                </div>
                <div>
                  <h3 className="font-bold text-navy-900">Greenhouse</h3>
                  <p className="text-sm text-slate-600">ATS Integration</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Connected</span>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="API Key" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
              <button onClick={() => toast('Disconnected')} className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors w-full py-2 rounded-lg font-semibold text-sm">Disconnect</button>
            </div>
          </div>

          <div className="p-6 border border-slate-200 rounded-lg card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-calendar text-blue-600"></i>
                </div>
                <div>
                  <h3 className="font-bold text-navy-900">Google Calendar</h3>
                  <p className="text-sm text-slate-600">Interview Scheduling</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Disconnected</span>
            </div>
            <button onClick={() => toast('Connected')} className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors w-full py-2 rounded-lg font-semibold text-sm">Connect</button>
          </div>

          <div className="p-6 border border-slate-200 rounded-lg card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-shield text-purple-600"></i>
                </div>
                <div>
                  <h3 className="font-bold text-navy-900">Single Sign-On</h3>
                  <p className="text-sm text-slate-600">SAML/SCIM</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Not Configured</span>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="ACS URL" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
              <input type="text" placeholder="Entity ID" className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
              <button onClick={() => toast('Metadata uploaded')} className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors w-full py-2 rounded-lg font-semibold text-sm">Upload Metadata</button>
            </div>
          </div>

          <div className="p-6 border border-slate-200 rounded-lg card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                  <i className="fa-solid fa-webhook text-orange-600"></i>
                </div>
                <div>
                  <h3 className="font-bold text-navy-900">Webhooks</h3>
                  <p className="text-sm text-slate-600">Event Notifications</p>
                </div>
              </div>
              <button onClick={() => toast('Webhook added')} className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors px-4 py-1 rounded-lg font-semibold text-sm">+ Add</button>
            </div>
            <div className="text-sm text-slate-600">
              <p>No webhooks configured</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Data Section Component (Employer Only)
function DataSection() {
  return (
    <section className="space-y-6 ">
      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-database text-sky-500 mr-3"></i>
          Data Management & Export
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold text-navy-900 mb-4">Export Data</h3>
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-semibold text-navy-900 mb-2">Candidate Data</h4>
                <p className="text-sm text-slate-600 mb-3">Export all candidate interactions and messages</p>
                <div className="flex space-x-2">
                  <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors px-4 py-2 rounded-lg font-semibold text-sm">CSV</button>
                  <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors px-4 py-2 rounded-lg font-semibold text-sm">JSON</button>
                </div>
              </div>
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-semibold text-navy-900 mb-2">Job Postings</h4>
                <p className="text-sm text-slate-600 mb-3">Export all job postings and applications</p>
                <div className="flex space-x-2">
                  <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors px-4 py-2 rounded-lg font-semibold text-sm">CSV</button>
                  <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors px-4 py-2 rounded-lg font-semibold text-sm">JSON</button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-navy-900 mb-4">Import Data</h3>
            <div className="space-y-4">
              <div className="p-4 border border-slate-200 rounded-lg">
                <h4 className="font-semibold text-navy-900 mb-2">Job Postings</h4>
                <p className="text-sm text-slate-600 mb-3">Import job postings from CSV template</p>
                <div className="flex space-x-2">
                  <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors px-4 py-2 rounded-lg font-semibold text-sm">Download Template</button>
                  <button className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors px-4 py-2 rounded-lg font-semibold text-sm">Upload CSV</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Data Retention</h3>
        <div className="p-4 border border-slate-200 rounded-lg">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-navy-900">Message Retention Period</h4>
              <p className="text-sm text-slate-600">How long to keep candidate messages</p>
            </div>
            <select className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400">
              <option>12 months</option>
              <option>24 months</option>
              <option>36 months</option>
              <option>Indefinite</option>
            </select>
          </div>
        </div>
      </div>
    </section>
  );
}

// Accessibility Section Component
function AccessibilitySection({ toast }: { toast: (msg: string) => void }) {
  const [reduceMotion, setReduceMotion] = useState(false);
  const [keyboardShortcuts, setKeyboardShortcuts] = useState(true);

  return (
    <section className="space-y-6 ">
      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-universal-access text-sky-500 mr-3"></i>
          Accessibility & Preferences
        </h2>
        <div className="space-y-6">
          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-navy-900">Theme Preference</h3>
                <p className="text-sm text-slate-600">Choose your preferred appearance</p>
              </div>
              <select className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400">
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
              </select>
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-navy-900">Reduce Motion</h3>
                <p className="text-sm text-slate-600">Minimize animations and transitions</p>
              </div>
              <div 
                className={`toggle-switch ${reduceMotion ? 'active' : ''}`}
                onClick={() => {
                  setReduceMotion(!reduceMotion);
                  toast('Setting saved');
                }}
              ></div>
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-navy-900">Font Size</h3>
                <p className="text-sm text-slate-600">Adjust text size for better readability</p>
              </div>
              <select className="px-4 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400">
                <option>Normal (100%)</option>
                <option>Large (112%)</option>
                <option>Extra Large (125%)</option>
              </select>
            </div>
          </div>

          <div className="p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-navy-900">Keyboard Shortcuts</h3>
                <p className="text-sm text-slate-600">Enable quick keyboard navigation</p>
              </div>
              <div 
                className={`toggle-switch ${keyboardShortcuts ? 'active' : ''}`}
                onClick={() => {
                  setKeyboardShortcuts(!keyboardShortcuts);
                  toast('Setting saved');
                }}
              ></div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-none sm:rounded-lg md:rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Keyboard Shortcuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-navy-900">Search</span>
              <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono">/ </kbd>
            </div>
          </div>
          <div className="p-3 bg-slate-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-navy-900">Command Bar</span>
              <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono">⌘K</kbd>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Legal Section Component
function LegalSection() {
  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-gavel text-sky-500 mr-3"></i>
          Legal & Compliance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="/terms/candidates" className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-sky-200 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-file-contract text-sky-500"></i>
              <span className="font-semibold text-navy-900">Terms of Service</span>
            </div>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
          <a href="/terms/privacy" className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-sky-200 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-shield-check text-sky-500"></i>
              <span className="font-semibold text-navy-900">Privacy Policy</span>
            </div>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
          <a href="#" target="_blank" className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-sky-200 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-cookie-bite text-sky-500"></i>
              <span className="font-semibold text-navy-900">Cookie Policy</span>
            </div>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
          <a href="#" target="_blank" className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-sky-200 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-server text-sky-500"></i>
              <span className="font-semibold text-navy-900">Subprocessors</span>
            </div>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
          <a href="#" target="_blank" className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 hover:border-sky-200 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-lock text-sky-500"></i>
              <span className="font-semibold text-navy-900">Security Overview</span>
            </div>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
          <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-certificate text-sky-500"></i>
              <span className="font-semibold text-navy-900">SOC2 Report</span>
            </div>
            <button className="px-4 py-2 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 hover:border-sky-200 transition-colors text-sm">Download</button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Danger Section Component
function DangerSection() {
  return (
    <section className="space-y-6 ">
      <div className="danger-zone rounded-none sm:rounded-lg md:rounded-2xl shadow-sm p-8">
        <h2 className="text-xl font-bold text-red-800 mb-6 flex items-center">
          <i className="fa-solid fa-trash text-red-600 mr-3"></i>
          Delete Account
        </h2>
        <div className="bg-white rounded-lg p-6 border border-red-200">
          <h3 className="text-xl font-bold text-red-800 mb-4">Account Deletion</h3>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">⚠️ This action cannot be undone</h4>
              <p className="text-sm text-red-700 mb-3">Deleting your account will result in:</p>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• All your profile data and messages will be permanently deleted</li>
                <li>• Your job applications and history will be removed</li>
                <li>• Saved jobs and preferences will be lost</li>
                <li>• You will no longer be able to access your account</li>
              </ul>
            </div>
            <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
              <h4 className="font-semibold text-navy-900 mb-2">
                <i className="fa-solid fa-envelope mr-2"></i>
                Contact Support to Delete Your Account
              </h4>
              <p className="text-sm text-gray-700 mb-2">
                To proceed with account deletion, please contact our support team at:
              </p>
              <a 
                href="mailto:officialhiremeapp@gmail.com" 
                className="text-navy-900 font-semibold hover:text-sky-500 transition-colors inline-flex items-center"
              >
                officialhiremeapp@gmail.com
                <i className="fa-solid fa-external-link ml-2 text-xs"></i>
              </a>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
