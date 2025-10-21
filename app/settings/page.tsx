"use client";
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { ArrowLeft, FileText, X, Trash2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useToast } from '@/components/NotificationSystem';

export default function SettingsPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const toast = useToast();
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }
  }, [user, loading, router]);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || !profile) {
    return null; // Will redirect to login
  }

  // Determine dashboard URL based on role
  const dashboardUrl = profile.role === 'JOB_SEEKER' 
    ? '/home/seeker' 
    : profile.role === 'EMPLOYER' || profile.role === 'RECRUITER'
    ? '/home/employer'
    : '/';

  const handleDeleteAccount = async () => {
    if (!user) return;
    
    setIsDeleting(true);
    try {
      // Get Firebase ID token
      const token = await user.getIdToken();
      
      // Call delete account API
      const response = await fetch('/api/auth/delete-account', {
        method: 'DELETE',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
      });

      if (response.ok) {
        // Account deleted successfully
        toast.success('Account Deleted', 'Your account has been deleted successfully.');
        router.push('/');
      } else {
        const error = await response.json();
        toast.error('Delete Failed', error.message || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error deleting account:', error);
      toast.error('Delete Failed', 'Failed to delete account. Please try again.');
    } finally {
      setIsDeleting(false);
      setShowDeleteModal(false);
    }
  };

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50">
      <div className="max-w-4xl mx-auto p-6 py-12">
        <Link 
          href={dashboardUrl}
          className="inline-flex items-center px-4 py-2 bg-blue-50 text-navy-800 rounded-full hover:bg-blue-100 hover:shadow-sm transition-all duration-200 mb-6"
        >
          <ArrowLeft className="h-4 w-4 mr-2" />
          Back to Dashboard
        </Link>

        <h1 className="text-3xl font-bold text-gray-900 mb-8">Settings</h1>

        {/* Settings Options */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <div className="space-y-4">
            <button
              onClick={() => setShowTermsModal(true)}
              className="flex items-center p-4 bg-blue-50 rounded-lg hover:bg-blue-100 transition-colors w-full text-left"
            >
              <FileText className="h-5 w-5 text-blue-600 mr-3" />
              <div>
                <h3 className="text-blue-800 font-medium">Terms of Service</h3>
                <p className="text-sm text-blue-600">View our terms and conditions</p>
              </div>
            </button>
            
            <button
              onClick={() => setShowDeleteModal(true)}
              className="flex items-center p-4 bg-red-50 rounded-lg hover:bg-red-100 transition-colors w-full text-left"
            >
              <Trash2 className="h-5 w-5 text-red-600 mr-3" />
              <div>
                <h3 className="text-red-800 font-medium">Delete Account</h3>
                <p className="text-sm text-red-600">Permanently delete your account and all data</p>
              </div>
            </button>
          </div>
        </div>

        {/* Terms of Service Modal */}
        {showTermsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-4xl w-full max-h-[90vh] overflow-hidden">
              <div className="flex items-center justify-between p-6 border-b">
                <h2 className="text-2xl font-bold text-gray-900">Terms of Service</h2>
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <X className="h-5 w-5 text-gray-500" />
                </button>
              </div>
              
              <div className="p-6 overflow-y-auto max-h-[calc(90vh-120px)]">
                <div className="prose max-w-none">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Last Updated: {new Date().toLocaleDateString()}</h3>
                  
                  <div className="space-y-6">
                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">1. Acceptance of Terms</h4>
                      <p className="text-gray-700 leading-relaxed">
                        By accessing and using HireMe ("the Service"), you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
                      </p>
                    </section>

                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">2. Description of Service</h4>
                      <p className="text-gray-700 leading-relaxed">
                        HireMe is a web application that connects job seekers with employers. The platform allows candidates to create profiles and enables employers to search and filter candidates based on various criteria including skills, education, and career interests.
                      </p>
                    </section>

                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">3. User Accounts</h4>
                      <p className="text-gray-700 leading-relaxed">
                        You are responsible for maintaining the confidentiality of your account and password. You agree to accept responsibility for all activities that occur under your account or password.
                      </p>
                    </section>

                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">4. User Content</h4>
                      <p className="text-gray-700 leading-relaxed">
                        You retain ownership of any content you submit to the Service. By submitting content, you grant HireMe a license to use, display, and distribute your content in connection with the Service.
                      </p>
                    </section>

                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">5. Privacy</h4>
                      <p className="text-gray-700 leading-relaxed">
                        Your privacy is important to us. Please review our Privacy Policy, which also governs your use of the Service, to understand our practices.
                      </p>
                    </section>

                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">6. Prohibited Uses</h4>
                      <p className="text-gray-700 leading-relaxed mb-3">You may not use our Service:</p>
                      <ul className="list-disc list-inside text-gray-700 space-y-1 ml-4">
                        <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
                        <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
                        <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
                        <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
                        <li>To submit false or misleading information</li>
                        <li>To upload or transmit viruses or any other type of malicious code</li>
                      </ul>
                    </section>

                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">7. Termination</h4>
                      <p className="text-gray-700 leading-relaxed">
                        We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability, under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
                      </p>
                    </section>

                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">8. Disclaimer</h4>
                      <p className="text-gray-700 leading-relaxed">
                        The information on this Service is provided on an "as is" basis. To the fullest extent permitted by law, this Company excludes all representations, warranties, conditions and terms relating to our Service and the use of this Service.
                      </p>
                    </section>

                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">9. Governing Law</h4>
                      <p className="text-gray-700 leading-relaxed">
                        These Terms shall be interpreted and governed by the laws of the United States. Our failure to enforce any right or provision of these Terms will not be considered a waiver of those rights.
                      </p>
                    </section>

                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">10. Changes to Terms</h4>
                      <p className="text-gray-700 leading-relaxed">
                        We reserve the right, at our sole discretion, to modify or replace these Terms at any time. If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
                      </p>
                    </section>

                    <section>
                      <h4 className="text-lg font-semibold text-gray-900 mb-3">11. Contact Information</h4>
                      <p className="text-gray-700 leading-relaxed">
                        If you have any questions about these Terms of Service, please contact us at support@hireme.com.
                      </p>
                    </section>
                  </div>
                </div>
              </div>
              
              <div className="flex justify-end p-6 border-t">
                <button
                  onClick={() => setShowTermsModal(false)}
                  className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Account Confirmation Modal */}
        {showDeleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-xl shadow-xl max-w-md w-full">
              <div className="p-6">
                <div className="flex items-center mb-4">
                  <div className="flex-shrink-0">
                    <AlertTriangle className="h-8 w-8 text-red-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
                  </div>
                </div>
                
                <div className="mb-6">
                  <p className="text-sm text-gray-600 mb-3">
                    Are you sure you want to delete your account? This action cannot be undone.
                  </p>
                  <p className="text-sm text-gray-600">
                    This will permanently delete:
                  </p>
                  <ul className="list-disc list-inside text-sm text-gray-600 mt-2 ml-4">
                    <li>Your profile and all personal information</li>
                    <li>Your messages and conversations</li>
                    <li>Your endorsements</li>
                    <li>All your uploaded files (resume, profile picture, etc.)</li>
                    <li>Your account login credentials</li>
                  </ul>
                </div>
                
                <div className="flex space-x-3">
                  <button
                    onClick={() => setShowDeleteModal(false)}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors disabled:opacity-50"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleDeleteAccount}
                    disabled={isDeleting}
                    className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors disabled:opacity-50 flex items-center justify-center"
                  >
                    {isDeleting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Deleting...
                      </>
                    ) : (
                      'Delete Account'
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}

