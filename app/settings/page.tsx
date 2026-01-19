"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export default function SettingsPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState('account');
  const [showToast, setShowToast] = useState(false);
  const [toastMessage, setToastMessage] = useState('');

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }
  }, [user, loading, router]);

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

  if (!user || !profile) {
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
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center shadow-md">
              <svg width="20" height="20" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="white"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">HireMe</span>
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
                {[
                  { id: 'account', icon: 'user', label: 'Account' },
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
                ].map((tab) => (
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
            {activeTab === 'account' && <AccountSection toast={toast} />}
            {activeTab === 'security' && <SecuritySection toast={toast} />}
            {activeTab === 'privacy' && <PrivacySection toast={toast} />}
            {activeTab === 'notifications' && <NotificationsSection toast={toast} />}
            {activeTab === 'billing' && <BillingSection />}
            {activeTab === 'team' && <TeamSection toast={toast} />}
            {activeTab === 'company' && <CompanySection toast={toast} />}
            {activeTab === 'integrations' && <IntegrationsSection toast={toast} />}
            {activeTab === 'data' && <DataSection />}
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
function AccountSection({ toast }: { toast: (msg: string) => void }) {
  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <div className="flex items-center mb-6">
          <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center mr-4">
            <i className="fa-solid fa-user text-navy-700 text-xl"></i>
          </div>
          <h2 className="text-xl font-bold text-navy-900">Profile Information</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">First Name</label>
            <input type="text" defaultValue="John" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Last Name</label>
            <input type="text" defaultValue="Smith" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Work Email (Primary)</label>
            <input type="email" defaultValue="john.smith@company.com" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Phone (Optional)</label>
            <input type="tel" placeholder="+1 (555) 123-4567" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Timezone</label>
            <select className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 bg-white">
              <option>Eastern Time (ET)</option>
              <option>Central Time (CT)</option>
              <option>Mountain Time (MT)</option>
              <option>Pacific Time (PT)</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Avatar</label>
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 bg-sky-100 rounded-full flex items-center justify-center">
                <i className="fa-solid fa-user text-navy-700 text-xl"></i>
              </div>
              <button className="px-4 py-2 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold hover:bg-slate-50 transition-colors shadow-sm">Upload New</button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Login Settings</h3>
        <div className="space-y-6">
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Username</label>
            <input type="text" defaultValue="johnsmith" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
          </div>
          <div>
            <h4 className="font-semibold text-navy-900 mb-3">Connected Accounts</h4>
            <div className="space-y-3">
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <i className="fa-brands fa-google text-xl text-red-500"></i>
                  <span className="font-medium text-navy-900">Google</span>
                </div>
                <button className="text-red-500 hover:text-red-600 font-semibold transition-colors">Disconnect</button>
              </div>
              <div className="flex items-center justify-between p-4 border border-slate-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <i className="fa-brands fa-linkedin text-xl text-blue-600"></i>
                  <span className="font-medium text-navy-900">LinkedIn</span>
                </div>
                <button className="text-navy-900 hover:text-navy-600 font-semibold transition-colors">Connect</button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Session Management</h3>
        <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold hover:bg-slate-50 transition-colors shadow-sm">Sign out of other devices</button>
      </div>

      <div className="flex justify-end">
        <button onClick={() => toast('Changes saved successfully')} className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors">Save Changes</button>
      </div>
    </section>
  );
}

// Security Section Component
function SecuritySection({ toast }: { toast: (msg: string) => void }) {
  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-shield-halved text-sky-500 mr-3"></i>
          Password & Authentication
        </h2>
        <div className="space-y-6">
          <div>
            <h3 className="text-lg font-bold text-navy-900 mb-4">Change Password</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">Current Password</label>
                <input type="password" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">New Password</label>
                <input type="password" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
                <div className="mt-2 flex space-x-1">
                  <div className="h-1 w-full bg-[#D3D3D3] rounded"></div>
                  <div className="h-1 w-full bg-[#D3D3D3] rounded"></div>
                  <div className="h-1 w-full bg-[#D3D3D3] rounded"></div>
                  <div className="h-1 w-full bg-[#D3D3D3] rounded"></div>
                </div>
                <p className="text-xs text-slate-600 mt-1">Password strength: Weak</p>
              </div>
              <div>
                <label className="block text-sm font-medium text-navy-900 mb-2">Confirm New Password</label>
                <input type="password" className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
              </div>
            </div>
            <button onClick={() => toast('Password updated')} className="px-6 py-3 bg-navy-800 text-white rounded-lg font-semibold shadow-md hover:bg-navy-700 transition-colors mt-4">Update Password</button>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
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

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
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
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
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

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Do-Not-Contact List</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Add email or domain</label>
            <div className="flex space-x-2">
              <input type="text" placeholder="email@domain.com" className="flex-1 px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400" />
              <button onClick={() => toast('Added to list')} className="px-6 py-3 bg-navy-800 text-white rounded-lg font-semibold shadow-md hover:bg-navy-700 transition-colors">Add</button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2">
            <div className="flex items-center space-x-2 bg-sky-300/20 px-3 py-2 rounded-full">
              <span className="text-sm text-navy-900">competitor@company.com</span>
              <button className="text-red-500 hover:text-red-600">
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            </div>
            <div className="flex items-center space-x-2 bg-sky-300/20 px-3 py-2 rounded-full">
              <span className="text-sm text-navy-900">@blockedcompany.com</span>
              <button className="text-red-500 hover:text-red-600">
                <i className="fa-solid fa-times text-xs"></i>
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
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
function NotificationsSection({ toast }: { toast: (msg: string) => void }) {
  const [emailNotifs, setEmailNotifs] = useState([true, true, false, true]);
  const [inAppNotifs, setInAppNotifs] = useState([true, true, true, true]);

  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-bell text-sky-500 mr-3"></i>
          Notification Preferences
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <div>
            <h3 className="text-lg font-bold text-navy-900 mb-4">Email Notifications</h3>
            <div className="space-y-4">
              {['New candidate messages', 'Candidate applied/saved', 'Weekly talent digest', 'Account/billing alerts'].map((label, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-navy-900">{label}</span>
                  <div 
                    className={`toggle-switch ${emailNotifs[i] ? 'active' : ''} ${i === 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (i !== 3) {
                        const newNotifs = [...emailNotifs];
                        newNotifs[i] = !newNotifs[i];
                        setEmailNotifs(newNotifs);
                        toast('Setting saved');
                      }
                    }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
          <div>
            <h3 className="text-lg font-bold text-navy-900 mb-4">In-App Notifications</h3>
            <div className="space-y-4">
              {['New candidate messages', 'Candidate applied/saved', 'Weekly talent digest', 'Account/billing alerts'].map((label, i) => (
                <div key={i} className="flex items-center justify-between">
                  <span className="text-navy-900">{label}</span>
                  <div 
                    className={`toggle-switch ${inAppNotifs[i] ? 'active' : ''} ${i === 3 ? 'opacity-50 cursor-not-allowed' : ''}`}
                    onClick={() => {
                      if (i !== 3) {
                        const newNotifs = [...inAppNotifs];
                        newNotifs[i] = !newNotifs[i];
                        setInAppNotifs(newNotifs);
                        toast('Setting saved');
                      }
                    }}
                  ></div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Digest Settings</h3>
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Digest Frequency</label>
            <select className="w-full px-4 py-3 border border-slate-200 rounded-lg focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400">
              <option>Daily</option>
              <option>Weekly</option>
              <option>Off</option>
            </select>
          </div>
          <button onClick={() => toast('Test notification sent')} className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors rounded-lg font-semibold">Send Test Notification</button>
        </div>
      </div>
    </section>
  );
}

// Billing Section Component
function BillingSection() {
  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
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

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
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

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
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

// Team Section Component
function TeamSection({ toast }: { toast: (msg: string) => void }) {
  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
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
            <button onClick={() => toast('Invite sent')} className="px-6 py-3 bg-navy-800 text-white rounded-lg font-semibold shadow-md hover:bg-navy-700 transition-colors">Send Invite</button>
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
                  <span className="px-3 py-1 bg-navy-800/10 text-navy-900 rounded-full text-xs font-semibold">Owner</span>
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
                  <span className="px-3 py-1 bg-sky-300/20 text-navy-900 rounded-full text-xs font-semibold">Admin</span>
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

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
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

// Company Section Component
function CompanySection({ toast }: { toast: (msg: string) => void }) {
  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
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
              <div className="w-16 h-16 bg-sky-300/20 rounded-lg flex items-center justify-center">
                <i className="fa-solid fa-building text-navy-900 text-xl"></i>
              </div>
              <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors px-4 py-2 rounded-lg font-semibold">Upload Logo</button>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-navy-900 mb-2">Company Banner</label>
            <div className="w-full h-32 bg-sky-300/20 rounded-lg flex items-center justify-center border-2 border-dashed border-[#ADD8E6]">
              <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors px-4 py-2 rounded-lg font-semibold">Upload Banner</button>
            </div>
          </div>
        </div>
        <div className="mt-6 flex justify-between items-center">
          <button className="px-6 py-3 bg-white border border-slate-200 text-navy-900 rounded-lg font-semibold shadow-sm hover:bg-slate-50 transition-colors rounded-lg font-semibold">Open Full Editor</button>
          <button onClick={() => toast('Changes saved')} className="px-8 py-4 bg-navy-800 text-white rounded-lg font-semibold text-lg shadow-md hover:bg-navy-700 transition-colors px-8 py-3 rounded-lg font-semibold">Save Changes</button>
        </div>
      </div>
    </section>
  );
}

// Integrations Section Component
function IntegrationsSection({ toast }: { toast: (msg: string) => void }) {
  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
          <i className="fa-solid fa-plug text-sky-500 mr-3"></i>
          Integrations & Connections
        </h2>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="p-6 border border-slate-200 rounded-lg hover:shadow-2xl transition-shadow">
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

          <div className="p-6 border border-slate-200 rounded-lg hover:shadow-2xl transition-shadow">
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

          <div className="p-6 border border-slate-200 rounded-lg hover:shadow-2xl transition-shadow">
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

          <div className="p-6 border border-slate-200 rounded-lg hover:shadow-2xl transition-shadow">
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

// Data Section Component
function DataSection() {
  return (
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
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

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
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
    <section className="space-y-8">
      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h2 className="text-2xl font-bold text-navy-900 mb-6 flex items-center">
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

      <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8">
        <h3 className="text-xl font-bold text-navy-900 mb-6">Keyboard Shortcuts</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center justify-between">
              <span className="text-sm text-navy-900">Search</span>
              <kbd className="px-2 py-1 bg-white border border-slate-200 rounded text-xs font-mono">/ </kbd>
            </div>
          </div>
          <div className="p-3 bg-gray-50 rounded-lg">
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
          <a href="/terms/candidates" className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-file-contract text-sky-500"></i>
              <span className="font-medium text-navy-900">Terms of Service</span>
            </div>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
          <a href="#" target="_blank" className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-shield-check text-sky-500"></i>
              <span className="font-medium text-navy-900">Privacy Policy</span>
            </div>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
          <a href="/terms/cookie" className="flex items-center justify-between p-4 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors">
            <div className="flex items-center space-x-3">
              <i className="fa-solid fa-cookie-bite text-sky-500"></i>
              <span className="font-medium text-navy-900">Cookie Policy</span>
            </div>
            <i className="fa-solid fa-external-link text-sky-500"></i>
          </a>
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
    <section className="space-y-8">
      <div className="danger-zone rounded-2xl shadow-sm p-8">
        <h2 className="text-2xl font-bold text-red-800 mb-6 flex items-center">
          <i className="fa-solid fa-triangle-exclamation text-red-600 mr-3"></i>
          Danger Zone
        </h2>
        <div className="bg-white rounded-lg p-6 border border-red-200">
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
                className="w-full px-4 py-3 border border-red-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500" 
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
                className="w-full px-4 py-3 border border-red-300 rounded-lg focus:border-red-500 focus:ring-1 focus:ring-red-500" 
              />
            </div>
            <button 
              className={`px-8 py-3 bg-red-600 text-white rounded-lg font-semibold shadow-md hover:bg-red-700 transition-colors px-8 py-3 rounded-lg font-semibold ${!isDeleteEnabled ? 'opacity-50 cursor-not-allowed' : ''}`}
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
