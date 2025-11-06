"use client";
import { useEffect, useState } from 'react';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { useRouter } from 'next/navigation';
import { getProfileViewers } from '@/lib/firebase-firestore';
import Link from 'next/link';

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
    toast.className = 'toast bg-white border border-light-gray rounded-xl px-4 py-3 shadow-lg flex items-center space-x-3';
    
    const iconClass = type === 'success' ? 'fa-check text-green-500' : 'fa-info text-light-blue';
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

  if (!user) return null;

  return (
    <>
      <style jsx global>{`
        .card-hover {
          transition: transform 0.2s ease, box-shadow 0.2s ease;
        }
        .card-hover:hover {
          transform: translateY(-3px);
          box-shadow: 0 10px 20px rgba(0, 0, 128, 0.08), 0 3px 6px rgba(0, 0, 128, 0.04);
        }
        .fade-up {
          opacity: 0;
          transform: translateY(10px);
          animation: fadeUp 220ms ease-out forwards;
        }
        .fade-up-delay-1 { animation-delay: 50ms; }
        .fade-up-delay-2 { animation-delay: 100ms; }
        .fade-up-delay-3 { animation-delay: 150ms; }
        .fade-up-delay-4 { animation-delay: 200ms; }
        .fade-up-delay-5 { animation-delay: 250ms; }
        .fade-up-delay-6 { animation-delay: 300ms; }
        @keyframes fadeUp {
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
        .save-pulse {
          animation: savePulse 0.3s ease-out;
        }
        @keyframes savePulse {
          0% { transform: scale(1); }
          50% { transform: scale(1.1); }
          100% { transform: scale(1); }
        }
        .drawer-enter {
          animation: drawerEnter 200ms ease-out;
        }
        @keyframes drawerEnter {
          from {
            opacity: 0;
            transform: translateX(100%);
          }
          to {
            opacity: 1;
            transform: translateX(0);
          }
        }
        .toast {
          animation: toastSlide 300ms ease-out;
        }
        @keyframes toastSlide {
          from {
            opacity: 0;
            transform: translateY(-100%);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>

      <div style={{ background: 'linear-gradient(180deg, #E6F0FF 0%, #F0F8FF 100%)' }}>
        {/* Header */}
        <header className="bg-white/80 backdrop-blur-md sticky top-0 z-50 border-b border-light-gray">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-20">
              <div className="flex items-center space-x-6">
                <Link 
                  href="/home/seeker"
                  className="flex items-center space-x-2 text-navy hover:text-light-blue transition-colors duration-200 bg-light-blue/20 hover:bg-light-blue/30 px-4 py-2 rounded-full"
                >
                  <i className="fa-solid fa-arrow-left"></i>
                  <span className="font-semibold">Back to Dashboard</span>
                </Link>
              </div>
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-navy rounded-xl flex items-center justify-center">
                  <i className="fa-solid fa-magnifying-glass text-white text-lg"></i>
                </div>
                <span className="text-2xl font-bold text-navy">HireMe</span>
              </div>
            </div>
          </div>
        </header>

        <main className="min-h-screen mobile-safe-top mobile-safe-bottom overflow-x-hidden w-full">
          <div className="w-full md:max-w-6xl md:mx-auto px-0 sm:px-3 md:px-6 lg:px-8 py-4 sm:py-6 md:py-12 min-w-0">
            {/* Page Header */}
            <section className="mb-4 sm:mb-6 md:mb-10 fade-up px-2 sm:px-0">
              <div className="text-center mb-4 sm:mb-6 md:mb-8">
                <h1 className="text-2xl sm:text-3xl md:text-4xl font-bold text-navy mb-3 sm:mb-4 px-4 break-words">Companies that viewed your profile</h1>
                <p className="text-sm sm:text-base md:text-lg text-gray-600 mb-3 sm:mb-4 px-4 break-words">See who's interested in you and follow up confidently.</p>
                <div className="inline-flex items-center space-x-2 bg-light-blue/20 px-3 sm:px-4 py-2 rounded-full border border-light-blue/30">
                  <i className="fa-solid fa-lock text-navy text-xs sm:text-sm"></i>
                  <span className="text-xs sm:text-sm font-semibold text-navy">Private to you</span>
                </div>
              </div>
              <div className="text-center mb-4 sm:mb-6 px-2">
                <p className="text-xs sm:text-sm text-gray-500 break-words">Only you can see this list. Employers are not notified when you view this page.</p>
                <button className="text-light-blue hover:text-navy text-xs sm:text-sm font-semibold underline decoration-2 underline-offset-4 mt-2 min-h-[44px]">
                  How to turn views into interviews →
                </button>
              </div>
            </section>

            {/* Toolbar */}
            <section className="sticky top-16 sm:top-20 md:top-24 z-40 bg-white/90 backdrop-blur-md p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray mb-3 sm:mb-6 md:mb-8 fade-up fade-up-delay-1 mobile-safe-top">
              <div className="flex flex-col lg:flex-row gap-4 items-center justify-between">
                <div className="flex-1 w-full lg:w-auto">
                  <div className="relative">
                    <i className="fa-solid fa-search absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400"></i>
                    <input 
                      type="text" 
                      placeholder="Search by company name or domain..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      className="w-full pl-10 sm:pl-12 pr-4 py-3 text-base border border-light-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-light-blue focus:border-transparent min-h-[44px]"
                    />
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2 sm:gap-4 w-full sm:w-auto">
                  <button className="flex items-center justify-center space-x-2 px-4 py-3 border border-light-gray rounded-xl hover:bg-light-blue/10 transition-colors min-h-[44px] text-sm sm:text-base w-full sm:w-auto">
                    <i className="fa-solid fa-filter text-navy"></i>
                    <span className="font-semibold text-navy">Filters</span>
                  </button>
                  
                  <select 
                    value={sortOption}
                    onChange={(e) => setSortOption(e.target.value)}
                    className="px-4 py-3 text-base border border-light-gray rounded-xl focus:outline-none focus:ring-2 focus:ring-light-blue font-semibold text-navy min-h-[44px] w-full sm:w-auto"
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
                    <div key={filter} className="flex items-center space-x-2 bg-light-blue/20 px-3 py-1 rounded-full border border-light-blue/30">
                      <span className="text-sm font-semibold text-navy">{filter}</span>
                      <button 
                        onClick={() => removeFilter(filter)}
                        className="text-navy hover:text-red-500"
                      >
                        <i className="fa-solid fa-times text-xs"></i>
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </section>

            {/* Company Results */}
            <section className="space-y-6">
              {isLoading ? (
                <div className="w-full min-w-0 text-center py-12 px-2 sm:px-0">
                  <div className="animate-spin rounded-full h-10 w-10 sm:h-12 sm:w-12 border-b-2 border-navy mx-auto mb-4"></div>
                  <p className="text-sm sm:text-base text-gray-600">Loading companies...</p>
                </div>
              ) : companies.length === 0 ? (
                <div className="w-full min-w-0 text-center py-12 sm:py-16 bg-white/90 backdrop-blur-sm rounded-none sm:rounded-xl md:rounded-2xl border-x-0 sm:border border-light-gray px-4">
                  <div className="w-16 h-16 sm:w-20 sm:h-20 mx-auto mb-4 sm:mb-6 bg-light-blue/20 rounded-full flex items-center justify-center">
                    <i className="fa-solid fa-building text-navy text-2xl sm:text-3xl"></i>
                  </div>
                  <h3 className="text-xl sm:text-2xl font-bold text-navy mb-3 break-words">No companies yet</h3>
                  <p className="text-sm sm:text-base text-gray-600 max-w-md mx-auto break-words">
                    No companies have viewed your profile yet. Keep your profile updated and complete to attract more employers.
                  </p>
                </div>
              ) : (
                <>
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4 md:gap-6">
                    {companies.map((company, index) => (
                  <div 
                    key={company.id}
                    onClick={() => openDrawer(company)}
                    className={`w-full min-w-0 bg-white/90 backdrop-blur-sm p-4 sm:p-5 md:p-6 rounded-none sm:rounded-xl md:rounded-2xl shadow-sm border-x-0 sm:border border-light-gray card-hover cursor-pointer fade-up fade-up-delay-${index + 2} mb-3 sm:mb-0`}
                    tabIndex={0}
                  >
                    <div className="flex items-start space-x-4">
                      <div className={`w-14 h-14 ${company.avatarBg === 'navy' ? 'bg-navy' : 'bg-light-blue'} rounded-xl flex items-center justify-center flex-shrink-0`}>
                        <span className="text-white font-bold text-lg">{company.initials}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex-1 min-w-0">
                            <h3 className="text-lg font-bold text-navy truncate">{company.name}</h3>
                            <p className="text-sm text-gray-500 mb-2">{company.domain}</p>
                            <p className="text-sm text-gray-600 line-clamp-2">{company.description}</p>
                          </div>
                          <button 
                            onClick={(e) => toggleSave(company.id, e)}
                            className={`ml-4 p-2 transition-colors save-toggle ${company.isSaved ? 'text-red-500 hover:text-gray-400' : 'text-gray-400 hover:text-red-500'}`}
                          >
                            <i className={`${company.isSaved ? 'fa-solid' : 'fa-regular'} fa-heart text-lg`}></i>
                          </button>
                        </div>
                        
                        <div className="flex items-center space-x-4 mb-4 text-xs text-gray-500">
                          <div className="flex items-center space-x-1">
                            <i className="fa-solid fa-clock"></i>
                            <span>{company.viewedAt}</span>
                          </div>
                          <div className="flex items-center space-x-1">
                            <i className="fa-solid fa-eye"></i>
                            <span>{company.visits} visit{company.visits !== 1 ? 's' : ''}</span>
                          </div>
                          {company.isNew && (
                            <div className="bg-light-blue/20 px-2 py-1 rounded-full">
                              <span className="text-xs font-semibold text-navy">NEW</span>
                            </div>
                          )}
                        </div>
                        
                        <div className="flex items-center justify-between">
                          <button className="bg-navy hover:bg-navy/90 text-white px-6 py-2 rounded-xl font-semibold transition-colors">
                            View Company
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                    ))}
                  </div>

                  {/* Load More - Only show if there are companies */}
                  {companies.length > 0 && (
                    <div className="text-center py-8 fade-up fade-up-delay-6">
                      <div className="text-gray-500 mb-4">
                        <span className="font-semibold">Showing {companies.length} {companies.length === 1 ? 'company' : 'companies'}</span>
                      </div>
                    </div>
                  )}
                </>
              )}
            </section>
          </div>
        </main>

        {/* Detail Drawer */}
        <div 
          className={`fixed inset-y-0 right-0 w-96 bg-white shadow-2xl z-50 transition-transform duration-200 ${drawerOpen ? 'translate-x-0 drawer-enter' : 'translate-x-full'} ${!drawerOpen && !selectedCompany ? 'hidden' : ''}`}
        >
          <div className="p-6 border-b border-light-gray">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-bold text-navy">Company Details</h2>
              <button 
                onClick={closeDrawer}
                className="p-2 text-gray-400 hover:text-navy transition-colors"
              >
                <i className="fa-solid fa-times text-lg"></i>
              </button>
            </div>
          </div>
          
          {selectedCompany && (
            <div className="p-6 space-y-6">
              <div className="flex items-center space-x-4">
                <div className={`w-16 h-16 ${selectedCompany.avatarBg === 'navy' ? 'bg-navy' : 'bg-light-blue'} rounded-xl flex items-center justify-center`}>
                  <span className="text-white font-bold text-xl">{selectedCompany.initials}</span>
                </div>
                <div>
                  <h3 className="text-lg font-bold text-navy">{selectedCompany.name}</h3>
                  <p className="text-gray-500">{selectedCompany.domain}</p>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-navy mb-2">Description</h4>
                <p className="text-gray-600 leading-relaxed">{selectedCompany.description}</p>
              </div>
              
              <div>
                <h4 className="font-semibold text-navy mb-3">Recent Activity</h4>
                <div className="space-y-2">
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-light-blue rounded-full"></div>
                    <span className="text-gray-600">Viewed your profile - 2 hours ago</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-gray-600">Viewed your profile - 2 days ago</span>
                  </div>
                  <div className="flex items-center space-x-3 text-sm">
                    <div className="w-2 h-2 bg-gray-300 rounded-full"></div>
                    <span className="text-gray-600">Viewed your profile - 1 week ago</span>
                  </div>
                </div>
              </div>
              
              <div>
                <h4 className="font-semibold text-navy mb-3">Shared Interests</h4>
                <div className="flex flex-wrap gap-2">
                  <span className="bg-light-blue/20 text-navy px-3 py-1 rounded-full text-sm font-semibold">JavaScript</span>
                  <span className="bg-light-blue/20 text-navy px-3 py-1 rounded-full text-sm font-semibold">React</span>
                  <span className="bg-light-blue/20 text-navy px-3 py-1 rounded-full text-sm font-semibold">Cloud</span>
                </div>
              </div>
              
              <div className="space-y-3 pt-6 border-t border-light-gray">
                <button className="w-full bg-navy hover:bg-navy/90 text-white py-3 rounded-xl font-semibold transition-colors">
                  View Company Profile
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Toast Container */}
        <div id="toast-container" className="fixed top-24 right-6 z-50 space-y-2"></div>

        {/* Drawer Overlay */}
        {drawerOpen && (
          <div 
            className="fixed inset-0 bg-black/20 z-40"
            onClick={closeDrawer}
          />
        )}
      </div>
    </>
  );
}
