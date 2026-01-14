"use client";
import { useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { useRouter } from 'next/navigation';
import { getProfileViewers } from '@/lib/firebase-firestore';
import Link from 'next/link';
import { ArrowLeft, Building, Search, Filter, Lock, Eye, Clock } from 'lucide-react';

// Mock data structure matching the HTML design
interface Company {
  id: string;
  name: string;
  domain: string;
  description: string;
  viewedAt: string;
  visits: number;
  isNew?: boolean;
  isSaved?: boolean;
  avatarBg: 'navy' | 'light-blue';
  initials: string;
}

export default function ProfileViewersPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [viewers, setViewers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [companies, setCompanies] = useState<Company[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortOption, setSortOption] = useState('Most recent');
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [selectedCompany, setSelectedCompany] = useState<Company | null>(null);
  const [activeFilters, setActiveFilters] = useState(['Last 7 days', 'New viewers']);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/auth/login');
      return;
    }
  }, [loading, user, router]);

  useEffect(() => {
    const load = async () => {
      if (!user) return;
      setIsLoading(true);
      const { viewers } = await getProfileViewers(user.uid);
      setViewers(viewers);
      
      // Transform real viewer data into the display format
      const transformedCompanies: Company[] = viewers.map((viewer: any, index: number) => {
        const companyName = viewer.companyName || `${viewer.firstName || ''} ${viewer.lastName || ''}`.trim() || 'Company';
        const initials = companyName
          .split(' ')
          .map((word: string) => word[0])
          .join('')
          .toUpperCase()
          .slice(0, 2);
        
        return {
          id: viewer.id || viewer.uid || `viewer-${index}`,
          name: companyName,
          domain: viewer.website || viewer.email?.split('@')[1] || '',
          description: viewer.companyDescription || viewer.bio || 'No description available.',
          viewedAt: 'Recently',
          visits: 1,
          avatarBg: index % 2 === 0 ? 'navy' : 'light-blue',
          initials: initials || 'CO',
          isSaved: false
        };
      });
      
      setCompanies(transformedCompanies);
      setIsLoading(false);
    };
    load();
  }, [user]);

  const toggleSave = (companyId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setCompanies(prev => prev.map(c => 
      c.id === companyId ? { ...c, isSaved: !c.isSaved } : c
    ));
    
    const company = companies.find(c => c.id === companyId);
    if (company?.isSaved) {
      showToast('Removed from saved companies', 'info');
    } else {
      showToast('Saved to companies', 'success');
    }
  };

  const openDrawer = (company: Company) => {
    setSelectedCompany(company);
    setDrawerOpen(true);
  };

  const closeDrawer = () => {
    setDrawerOpen(false);
    setTimeout(() => setSelectedCompany(null), 200);
  };

  const removeFilter = (filter: string) => {
    setActiveFilters(prev => prev.filter(f => f !== filter));
  };

  const showToast = (message: string, type: 'success' | 'info') => {
    const toastContainer = document.getElementById('toast-container');
    if (!toastContainer) return;
    
    const toast = document.createElement('div');
    toast.className = 'toast bg-white border border-slate-200 rounded-xl px-4 py-3 shadow-lg flex items-center space-x-3';
    
    const iconClass = type === 'success' ? 'fa-check text-green-500' : 'fa-info text-sky-400';
    toast.innerHTML = `
      <i class="fa-solid ${iconClass}"></i>
      <span class="font-semibold text-navy">${message}</span>
    `;
    
    toastContainer.appendChild(toast);
    
    setTimeout(() => {
      toast.style.opacity = '0';
      toast.style.transform = 'translateY(-100%)';
      setTimeout(() => toast.remove(), 300);
    }, 3000);
  };

  if (loading || isLoading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-navy-800 mx-auto mb-4"></div>
          <p className="text-slate-600">Loading companies...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/home/seeker"
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-colors group px-3 py-2 rounded-lg hover:bg-sky-50 min-h-[44px]"
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

      <main className="max-w-7xl mx-auto px-6 py-12 lg:py-16">
        {/* Page Header */}
        <div className="text-center mb-12 lg:mb-14">
          <div className="flex items-center justify-center mb-4">
            <div className="w-12 h-12 bg-sky-100 rounded-lg flex items-center justify-center">
              <Building className="h-6 w-6 text-navy-700" />
            </div>
          </div>
          <h1 className="text-3xl sm:text-4xl lg:text-5xl font-bold text-navy-900 mb-4 tracking-tight">Companies that viewed your profile</h1>
          <p className="text-base sm:text-lg lg:text-xl text-slate-600 max-w-2xl mx-auto leading-relaxed mb-6">See who's interested in you and follow up confidently.</p>
          <div className="inline-flex items-center gap-2 bg-sky-50 px-4 py-2 rounded-full border border-sky-100 mb-4">
            <Lock className="h-4 w-4 text-navy-700" />
            <span className="text-sm font-semibold text-navy-900">Private to you</span>
          </div>
          <p className="text-sm text-slate-500 mb-4">Only you can see this list. Employers are not notified when you view this page.</p>
          <Link href="/home/seeker/profile-views/interviews" className="text-sm font-semibold text-navy-800 hover:text-navy-600 transition-colors inline-flex items-center gap-1">
            How to turn views into interviews
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </Link>
        </div>

        {/* Toolbar */}
        <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-6 mb-8 sticky top-20 z-40">
          <div className="flex flex-col lg:flex-row gap-4 items-stretch lg:items-center">
            <div className="flex-1">
              <div className="relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 h-5 w-5 text-slate-400" />
                <input 
                  type="text" 
                  placeholder="Search by company name or domain..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 text-navy-900 placeholder-slate-400"
                />
              </div>
            </div>
            
            <div className="flex gap-3">
              <button className="flex items-center justify-center gap-2 px-4 py-3 border border-slate-200 rounded-lg hover:bg-slate-50 transition-colors font-semibold text-navy-900">
                <Filter className="h-4 w-4" />
                <span>Filters</span>
              </button>
              
              <select 
                value={sortOption}
                onChange={(e) => setSortOption(e.target.value)}
                className="px-4 py-3 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-sky-200 focus:border-sky-400 font-semibold text-navy-900 bg-white"
              >
                <option>Most recent</option>
                <option>Most views</option>
                <option>A–Z</option>
              </select>
            </div>
          </div>

          {/* Active Filters */}
          {activeFilters.length > 0 && (
            <div className="mt-4 flex flex-wrap gap-2">
              {activeFilters.map(filter => (
                <div key={filter} className="flex items-center gap-2 bg-sky-50 px-3 py-1.5 rounded-full border border-sky-100">
                  <span className="text-sm font-semibold text-navy-900">{filter}</span>
                  <button 
                    onClick={() => removeFilter(filter)}
                    className="text-slate-400 hover:text-red-500 transition-colors"
                  >
                    <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                    </svg>
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Company Results */}
        <div className="space-y-6">
          {companies.length === 0 ? (
            <div className="bg-white rounded-2xl shadow-xl border border-slate-100 p-12 text-center">
              <div className="w-20 h-20 mx-auto bg-sky-100 rounded-full flex items-center justify-center mb-6">
                <Building className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-navy-900 mb-4">No companies yet</h3>
              <p className="text-slate-600 leading-relaxed max-w-md mx-auto">
                No companies have viewed your profile yet. Keep your profile updated and complete to attract more employers.
              </p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {companies.map((company) => (
                  <div 
                    key={company.id}
                    onClick={() => openDrawer(company)}
                    className="bg-white rounded-2xl shadow-xl border border-slate-100 p-8 hover:shadow-2xl transition-shadow duration-300 cursor-pointer"
                    tabIndex={0}
                  >
                    <div className="flex items-start gap-4">
                      <div className={`w-14 h-14 ${company.avatarBg === 'navy' ? 'bg-navy-800' : 'bg-sky-100'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <span className={`font-bold text-lg ${company.avatarBg === 'navy' ? 'text-white' : 'text-navy-900'}`}>{company.initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-xl font-bold text-navy-900 truncate mb-1">{company.name}</h3>
                            <p className="text-sm text-slate-500 mb-3">{company.domain}</p>
                            <p className="text-sm text-slate-600 line-clamp-2 leading-relaxed">{company.description}</p>
                          </div>
                          <button 
                            onClick={(e) => toggleSave(company.id, e)}
                            className={`ml-4 p-2 transition-colors ${company.isSaved ? 'text-red-500 hover:text-red-600' : 'text-slate-400 hover:text-red-500'}`}
                          >
                            <svg className="w-5 h-5" fill={company.isSaved ? "currentColor" : "none"} stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                            </svg>
                          </button>
                        </div>
                        
                        <div className="flex items-center gap-4 mb-6 text-xs text-slate-500">
                          <div className="flex items-center gap-1.5">
                            <Clock className="h-3.5 w-3.5" />
                            <span>{company.viewedAt}</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Eye className="h-3.5 w-3.5" />
                            <span>{company.visits} visit{company.visits !== 1 ? 's' : ''}</span>
                          </div>
                          {company.isNew && (
                            <div className="bg-sky-50 px-2 py-1 rounded-full border border-sky-100">
                              <span className="text-xs font-semibold text-navy-900">NEW</span>
                            </div>
                          )}
                        </div>
                        
                        <button className="bg-navy-800 hover:bg-navy-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors shadow-md">
                          View Company
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Load More - Only show if there are companies */}
              {companies.length > 0 && (
                <div className="text-center py-8">
                  <div className="text-slate-600">
                    <span className="font-semibold">Showing {companies.length} {companies.length === 1 ? 'company' : 'companies'}</span>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </main>

      {/* Detail Drawer */}
      {drawerOpen && selectedCompany && (
        <>
          <div 
            className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50"
            onClick={closeDrawer}
          />
          <div className="fixed inset-y-0 right-0 w-full sm:w-96 bg-white shadow-2xl z-50 overflow-y-auto">
            <div className="p-6 border-b border-slate-100 sticky top-0 bg-white">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-bold text-navy-900">Company Details</h2>
                <button 
                  onClick={closeDrawer}
                  className="p-2 text-slate-400 hover:text-navy-900 transition-colors rounded-lg hover:bg-slate-50"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>
            
            <div className="p-6 space-y-6">
              <div className="flex items-center gap-4">
                <div className={`w-16 h-16 ${selectedCompany.avatarBg === 'navy' ? 'bg-navy-800' : 'bg-sky-100'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                  <span className={`font-bold text-xl ${selectedCompany.avatarBg === 'navy' ? 'text-white' : 'text-navy-900'}`}>{selectedCompany.initials}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy-900">{selectedCompany.name}</h3>
                  <p className="text-slate-500">{selectedCompany.domain}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-navy-900 mb-2">Description</h4>
                <p className="text-slate-600 leading-relaxed">{selectedCompany.description}</p>
              </div>
              
              <div>
                <h4 className="font-bold text-navy-900 mb-3">Recent Activity</h4>
                <div className="space-y-3">
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-sky-500 rounded-full"></div>
                    <span className="text-slate-600">Viewed your profile - 2 hours ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    <span className="text-slate-600">Viewed your profile - 2 days ago</span>
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    <div className="w-2 h-2 bg-slate-300 rounded-full"></div>
                    <span className="text-slate-600">Viewed your profile - 1 week ago</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-bold text-navy-900 mb-3">Shared Interests</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-sky-50 border border-sky-100 text-navy-900 px-3 py-1.5 rounded-full text-sm font-semibold">JavaScript</span>
                  <span className="bg-sky-50 border border-sky-100 text-navy-900 px-3 py-1.5 rounded-full text-sm font-semibold">React</span>
                  <span className="bg-sky-50 border border-sky-100 text-navy-900 px-3 py-1.5 rounded-full text-sm font-semibold">Cloud</span>
                </div>
              </div>
              
              <div className="pt-6 border-t border-slate-100">
                <button 
                  onClick={() => {
                    if (selectedCompany?.id) {
                      router.push(`/company/${selectedCompany.id}`);
                    }
                  }}
                  className="w-full bg-navy-800 hover:bg-navy-700 text-white py-3 rounded-lg font-semibold transition-colors shadow-md"
                >
                  View Company Profile
                </button>
              </div>
            </div>
          </div>
        </>
      )}

      {/* Toast Container */}
      <div id="toast-container" className="fixed top-24 right-6 z-50 space-y-2"></div>
    </div>
  );
}
