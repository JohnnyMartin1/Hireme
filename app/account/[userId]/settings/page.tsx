"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter, useParams } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";

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
      <div style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F0F8FF 100%)', minHeight: '100vh'}} className="flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#000080] mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
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
    <div style={{background: 'linear-gradient(180deg, #E6F0FF 0%, #F0F8FF 100%)', minHeight: '100vh', fontFamily: "'Inter', sans-serif"}}>
      <style jsx global>{`
        ::-webkit-scrollbar { display: none; }
        
        .tab-active {
          background: linear-gradient(135deg, #000080 0%, #ADD8E6 100%);
          color: white;
        }
        
        .tab-inactive {
          background: white;
          color: #000080;
          border: 1px solid #D3D3D3;
        }
        
        .tab-inactive:hover {
          background: #F0F8FF;
          border-color: #ADD8E6;
        }
        
        .toggle-switch {
          position: relative;
          width: 48px;
          height: 24px;
          background: #D3D3D3;
          border-radius: 12px;
          cursor: pointer;
          transition: background-color 0.2s;
        }
        
        .toggle-switch.active {
          background: #ADD8E6;
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
        
        .input-focus {
          transition: all 0.2s ease;
        }
        
        .input-focus:focus {
          outline: none;
          border-color: #ADD8E6;
          box-shadow: 0 0 0 3px rgba(173, 216, 230, 0.1);
          transform: translateY(-1px);
        }
        
        .card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        
        .card-hover:hover {
          transform: translateY(-2px);
          box-shadow: 0 8px 16px rgba(173, 216, 230, 0.15);
        }
        
        .btn-primary {
          background: linear-gradient(135deg, #000080 0%, #ADD8E6 100%);
          color: white;
          transition: all 0.2s ease;
        }
        
        .btn-primary:hover {
          transform: translateY(-1px);
          box-shadow: 0 4px 12px rgba(0, 0, 128, 0.2);
        }
        
        .btn-secondary {
          background: white;
          color: #000080;
          border: 1px solid #D3D3D3;
          transition: all 0.2s ease;
        }
        
        .btn-secondary:hover {
          background: #F0F8FF;
          border-color: #ADD8E6;
          transform: translateY(-1px);
        }
        
        .btn-danger {
          background: #DC2626;
          color: white;
          transition: all 0.2s ease;
        }
        
        .btn-danger:hover {
          background: #B91C1C;
          transform: translateY(-1px);
        }
        
        .fade-in {
          opacity: 0;
          transform: translateY(8px);
          animation: fadeIn 220ms ease-out forwards;
        }
        
        @keyframes fadeIn {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        
        .toast {
          position: fixed;
          top: 20px;
          right: 20px;
          background: #000080;
          color: white;
          padding: 12px 20px;
          border-radius: 8px;
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
          transform: translateX(${showToast ? '0' : '400px'});
          transition: transform 0.3s ease;
          z-index: 1000;
        }
        
        .danger-zone {
          border: 1px solid #DC2626;
          background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%);
        }
      `}</style>

      {/* Toast Notification */}
      {showToast && (
        <div className="toast">
          <div className="flex items-center space-x-2">
            <i className="fa-solid fa-check"></i>
            <span>{toastMessage}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="bg-white/80 backdrop-blur-md sticky top-0 z-40 border-b border-[#D3D3D3]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <div className="flex items-center space-x-6">
              <Link href={dashboardUrl} className="flex items-center space-x-2 text-[#000080] hover:text-[#ADD8E6] transition-colors duration-200 bg-white px-4 py-2 rounded-full border border-[#D3D3D3] hover:border-[#ADD8E6]">
                <i className="fa-solid fa-arrow-left"></i>
                <span className="font-semibold">Back to Dashboard</span>
              </Link>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <h1 className="text-4xl font-bold text-[#000080] mb-8">Settings</h1>

        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar */}
          <aside className="lg:w-80 shrink-0">
            <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-6 sticky top-28">
              <nav className="space-y-2">
                {(profile.role === 'JOB_SEEKER' ? [
                  { id: 'account', icon: 'user', label: 'Account' },
                  { id: 'information', icon: 'circle-info', label: 'Information' },
                  { id: 'security', icon: 'shield-halved', label: 'Security' },
                  { id: 'notifications', icon: 'bell', label: 'Notifications' },
                  { id: 'accessibility', icon: 'universal-access', label: 'Accessibility' },
                  { id: 'legal', icon: 'gavel', label: 'Legal' },
                  { id: 'danger', icon: 'triangle-exclamation', label: 'Danger Zone' },
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
                  { id: 'danger', icon: 'triangle-exclamation', label: 'Danger Zone' },
                ]).map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => handleTabClick(tab.id)}
                    className={`w-full text-left px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
                      activeTab === tab.id ? 'tab-active' : 'tab-inactive'
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
            {activeTab === 'information' && <InformationSection />}
            {activeTab === 'security' && <SecuritySection toast={toast} profile={profile} />}
            {activeTab === 'privacy' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <PrivacySection toast={toast} />}
            {activeTab === 'notifications' && <NotificationsSection toast={toast} profile={profile} />}
            {activeTab === 'billing' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <BillingSection />}
            {activeTab === 'team' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <TeamSection toast={toast} />}
            {activeTab === 'company' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <CompanySection toast={toast} />}
            {activeTab === 'integrations' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <IntegrationsSection toast={toast} />}
            {activeTab === 'data' && (profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && <DataSection />}
            {activeTab === 'accessibility' && <AccessibilitySection toast={toast} />}
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
  return (
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-user text-[#ADD8E6] mr-3"></i>
          Profile Information
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">First Name</label>
            <input type="text" defaultValue="John" className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Last Name</label>
            <input type="text" defaultValue="Smith" className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Work Email (Primary)</label>
            <input type="email" defaultValue="john.smith@company.com" className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Phone (Optional)</label>
            <input type="tel" placeholder="+1 (555) 123-4567" className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Timezone</label>
            <select className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus">
              <option>Eastern Time (ET)</option>
              <option>Central Time (CT)</option>
              <option>Mountain Time (MT)</option>
              <option>Pacific Time (PT)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Avatar</label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-[#ADD8E6]/20 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-user text-[#000080] text-xl"></i>
              </div>
              <button className="btn-secondary px-4 py-2 rounded-xl font-semibold">Upload New</button>
            </div>
          </div>
        </div>
      </div>

      {/* Only show Login Settings and Session Management for employers */}
      {(profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
            <h3 className="text-xl font-bold text-[#000080] mb-6">Login Settings</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#000080] mb-2">Username</label>
                <input type="text" defaultValue="johnsmith" className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" />
              </div>
              <div>
                <h4 className="font-semibold text-[#000080] mb-3">Connected Accounts</h4>
                <div className="space-y-3">
                  <div className="flex items-center justify-between p-3 border border-[#D3D3D3] rounded-xl">
                    <div className="flex items-center space-x-3">
                      <i className="fa-brands fa-google text-xl text-red-500"></i>
                      <span className="font-medium text-[#000080]">Google</span>
                    </div>
                    <button className="text-red-500 hover:text-red-600 font-semibold">Disconnect</button>
                  </div>
                  <div className="flex items-center justify-between p-3 border border-[#D3D3D3] rounded-xl">
                    <div className="flex items-center space-x-3">
                      <i className="fa-brands fa-linkedin text-xl text-blue-600"></i>
                      <span className="font-medium text-[#000080]">LinkedIn</span>
                    </div>
                    <button className="text-[#ADD8E6] hover:text-[#000080] font-semibold">Connect</button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
            <h3 className="text-xl font-bold text-[#000080] mb-6">Session Management</h3>
            <button className="btn-secondary px-6 py-3 rounded-xl font-semibold">Sign out of other devices</button>
          </div>
        </>
      )}

      <div className="flex justify-end">
        <button onClick={() => toast('Changes saved successfully')} className="btn-primary px-8 py-3 rounded-xl font-semibold">Save Changes</button>
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
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-shield-halved text-[#ADD8E6] mr-3"></i>
          Password & Authentication
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-[#000080] mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-semibold text-[#000080] mb-2">Current Password</label>
                <input 
                  type="password" 
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" 
                />
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#000080] mb-2">New Password</label>
                <input 
                  type="password" 
                  value={newPassword}
                  onChange={handleNewPasswordChange}
                  className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" 
                />
                <div className="mt-2 flex space-x-1">
                  {getStrengthBars().map((bg, index) => (
                    <div key={index} className={`h-1 w-full ${bg} rounded`}></div>
                  ))}
                </div>
                <p className="text-xs text-gray-600 mt-1">Password strength: {passwordStrength}</p>
              </div>
              <div>
                <label className="block text-sm font-semibold text-[#000080] mb-2">Confirm New Password</label>
                <input 
                  type="password" 
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" 
                />
              </div>
            </div>
            <button 
              onClick={handleUpdatePassword} 
              disabled={isUpdating}
              className="btn-primary px-6 py-3 rounded-xl font-semibold mt-4 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isUpdating ? 'Updating...' : 'Update Password'}
            </button>
          </div>
        </div>
      </div>

      {/* Only show Two-Factor Authentication and Active Sessions for employers */}
      {(profile.role === 'EMPLOYER' || profile.role === 'RECRUITER') && (
        <>
          <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
            <h3 className="text-xl font-bold text-[#000080] mb-6">Two-Factor Authentication</h3>
            <div className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl">
              <div>
                <h4 className="font-semibold text-[#000080]">Authenticator App</h4>
                <p className="text-sm text-gray-600">Use an authenticator app to generate codes</p>
              </div>
              <div className="flex items-center space-x-3">
                <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Disabled</span>
                <button onClick={() => toast('2FA enabled')} className="btn-primary px-4 py-2 rounded-xl font-semibold">Enable</button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
            <h3 className="text-xl font-bold text-[#000080] mb-6">Active Sessions</h3>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-[#D3D3D3]">
                    <th className="text-left py-3 font-semibold text-[#000080]">Device</th>
                    <th className="text-left py-3 font-semibold text-[#000080]">Location</th>
                    <th className="text-left py-3 font-semibold text-[#000080]">Last Active</th>
                    <th className="text-left py-3 font-semibold text-[#000080]">Action</th>
                  </tr>
                </thead>
                <tbody>
                  <tr className="border-b border-[#D3D3D3]">
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-desktop text-[#ADD8E6]"></i>
                        <span>Chrome on MacOS</span>
                        <span className="px-2 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Current</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600">New York, NY</td>
                    <td className="py-3 text-gray-600">Now</td>
                    <td className="py-3">-</td>
                  </tr>
                  <tr className="border-b border-[#D3D3D3]">
                    <td className="py-3">
                      <div className="flex items-center space-x-2">
                        <i className="fa-solid fa-mobile text-[#ADD8E6]"></i>
                        <span>Safari on iPhone</span>
                      </div>
                    </td>
                    <td className="py-3 text-gray-600">New York, NY</td>
                    <td className="py-3 text-gray-600">2 hours ago</td>
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
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-eye text-[#ADD8E6] mr-3"></i>
          Privacy & Visibility Settings
        </h2>
        <div className="space-y-6">
          <div className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl">
            <div>
              <h3 className="font-semibold text-[#000080]">Show company profile to candidates</h3>
              <p className="text-sm text-gray-600">Allow candidates to view your company profile</p>
            </div>
            <div className={`toggle-switch ${settings.companyProfile ? 'active' : ''}`} onClick={() => toggleSetting('companyProfile')}></div>
          </div>
          <div className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl">
            <div>
              <h3 className="font-semibold text-[#000080]">Allow candidates to message first</h3>
              <p className="text-sm text-gray-600">Let candidates initiate conversations</p>
            </div>
            <div className={`toggle-switch ${settings.candidateMessages ? 'active' : ''}`} onClick={() => toggleSetting('candidateMessages')}></div>
          </div>
          <div className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl">
            <div>
              <h3 className="font-semibold text-[#000080]">Share recruiter names in outreach</h3>
              <p className="text-sm text-gray-600">Include recruiter information in messages</p>
            </div>
            <div className={`toggle-switch ${settings.recruiterNames ? 'active' : ''}`} onClick={() => toggleSetting('recruiterNames')}></div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h3 className="text-xl font-bold text-[#000080] mb-6">Do-Not-Contact List</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Add email or domain</label>
            <div className="flex space-x-2">
              <input type="text" placeholder="email@domain.com" className="flex-1 px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" />
              <button onClick={() => toast('Added to list')} className="btn-primary px-6 py-3 rounded-xl font-semibold">Add</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2 bg-[#ADD8E6]/20 px-3 py-2 rounded-full">
              <span className="text-sm text-[#000080]">competitor@company.com</span>
              <button className="text-red-500 hover:text-red-600">
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            </div>
            <div className="flex items-center space-x-2 bg-[#ADD8E6]/20 px-3 py-2 rounded-full">
              <span className="text-sm text-[#000080]">@blockedcompany.com</span>
              <button className="text-red-500 hover:text-red-600">
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h3 className="text-xl font-bold text-[#000080] mb-6">Compliance</h3>
        <div className="space-y-3">
          <a href="#" className="flex items-center justify-between p-3 border border-[#D3D3D3] rounded-xl hover:bg-gray-50">
            <span className="text-[#000080] font-medium">Privacy Policy</span>
            <i className="fa-solid fa-external-link text-[#ADD8E6]"></i>
          </a>
          <a href="#" className="flex items-center justify-between p-3 border border-[#D3D3D3] rounded-xl hover:bg-gray-50">
            <span className="text-[#000080] font-medium">Data Processing Agreement</span>
            <i className="fa-solid fa-external-link text-[#ADD8E6]"></i>
          </a>
          <a href="#" className="flex items-center justify-between p-3 border border-[#D3D3D3] rounded-xl hover:bg-gray-50">
            <span className="text-[#000080] font-medium">Subprocessors</span>
            <i className="fa-solid fa-external-link text-[#ADD8E6]"></i>
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
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-bell text-[#ADD8E6] mr-3"></i>
          Notification Preferences
        </h2>
        {isLoading ? (
          <div className="text-center py-8 text-gray-600">Loading preferences...</div>
        ) : (
          <div className={`grid grid-cols-1 ${profile.role === 'EMPLOYER' || profile.role === 'RECRUITER' ? 'lg:grid-cols-2' : ''} gap-8`}>
            <div>
              <h3 className="text-lg font-bold text-[#000080] mb-4">Email Notifications</h3>
              <div className="space-y-4">
                {notifications.map((notif, i) => (
                  <div key={i} className="flex items-center justify-between">
                    <div className="flex-1 mr-4">
                      <div className="text-[#000080] font-medium">{notif.label}</div>
                      {notif.description && (
                        <div className="text-sm text-gray-600 mt-1">{notif.description}</div>
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
                <h3 className="text-lg font-bold text-[#000080] mb-4">In-App Notifications</h3>
                <div className="space-y-4">
                  {notifications.map((notif, i) => (
                    <div key={i} className="flex items-center justify-between">
                      <div className="flex-1 mr-4">
                        <div className="text-[#000080] font-medium">{notif.label}</div>
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
function InformationSection() {
  return (
    <section className="space-y-14 fade-in">
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

      {/* How It Works */}
      <div className="space-y-8">
        <h2 className="text-3xl font-bold text-[#000080] text-center mb-10">How HireMe Works</h2>
        
        <div className="space-y-6">
          {/* Step 1 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#D3D3D3]">
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-[#000080] text-white rounded-full flex items-center justify-center font-bold text-lg">1</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#000080] mb-3">Set Up Your Company Profile</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Create your <strong>company profile</strong> with detailed information</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Upload <strong>company branding</strong> and culture photos</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Define your <strong>hiring criteria</strong> and job requirements</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-[#ADD8E6]/20 rounded-lg border-l-4 border-[#000080]">
                  <span className="text-sm font-semibold text-[#000080]">💡 Pro Tip: Complete profiles receive 3x more candidate responses</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 2 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#D3D3D3]">
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-[#ADD8E6] text-white rounded-full flex items-center justify-center font-bold text-lg">2</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#000080] mb-3">Search Verified Candidate Database</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Browse <strong>verified and standardized profiles</strong> from our database</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Use <strong>advanced filters</strong> for skills, education, and experience</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Access <strong>AI-powered matching</strong> for optimal candidate recommendations</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-[#ADD8E6]/20 rounded-lg border-l-4 border-[#ADD8E6]">
                  <span className="text-sm font-semibold text-[#000080]">✨ Pro Tip: Our verification process ensures you connect with serious, qualified candidates</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 3 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#D3D3D3]">
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-[#000080] text-white rounded-full flex items-center justify-center font-bold text-lg">3</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#000080] mb-3">Direct Messaging & Timeline Tracking</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Send <strong>direct messages</strong> to candidates through our secure platform</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Track your <strong>hiring timeline</strong> and application progress in real-time</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Maintain <strong>transparent communication</strong> throughout the process</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-[#ADD8E6]/20 rounded-lg border-l-4 border-[#ADD8E6]">
                  <span className="text-sm font-semibold text-[#000080]">🚀 Pro Tip: Fast, transparent communication leads to better hiring outcomes</span>
                </div>
              </div>
            </div>
          </div>

          {/* Step 4 */}
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-[#D3D3D3]">
            <div className="flex items-start space-x-6">
              <div className="w-12 h-12 bg-[#ADD8E6] text-white rounded-full flex items-center justify-center font-bold text-lg">4</div>
              <div className="flex-1">
                <h3 className="text-xl font-bold text-[#000080] mb-3">Efficient & Balanced Hiring Process</h3>
                <ul className="space-y-2 text-gray-700">
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Experience a <strong>fast and efficient</strong> hiring process</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Benefit from <strong>balanced and fair</strong> experiences for both parties</span>
                  </li>
                  <li className="flex items-center space-x-3">
                    <i className="fa-solid fa-check text-[#ADD8E6] text-sm"></i>
                    <span>Build <strong>long-term professional relationships</strong> with top talent</span>
                  </li>
                </ul>
                <div className="mt-4 p-3 bg-[#000080]/10 rounded-lg border-l-4 border-[#000080]">
                  <span className="text-sm font-semibold text-[#000080]">🎯 Pro Tip: Our platform revolutionizes hiring by putting employers in control of candidate discovery</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Quality & Accountability */}
      <div>
        <h2 className="text-3xl font-bold text-[#000080] text-center mb-10">Quality & Accountability</h2>
        
        <div className="bg-white p-10 rounded-2xl shadow-sm border border-[#D3D3D3]">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            <div className="space-y-4">
              <div className="w-12 h-12 bg-[#ADD8E6]/30 rounded-xl flex items-center justify-center mb-4">
                <i className="fa-solid fa-star text-[#000080] text-xl"></i>
              </div>
              <h3 className="text-xl font-bold text-[#000080]">Employer Ratings</h3>
              <p className="text-gray-700 leading-relaxed">
                Candidates can rate their experience with your company, helping you build a strong 
                employer brand and attract top talent through authentic feedback and transparency.
              </p>
              <div className="p-4 bg-[#ADD8E6]/20 rounded-lg border border-[#ADD8E6]/30">
                <p className="text-sm font-semibold text-[#000080] flex items-center space-x-2">
                  <span>✨</span>
                  <span>This means you'll build trust and credibility with future candidates</span>
                </p>
              </div>
            </div>

            <div className="space-y-4">
              <div className="w-12 h-12 bg-[#ADD8E6]/30 rounded-xl flex items-center justify-center mb-4">
                <i className="fa-solid fa-shield-check text-[#000080] text-xl"></i>
              </div>
              <h3 className="text-xl font-bold text-[#000080]">Candidate Quality</h3>
              <p className="text-gray-700 leading-relaxed">
                All candidates go through our verification process, including education confirmation 
                and skill assessments, ensuring you connect with qualified, serious job seekers.
              </p>
              <div className="p-4 bg-[#ADD8E6]/20 rounded-lg border border-[#ADD8E6]/30">
                <p className="text-sm font-semibold text-[#000080] flex items-center space-x-2">
                  <span>✨</span>
                  <span>This means less time screening and more time finding the right fit</span>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Subscription & Fees */}
      <div>
        <h2 className="text-3xl font-bold text-[#000080] text-center mb-10">Subscription & Fees</h2>
        
        <div className="bg-gradient-to-r from-[#000080] to-[#ADD8E6] p-10 rounded-2xl shadow-lg">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                <i className="fa-solid fa-calendar-days text-white text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Monthly Subscription</h3>
              <p className="text-4xl font-bold text-white mb-2">$199<span className="text-lg font-normal">/month</span></p>
              <p className="text-blue-100">Unlimited access to our candidate database and messaging platform.</p>
            </div>

            <div className="bg-white/10 backdrop-blur-sm p-8 rounded-xl border border-white/20">
              <div className="w-12 h-12 bg-white/20 rounded-xl flex items-center justify-center mb-6">
                <i className="fa-solid fa-handshake text-white text-xl"></i>
              </div>
              <h3 className="text-2xl font-bold text-white mb-4">Finder's Fee</h3>
              <p className="text-4xl font-bold text-white mb-2">15%<span className="text-lg font-normal"> of salary</span></p>
              <p className="text-blue-100">Only pay when you successfully hire a candidate through our platform.</p>
            </div>
          </div>

          <div className="mt-8 p-6 bg-[#ADD8E6]/20 rounded-xl border border-[#ADD8E6]/30">
            <p className="text-white font-semibold flex items-center space-x-3">
              <i className="fa-solid fa-check text-white"></i>
              <span>Success-Based Pricing: Choose the model that works best for your hiring needs</span>
            </p>
          </div>
        </div>
      </div>

      {/* Ready to Start */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#000080] mb-4">You're Ready to Start! ❤️</h2>
          <p className="text-gray-600 text-lg">Complete these steps to begin finding your next great hire</p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-10">
          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#D3D3D3] cursor-pointer hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-[#ADD8E6]/30 rounded-xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-building text-[#000080] text-xl"></i>
            </div>
            <h3 className="font-bold text-[#000080] mb-2">Set up your Company Profile</h3>
            <p className="text-gray-600 text-sm">Add your company details and culture information</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#D3D3D3] cursor-pointer hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-[#ADD8E6]/30 rounded-xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-users text-[#000080] text-xl"></i>
            </div>
            <h3 className="font-bold text-[#000080] mb-2">Invite your Recruiters</h3>
            <p className="text-gray-600 text-sm">Add team members to collaborate on hiring</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#D3D3D3] cursor-pointer hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-[#ADD8E6]/30 rounded-xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-briefcase text-[#000080] text-xl"></i>
            </div>
            <h3 className="font-bold text-[#000080] mb-2">Post your first job</h3>
            <p className="text-gray-600 text-sm">Create a job listing to attract candidates</p>
          </div>

          <div className="bg-white p-6 rounded-xl shadow-sm border border-[#D3D3D3] cursor-pointer hover:shadow-md transition-all">
            <div className="w-12 h-12 bg-[#ADD8E6]/30 rounded-xl flex items-center justify-center mb-4">
              <i className="fa-solid fa-comments text-[#000080] text-xl"></i>
            </div>
            <h3 className="font-bold text-[#000080] mb-2">Start connecting with candidates</h3>
            <p className="text-gray-600 text-sm">Browse profiles and send messages</p>
          </div>
        </div>

        <div className="text-center">
          <div className="inline-flex items-center space-x-3 bg-[#ADD8E6]/30 px-8 py-4 rounded-full border border-[#ADD8E6]/50">
            <i className="fa-solid fa-heart text-[#000080]"></i>
            <span className="font-semibold text-[#000080]">HireMe gives you everything you need to hire with confidence</span>
          </div>
        </div>
      </div>

      {/* About Platform */}
      <div>
        <div className="text-center mb-10">
          <h2 className="text-3xl font-bold text-[#000080] mb-4">About HireMe Platform 🚀</h2>
          <p className="text-gray-600 text-lg">Understanding our comprehensive hiring ecosystem</p>
        </div>

        <div className="space-y-8">
          {/* Revolutionary Process */}
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-[#D3D3D3]">
            <div className="flex items-start space-x-6">
              <div className="w-16 h-16 bg-[#ADD8E6]/30 rounded-2xl flex items-center justify-center">
                <i className="fa-solid fa-rocket text-[#000080] text-2xl"></i>
              </div>
              <div className="flex-1">
                <h3 className="text-2xl font-bold text-[#000080] mb-4">Revolutionary Hiring Process</h3>
                <p className="text-gray-700 leading-relaxed mb-6">
                  HireMe revolutionizes traditional hiring by empowering employers to discover talent from our database of verified, standardized profiles. Instead of candidates seeking employers, we enable you to find the perfect match through direct search and AI-powered recommendations. Our platform ensures fast, transparent communication while providing a balanced experience for both parties.
                </p>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="p-4 bg-[#ADD8E6]/20 rounded-lg border-l-4 border-[#000080]">
                    <p className="text-sm font-semibold text-[#000080]">✅ Direct messaging capabilities</p>
                  </div>
                  <div className="p-4 bg-[#ADD8E6]/20 rounded-lg border-l-4 border-[#ADD8E6]">
                    <p className="text-sm font-semibold text-[#000080]">📈 Hiring timeline tracking</p>
                  </div>
                  <div className="p-4 bg-[#ADD8E6]/20 rounded-lg border-l-4 border-[#000080]">
                    <p className="text-sm font-semibold text-[#000080]">🔒 Safe and efficient process</p>
                  </div>
                  <div className="p-4 bg-[#ADD8E6]/20 rounded-lg border-l-4 border-[#ADD8E6]">
                    <p className="text-sm font-semibold text-[#000080]">⚖️ Balanced experience for all</p>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Platform Navigation */}
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-[#D3D3D3]">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-[#000080] mb-4 flex items-center space-x-3">
                <i className="fa-solid fa-compass text-[#000080]"></i>
                <span>Platform Navigation</span>
              </h3>
              <p className="text-gray-700">Explore all areas of the HireMe ecosystem designed for seamless hiring</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="p-4 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3] cursor-pointer hover:bg-[#ADD8E6]/30 transition-all">
                <div className="w-10 h-10 bg-[#000080] rounded-lg flex items-center justify-center mb-3">
                  <i className="fa-solid fa-home text-white"></i>
                </div>
                <h4 className="font-bold text-[#000080] text-sm">Landing Page</h4>
                <p className="text-xs text-gray-600 mt-1">Your starting point</p>
              </div>

              <div className="p-4 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3] cursor-pointer hover:bg-[#ADD8E6]/30 transition-all">
                <div className="w-10 h-10 bg-[#ADD8E6] rounded-lg flex items-center justify-center mb-3">
                  <i className="fa-solid fa-user text-white"></i>
                </div>
                <h4 className="font-bold text-[#000080] text-sm">Candidate Dashboard</h4>
                <p className="text-xs text-gray-600 mt-1">Job seeker hub</p>
              </div>

              <div className="p-4 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3] cursor-pointer hover:bg-[#ADD8E6]/30 transition-all">
                <div className="w-10 h-10 bg-[#000080] rounded-lg flex items-center justify-center mb-3">
                  <i className="fa-solid fa-building text-white"></i>
                </div>
                <h4 className="font-bold text-[#000080] text-sm">Employer Dashboard</h4>
                <p className="text-xs text-gray-600 mt-1">Hiring command center</p>
              </div>

              <div className="p-4 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3] cursor-pointer hover:bg-[#ADD8E6]/30 transition-all">
                <div className="w-10 h-10 bg-[#ADD8E6] rounded-lg flex items-center justify-center mb-3">
                  <i className="fa-solid fa-id-card text-white"></i>
                </div>
                <h4 className="font-bold text-[#000080] text-sm">Candidate Profile</h4>
                <p className="text-xs text-gray-600 mt-1">Detailed profiles</p>
              </div>

              <div className="p-4 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3] cursor-pointer hover:bg-[#ADD8E6]/30 transition-all">
                <div className="w-10 h-10 bg-[#000080] rounded-lg flex items-center justify-center mb-3">
                  <i className="fa-solid fa-search text-white"></i>
                </div>
                <h4 className="font-bold text-[#000080] text-sm">Search Results</h4>
                <p className="text-xs text-gray-600 mt-1">Find candidates</p>
              </div>

              <div className="p-4 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3] cursor-pointer hover:bg-[#ADD8E6]/30 transition-all">
                <div className="w-10 h-10 bg-[#ADD8E6] rounded-lg flex items-center justify-center mb-3">
                  <i className="fa-solid fa-comments text-white"></i>
                </div>
                <h4 className="font-bold text-[#000080] text-sm">Messaging</h4>
                <p className="text-xs text-gray-600 mt-1">Direct communication</p>
              </div>

              <div className="p-4 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3] cursor-pointer hover:bg-[#ADD8E6]/30 transition-all">
                <div className="w-10 h-10 bg-[#000080] rounded-lg flex items-center justify-center mb-3">
                  <i className="fa-solid fa-timeline text-white"></i>
                </div>
                <h4 className="font-bold text-[#000080] text-sm">Timeline/Progress</h4>
                <p className="text-xs text-gray-600 mt-1">Track hiring stages</p>
              </div>

              <div className="p-4 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3] cursor-pointer hover:bg-[#ADD8E6]/30 transition-all">
                <div className="w-10 h-10 bg-[#ADD8E6] rounded-lg flex items-center justify-center mb-3">
                  <i className="fa-solid fa-cog text-white"></i>
                </div>
                <h4 className="font-bold text-[#000080] text-sm">Settings</h4>
                <p className="text-xs text-gray-600 mt-1">Customize experience</p>
              </div>
            </div>
          </div>

          {/* Design & Accessibility */}
          <div className="bg-white p-10 rounded-2xl shadow-sm border border-[#D3D3D3]">
            <div className="mb-8">
              <h3 className="text-2xl font-bold text-[#000080] mb-4 flex items-center space-x-3">
                <i className="fa-solid fa-palette text-[#000080]"></i>
                <span>Design & Accessibility Standards</span>
              </h3>
              <p className="text-gray-700">Built with professional reliability and user-friendly clarity in mind</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <div className="space-y-6">
                <div className="p-6 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3]">
                  <h4 className="font-bold text-[#000080] mb-3 flex items-center space-x-2">
                    <i className="fa-solid fa-swatchbook text-[#000080]"></i>
                    <span>Color System</span>
                  </h4>
                  <div className="space-y-3">
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-[#000080] rounded-full border-2 border-white shadow-sm"></div>
                      <span className="text-sm"><strong>Navy Blue:</strong> Reliability & professionalism</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-[#ADD8E6] rounded-full border-2 border-white shadow-sm"></div>
                      <span className="text-sm"><strong>Light Blue:</strong> Clarity & ease-of-use</span>
                    </div>
                    <div className="flex items-center space-x-3">
                      <div className="w-6 h-6 bg-white rounded-full border-2 border-[#D3D3D3] shadow-sm"></div>
                      <span className="text-sm"><strong>White:</strong> Clean text & backgrounds</span>
                    </div>
                  </div>
                </div>

                <div className="p-6 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3]">
                  <h4 className="font-bold text-[#000080] mb-3 flex items-center space-x-2">
                    <i className="fa-solid fa-universal-access text-[#000080]"></i>
                    <span>Accessibility Features</span>
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center space-x-2">
                      <i className="fa-solid fa-check text-[#ADD8E6] text-xs"></i>
                      <span>High contrast ratios for readability</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fa-solid fa-check text-[#ADD8E6] text-xs"></i>
                      <span>Consistent 20px padding for touch targets</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fa-solid fa-check text-[#ADD8E6] text-xs"></i>
                      <span>Modern sans-serif typography</span>
                    </li>
                  </ul>
                </div>
              </div>

              <div className="space-y-6">
                <div className="p-6 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3]">
                  <h4 className="font-bold text-[#000080] mb-3 flex items-center space-x-2">
                    <i className="fa-solid fa-mobile-alt text-[#000080]"></i>
                    <span>Responsive Design</span>
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center space-x-2">
                      <i className="fa-solid fa-check text-[#ADD8E6] text-xs"></i>
                      <span>Light and dark mode compatibility</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fa-solid fa-check text-[#ADD8E6] text-xs"></i>
                      <span>Optimized for all screen sizes</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fa-solid fa-check text-[#ADD8E6] text-xs"></i>
                      <span>Intuitive navigation elements</span>
                    </li>
                  </ul>
                </div>

                <div className="p-6 bg-[#ADD8E6]/20 rounded-xl border border-[#D3D3D3]">
                  <h4 className="font-bold text-[#000080] mb-3 flex items-center space-x-2">
                    <i className="fa-solid fa-shield-check text-[#000080]"></i>
                    <span>Quality Standards</span>
                  </h4>
                  <ul className="space-y-2 text-sm text-gray-700">
                    <li className="flex items-center space-x-2">
                      <i className="fa-solid fa-check text-[#ADD8E6] text-xs"></i>
                      <span>No technical jargon in user interface</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fa-solid fa-check text-[#ADD8E6] text-xs"></i>
                      <span>Clear visual hierarchy and content flow</span>
                    </li>
                    <li className="flex items-center space-x-2">
                      <i className="fa-solid fa-check text-[#ADD8E6] text-xs"></i>
                      <span>Purposeful design enhancements only</span>
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

// Billing Section Component (Employer Only)
function BillingSection() {
  return (
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-credit-card text-[#ADD8E6] mr-3"></i>
          Billing & Subscription
        </h2>
        <div className="p-6 bg-gradient-to-r from-[#000080] to-[#ADD8E6] text-white rounded-xl mb-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xl font-bold mb-2">Professional Plan</h3>
              <p className="text-blue-100">Next invoice: March 15, 2024</p>
              <p className="text-2xl font-bold mt-2">$199/month</p>
            </div>
            <div className="text-right">
              <button className="bg-white/20 hover:bg-white/30 px-4 py-2 rounded-xl font-semibold transition-colors">
                Manage Plan
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h3 className="text-xl font-bold text-[#000080] mb-6">Payment Method</h3>
        <div className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl">
          <div className="flex items-center space-x-4">
            <i className="fa-brands fa-cc-visa text-2xl text-blue-600"></i>
            <div>
              <p className="font-semibold text-[#000080]">•••• •••• •••• 4242</p>
              <p className="text-sm text-gray-600">Expires 12/26</p>
            </div>
          </div>
          <button className="btn-secondary px-4 py-2 rounded-xl font-semibold">Update Card</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h3 className="text-xl font-bold text-[#000080] mb-6">Invoice History</h3>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D3D3D3]">
                <th className="text-left py-3 font-semibold text-[#000080]">Date</th>
                <th className="text-left py-3 font-semibold text-[#000080]">Amount</th>
                <th className="text-left py-3 font-semibold text-[#000080]">Status</th>
                <th className="text-left py-3 font-semibold text-[#000080]">Download</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#D3D3D3]">
                <td className="py-3">Feb 15, 2024</td>
                <td className="py-3 font-semibold">$199.00</td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Paid</span>
                </td>
                <td className="py-3">
                  <button className="text-[#ADD8E6] hover:text-[#000080]">
                    <i className="fa-solid fa-download"></i>
                  </button>
                </td>
              </tr>
              <tr className="border-b border-[#D3D3D3]">
                <td className="py-3">Jan 15, 2024</td>
                <td className="py-3 font-semibold">$199.00</td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Paid</span>
                </td>
                <td className="py-3">
                  <button className="text-[#ADD8E6] hover:text-[#000080]">
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
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-users text-[#ADD8E6] mr-3"></i>
          Team Members & Recruiters
        </h2>
        <div className="mb-6">
          <div className="flex space-x-2">
            <input type="email" placeholder="Enter email address" className="flex-1 px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" />
            <select className="px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus">
              <option>Admin</option>
              <option>Recruiter</option>
            </select>
            <button onClick={() => toast('Invite sent')} className="btn-primary px-6 py-3 rounded-xl font-semibold">Send Invite</button>
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-[#D3D3D3]">
                <th className="text-left py-3 font-semibold text-[#000080]">Name</th>
                <th className="text-left py-3 font-semibold text-[#000080]">Email</th>
                <th className="text-left py-3 font-semibold text-[#000080]">Role</th>
                <th className="text-left py-3 font-semibold text-[#000080]">Status</th>
                <th className="text-left py-3 font-semibold text-[#000080]">Last Active</th>
                <th className="text-left py-3 font-semibold text-[#000080]">Actions</th>
              </tr>
            </thead>
            <tbody>
              <tr className="border-b border-[#D3D3D3]">
                <td className="py-3 font-semibold text-[#000080]">John Smith</td>
                <td className="py-3">john.smith@company.com</td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-[#000080]/10 text-[#000080] rounded-full text-xs font-semibold">Owner</span>
                </td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Active</span>
                </td>
                <td className="py-3 text-gray-600">Now</td>
                <td className="py-3">-</td>
              </tr>
              <tr className="border-b border-[#D3D3D3]">
                <td className="py-3 font-semibold text-[#000080]">Sarah Wilson</td>
                <td className="py-3">sarah.wilson@company.com</td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-[#ADD8E6]/20 text-[#000080] rounded-full text-xs font-semibold">Admin</span>
                </td>
                <td className="py-3">
                  <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Active</span>
                </td>
                <td className="py-3 text-gray-600">2 hours ago</td>
                <td className="py-3">
                  <button className="text-[#ADD8E6] hover:text-[#000080] mr-2">Edit</button>
                  <button onClick={() => toast('Member removed')} className="text-red-500 hover:text-red-600">Remove</button>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h3 className="text-xl font-bold text-[#000080] mb-6">Role Descriptions</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 border border-[#D3D3D3] rounded-xl">
            <h4 className="font-semibold text-[#000080] mb-2">Owner</h4>
            <p className="text-sm text-gray-600">Full access to all features and billing</p>
          </div>
          <div className="p-4 border border-[#D3D3D3] rounded-xl">
            <h4 className="font-semibold text-[#000080] mb-2">Admin</h4>
            <p className="text-sm text-gray-600">Manage team members and company settings</p>
          </div>
          <div className="p-4 border border-[#D3D3D3] rounded-xl">
            <h4 className="font-semibold text-[#000080] mb-2">Recruiter</h4>
            <p className="text-sm text-gray-600">Search candidates and manage hiring</p>
          </div>
        </div>
      </div>
    </section>
  );
}

// Company Section Component (Employer Only)
function CompanySection({ toast }: { toast: (msg: string) => void }) {
  return (
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-building text-[#ADD8E6] mr-3"></i>
          Company Profile
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Company Name</label>
            <input type="text" defaultValue="TechCorp Inc." className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Website</label>
            <input type="url" defaultValue="https://techcorp.com" className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" />
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Industry</label>
            <select className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus">
              <option>Technology</option>
              <option>Finance</option>
              <option>Healthcare</option>
              <option>Education</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Company Size</label>
            <select className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus">
              <option>1-10 employees</option>
              <option>11-50 employees</option>
              <option>51-200 employees</option>
              <option>201-500 employees</option>
              <option>500+ employees</option>
            </select>
          </div>
          <div className="md:col-span-2">
            <label className="block text-sm font-semibold text-[#000080] mb-2">Headquarters Location</label>
            <input type="text" defaultValue="New York, NY" className="w-full px-4 py-3 border border-[#D3D3D3] rounded-xl input-focus" />
          </div>
        </div>
        <div className="mt-6 space-y-4">
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Company Logo</label>
            <div className="flex items-center space-x-4">
              <div className="w-16 h-16 bg-[#ADD8E6]/20 rounded-xl flex items-center justify-center">
                <i className="fa-solid fa-building text-[#000080] text-xl"></i>
              </div>
              <button className="btn-secondary px-4 py-2 rounded-xl font-semibold">Upload Logo</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-semibold text-[#000080] mb-2">Company Banner</label>
            <div className="w-full h-32 bg-[#ADD8E6]/20 rounded-xl flex items-center justify-center border-2 border-dashed border-[#ADD8E6]">
              <button className="btn-secondary px-4 py-2 rounded-xl font-semibold">Upload Banner</button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-between items-center">
          <button className="btn-secondary px-6 py-3 rounded-xl font-semibold">Open Full Editor</button>
          <button onClick={() => toast('Changes saved')} className="btn-primary px-8 py-3 rounded-xl font-semibold">Save Changes</button>
        </div>
      </div>
    </section>
  );
}

// Integrations Section Component (Employer Only)
function IntegrationsSection({ toast }: { toast: (msg: string) => void }) {
  return (
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-plug text-[#ADD8E6] mr-3"></i>
          Integrations & Connections
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 border border-[#D3D3D3] rounded-xl card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-seedling text-green-600"></i>
                </div>
                <div>
                  <h3 className="font-bold text-[#000080]">Greenhouse</h3>
                  <p className="text-sm text-gray-600">ATS Integration</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-xs font-semibold">Connected</span>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="API Key" className="w-full px-3 py-2 border border-[#D3D3D3] rounded-lg text-sm input-focus" />
              <button onClick={() => toast('Disconnected')} className="btn-secondary w-full py-2 rounded-lg font-semibold text-sm">Disconnect</button>
            </div>
          </div>

          <div className="p-6 border border-[#D3D3D3] rounded-xl card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-blue-100 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-calendar text-blue-600"></i>
                </div>
                <div>
                  <h3 className="font-bold text-[#000080]">Google Calendar</h3>
                  <p className="text-sm text-gray-600">Interview Scheduling</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Disconnected</span>
            </div>
            <button onClick={() => toast('Connected')} className="btn-primary w-full py-2 rounded-lg font-semibold text-sm">Connect</button>
          </div>

          <div className="p-6 border border-[#D3D3D3] rounded-xl card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-purple-100 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-shield text-purple-600"></i>
                </div>
                <div>
                  <h3 className="font-bold text-[#000080]">Single Sign-On</h3>
                  <p className="text-sm text-gray-600">SAML/SCIM</p>
                </div>
              </div>
              <span className="px-3 py-1 bg-red-100 text-red-800 rounded-full text-xs font-semibold">Not Configured</span>
            </div>
            <div className="space-y-2">
              <input type="text" placeholder="ACS URL" className="w-full px-3 py-2 border border-[#D3D3D3] rounded-lg text-sm input-focus" />
              <input type="text" placeholder="Entity ID" className="w-full px-3 py-2 border border-[#D3D3D3] rounded-lg text-sm input-focus" />
              <button onClick={() => toast('Metadata uploaded')} className="btn-secondary w-full py-2 rounded-lg font-semibold text-sm">Upload Metadata</button>
            </div>
          </div>

          <div className="p-6 border border-[#D3D3D3] rounded-xl card-hover">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-webhook text-orange-600"></i>
                </div>
                <div>
                  <h3 className="font-bold text-[#000080]">Webhooks</h3>
                  <p className="text-sm text-gray-600">Event Notifications</p>
                </div>
              </div>
              <button onClick={() => toast('Webhook added')} className="btn-primary px-4 py-1 rounded-lg font-semibold text-sm">+ Add</button>
            </div>
            <div className="text-sm text-gray-600">
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
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-database text-[#ADD8E6] mr-3"></i>
          Data Management & Export
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-xl font-bold text-[#000080] mb-4">Export Data</h3>
            <div className="space-y-4">
              <div className="p-4 border border-[#D3D3D3] rounded-xl">
                <h4 className="font-semibold text-[#000080] mb-2">Candidate Data</h4>
                <p className="text-sm text-gray-600 mb-3">Export all candidate interactions and messages</p>
                <div className="flex space-x-2">
                  <button className="btn-secondary px-4 py-2 rounded-lg font-semibold text-sm">CSV</button>
                  <button className="btn-secondary px-4 py-2 rounded-lg font-semibold text-sm">JSON</button>
                </div>
              </div>
              <div className="p-4 border border-[#D3D3D3] rounded-xl">
                <h4 className="font-semibold text-[#000080] mb-2">Job Postings</h4>
                <p className="text-sm text-gray-600 mb-3">Export all job postings and applications</p>
                <div className="flex space-x-2">
                  <button className="btn-secondary px-4 py-2 rounded-lg font-semibold text-sm">CSV</button>
                  <button className="btn-secondary px-4 py-2 rounded-lg font-semibold text-sm">JSON</button>
                </div>
              </div>
            </div>
          </div>
          <div>
            <h3 className="text-xl font-bold text-[#000080] mb-4">Import Data</h3>
            <div className="space-y-4">
              <div className="p-4 border border-[#D3D3D3] rounded-xl">
                <h4 className="font-semibold text-[#000080] mb-2">Job Postings</h4>
                <p className="text-sm text-gray-600 mb-3">Import job postings from CSV template</p>
                <div className="flex space-x-2">
                  <button className="btn-secondary px-4 py-2 rounded-lg font-semibold text-sm">Download Template</button>
                  <button className="btn-primary px-4 py-2 rounded-lg font-semibold text-sm">Upload CSV</button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h3 className="text-xl font-bold text-[#000080] mb-6">Data Retention</h3>
        <div className="p-4 border border-[#D3D3D3] rounded-xl">
          <div className="flex items-center justify-between">
            <div>
              <h4 className="font-semibold text-[#000080]">Message Retention Period</h4>
              <p className="text-sm text-gray-600">How long to keep candidate messages</p>
            </div>
            <select className="px-4 py-2 border border-[#D3D3D3] rounded-lg input-focus">
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
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-universal-access text-[#ADD8E6] mr-3"></i>
          Accessibility & Preferences
        </h2>
        <div className="space-y-6">
          <div className="p-4 border border-[#D3D3D3] rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#000080]">Theme Preference</h3>
                <p className="text-sm text-gray-600">Choose your preferred appearance</p>
              </div>
              <select className="px-4 py-2 border border-[#D3D3D3] rounded-lg input-focus">
                <option>Light</option>
                <option>Dark</option>
                <option>System</option>
              </select>
            </div>
          </div>

          <div className="p-4 border border-[#D3D3D3] rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#000080]">Reduce Motion</h3>
                <p className="text-sm text-gray-600">Minimize animations and transitions</p>
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

          <div className="p-4 border border-[#D3D3D3] rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#000080]">Font Size</h3>
                <p className="text-sm text-gray-600">Adjust text size for better readability</p>
              </div>
              <select className="px-4 py-2 border border-[#D3D3D3] rounded-lg input-focus">
                <option>Normal (100%)</option>
                <option>Large (112%)</option>
                <option>Extra Large (125%)</option>
              </select>
            </div>
          </div>

          <div className="p-4 border border-[#D3D3D3] rounded-xl">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#000080]">Keyboard Shortcuts</h3>
                <p className="text-sm text-gray-600">Enable quick keyboard navigation</p>
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

      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h3 className="text-xl font-bold text-[#000080] mb-6">Keyboard Shortcuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#000080]">Search</span>
              <kbd className="px-2 py-1 bg-white border border-[#D3D3D3] rounded text-xs font-mono">/ </kbd>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-[#000080]">Command Bar</span>
              <kbd className="px-2 py-1 bg-white border border-[#D3D3D3] rounded text-xs font-mono">⌘K</kbd>
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
    <section className="space-y-6 fade-in">
      <div className="bg-white rounded-2xl shadow-sm border border-[#D3D3D3] p-8">
        <h2 className="text-2xl font-bold text-[#000080] mb-6 flex items-center">
          <i className="fa-solid fa-gavel text-[#ADD8E6] mr-3"></i>
          Legal & Compliance
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <a href="#" target="_blank" className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-file-contract text-[#ADD8E6]"></i>
              <span className="font-medium text-[#000080]">Terms of Service</span>
            </div>
            <i className="fa-solid fa-external-link text-[#ADD8E6]"></i>
          </a>
          <a href="#" target="_blank" className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-shield-check text-[#ADD8E6]"></i>
              <span className="font-medium text-[#000080]">Privacy Policy</span>
            </div>
            <i className="fa-solid fa-external-link text-[#ADD8E6]"></i>
          </a>
          <a href="#" target="_blank" className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-cookie-bite text-[#ADD8E6]"></i>
              <span className="font-medium text-[#000080]">Cookie Policy</span>
            </div>
            <i className="fa-solid fa-external-link text-[#ADD8E6]"></i>
          </a>
          <a href="#" target="_blank" className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-server text-[#ADD8E6]"></i>
              <span className="font-medium text-[#000080]">Subprocessors</span>
            </div>
            <i className="fa-solid fa-external-link text-[#ADD8E6]"></i>
          </a>
          <a href="#" target="_blank" className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl hover:bg-gray-50 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-lock text-[#ADD8E6]"></i>
              <span className="font-medium text-[#000080]">Security Overview</span>
            </div>
            <i className="fa-solid fa-external-link text-[#ADD8E6]"></i>
          </a>
          <div className="flex items-center justify-between p-4 border border-[#D3D3D3] rounded-xl">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-certificate text-[#ADD8E6]"></i>
              <span className="font-medium text-[#000080]">SOC2 Report</span>
            </div>
            <button className="btn-secondary px-4 py-1 rounded-lg font-semibold text-sm">Download</button>
          </div>
        </div>
      </div>
    </section>
  );
}

// Danger Section Component
function DangerSection() {
  const [companyName, setCompanyName] = useState('');
  const [email, setEmail] = useState('');
  const isDeleteEnabled = companyName === 'TechCorp Inc.' && email === 'john.smith@company.com';

  return (
    <section className="space-y-6 fade-in">
      <div className="danger-zone rounded-2xl shadow-sm p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-6 flex items-center">
          <i className="fa-solid fa-triangle-exclamation text-red-600 mr-3"></i>
          Danger Zone
        </h2>
        <div className="bg-white rounded-xl p-6 border border-red-200">
          <h3 className="text-xl font-bold text-red-800 mb-4">Delete Account</h3>
          <div className="space-y-4">
            <div className="p-4 bg-red-50 rounded-lg border border-red-200">
              <h4 className="font-semibold text-red-800 mb-2">⚠️ This action cannot be undone</h4>
              <ul className="text-sm text-red-700 space-y-1">
                <li>• All candidate data and messages will be permanently deleted</li>
                <li>• Your company profile and job postings will be removed</li>
                <li>• Team members will lose access to the account</li>
                <li>• Active subscriptions will be cancelled</li>
              </ul>
            </div>
            <div>
              <label className="block text-sm font-semibold text-red-800 mb-2">
                Type your company name to confirm: <strong>TechCorp Inc.</strong>
              </label>
              <input 
                type="text" 
                placeholder="TechCorp Inc." 
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                className="w-full px-4 py-3 border border-red-300 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500" 
              />
            </div>
            <div>
              <label className="block text-sm font-semibold text-red-800 mb-2">
                Type your email to confirm: <strong>john.smith@company.com</strong>
              </label>
              <input 
                type="email" 
                placeholder="john.smith@company.com" 
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full px-4 py-3 border border-red-300 rounded-xl focus:border-red-500 focus:ring-1 focus:ring-red-500" 
              />
            </div>
            <button 
              className={`btn-danger px-8 py-3 rounded-xl font-semibold ${!isDeleteEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
              disabled={!isDeleteEnabled}
            >
              Delete Account
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}
