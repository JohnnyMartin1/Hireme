"use client";
import { useState, useEffect } from 'react';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { ArrowLeft, Check, X, Building2, Mail, Phone, MapPin, Globe, Clock, User, ExternalLink, Eye } from "lucide-react";
import Link from "next/link";
import { getDocument, queryDocuments } from '@/lib/firebase-firestore';
import { where } from 'firebase/firestore';
import { useToast } from '@/components/NotificationSystem';

interface PendingCompany {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  companyName: string;
  companySize: string;
  industry: string;
  website?: string;
  phone?: string;
  address?: string;
  createdAt: any;
  role: string;
  status: string;
  companyDescription?: string;
  linkedinUrl?: string;
  portfolioUrl?: string;
}

export default function VerifyCompaniesPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [pendingCompanies, setPendingCompanies] = useState<PendingCompany[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const toast = useToast();

  useEffect(() => {
    if (!loading && !user) {
      router.push("/auth/login");
      return;
    }

    // Only allow admin users (check email)
    if (user && user.email !== 'officialhiremeapp@gmail.com') {
      router.push("/home");
      return;
    }
  }, [user, profile, loading, router]);

  useEffect(() => {
    if (user?.email === 'officialhiremeapp@gmail.com') {
      loadPendingCompanies();
    }
  }, [user]);

  const loadPendingCompanies = async () => {
    setIsLoading(true);
    try {
      // Get all users with role EMPLOYER and status pending_verification
      const { data, error } = await queryDocuments('users', [
        where('role', '==', 'EMPLOYER'),
        where('status', '==', 'pending_verification')
      ]);

      if (!error && data) {
        setPendingCompanies(data as PendingCompany[]);
      }
    } catch (error) {
      console.error('Error loading pending companies:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleVerification = async (companyId: string, approved: boolean) => {
    setProcessingId(companyId);
    try {
      // Use server-side API to update company status (bypasses client-side security rules)
      const response = await fetch('/api/admin/verify-company', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          companyId,
          approved,
          adminUserId: user?.uid
        }),
      });

      if (response.ok) {
        // Remove from pending list
        setPendingCompanies(prev => prev.filter(company => company.id !== companyId));
        
        // Show success message
        if (approved) {
          toast.success('Company Approved', 'They now have full access to employer features.');
        } else {
          toast.success('Company Rejected', 'The company registration has been rejected.');
        }
      } else {
        const errorData = await response.json();
        console.error('Error updating company status:', errorData);
        toast.error('Update Failed', errorData.error || 'Unknown error occurred');
      }
    } catch (error: any) {
      console.error('Error in handleVerification:', error);
      toast.error('Update Failed', error.message || 'An unexpected error occurred');
    } finally {
      setProcessingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  if (!user || user.email !== 'officialhiremeapp@gmail.com') {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      <div className="max-w-6xl mx-auto p-6 py-12">
        <Link 
          href="/admin"
          className="inline-flex items-center gap-2 text-indigo-700 hover:text-indigo-800 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-indigo-50 hover:shadow-md mb-6 font-medium min-h-[44px] relative z-10"
        >
          <ArrowLeft className="h-4 w-4 group-hover:-translate-x-1 transition-transform duration-200" />
          <span>Back to Admin Dashboard</span>
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Company Verification</h1>
            <p className="text-gray-600 mt-2">Review and approve company registrations</p>
          </div>
          <div className="text-sm text-gray-500">
            {pendingCompanies.length} pending verification{pendingCompanies.length !== 1 ? 's' : ''}
          </div>
        </div>

        {isLoading ? (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading pending companies...</p>
          </div>
        ) : pendingCompanies.length === 0 ? (
          <div className="text-center py-12">
            <Building2 className="h-12 w-12 text-gray-300 mx-auto mb-4" />
            <p className="text-gray-500">No companies pending verification</p>
          </div>
        ) : (
          <div className="space-y-6">
            {pendingCompanies.map((company) => (
              <div key={company.id} className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-400">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center space-x-3">
                    <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center">
                      <Building2 className="h-6 w-6 text-orange-600" />
                    </div>
                    <div>
                      <h3 className="text-xl font-semibold text-gray-900">{company.companyName}</h3>
                      <p className="text-gray-600">Registration pending verification</p>
                    </div>
                  </div>
                  <div className="flex space-x-2">
                    <Link 
                      href={`/company/${company.id}`}
                      target="_blank"
                      className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
                    >
                      <Eye className="h-4 w-4 mr-2" />
                      View Profile
                    </Link>
                    {company.website && (
                      <a
                        href={company.website.startsWith('http') ? company.website : `https://${company.website}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
                      >
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Website
                      </a>
                    )}
                    <button
                      onClick={() => handleVerification(company.id, true)}
                      disabled={processingId === company.id}
                      className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      <Check className="h-4 w-4 mr-2" />
                      Approve
                    </button>
                    <button
                      onClick={() => handleVerification(company.id, false)}
                      disabled={processingId === company.id}
                      className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                    >
                      <X className="h-4 w-4 mr-2" />
                      Reject
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <User className="h-4 w-4 mr-2 text-blue-600" />
                      Contact Person
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex items-center text-gray-600">
                        <Mail className="h-4 w-4 mr-2 text-gray-400" />
                        {company.email}
                      </div>
                      <div className="text-gray-600">
                        {company.firstName} {company.lastName}
                      </div>
                      {company.phone && (
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-2 text-gray-400" />
                          {company.phone}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Building2 className="h-4 w-4 mr-2 text-green-600" />
                      Company Details
                    </h4>
                    <div className="space-y-2 text-sm">
                      <div className="text-gray-600">
                        <span className="font-medium">Industry:</span> {company.industry}
                      </div>
                      <div className="text-gray-600">
                        <span className="font-medium">Size:</span> {company.companySize}
                      </div>
                      {company.website && (
                        <div className="flex items-center text-gray-600">
                          <Globe className="h-4 w-4 mr-2 text-gray-400" />
                          <a href={company.website} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">
                            {company.website}
                          </a>
                        </div>
                      )}
                      {company.address && (
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2 text-gray-400" />
                          {company.address}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-semibold text-gray-900 flex items-center">
                      <Clock className="h-4 w-4 mr-2 text-purple-600" />
                      Registration Info
                    </h4>
                    <div className="space-y-2 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">Registered:</span> {
                          company.createdAt?.toDate 
                            ? company.createdAt.toDate().toLocaleDateString()
                            : new Date(company.createdAt).toLocaleDateString()
                        }
                      </div>
                      <div>
                        <span className="font-medium">Status:</span> 
                        <span className="ml-1 px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full">
                          Pending Verification
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
