"use client";
import { useState, useEffect } from 'react';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { Building2, Users, Trash2, Shield, UserCheck, Clock, TrendingUp } from "lucide-react";
import Link from "next/link";
import { queryDocuments } from '@/lib/firebase-firestore';
import { where } from 'firebase/firestore';

export default function AdminDashboardPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [adminStats, setAdminStats] = useState({
    pendingCompanies: 0,
    totalUsers: 0,
    totalCompanies: 0,
    verifiedCompanies: 0,
    jobSeekers: 0
  });
  const [isLoadingStats, setIsLoadingStats] = useState(true);

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

  // Fetch admin statistics
  useEffect(() => {
    const fetchStats = async () => {
      if (!user || user.email !== 'officialhiremeapp@gmail.com') return;
      
      setIsLoadingStats(true);
      try {
        // Get accurate counts from Firebase Authentication
        const response = await fetch('/api/admin/get-firebase-user-count');
        
        if (response.ok) {
          const data = await response.json();
          setAdminStats({
            pendingCompanies: data.pendingCompanies,
            verifiedCompanies: data.verifiedCompanies,
            totalCompanies: data.employers,
            totalUsers: data.totalUsers, // This now matches Firebase Auth exactly
            jobSeekers: data.jobSeekers
          });
        } else {
          console.error('Failed to fetch Firebase user counts');
          // Fallback to Firestore counts if API fails
          const { data: allUsers } = await queryDocuments('users', []);
          setAdminStats({
            pendingCompanies: 0,
            verifiedCompanies: 0,
            totalCompanies: 0,
            totalUsers: allUsers?.length || 0,
            jobSeekers: 0
          });
        }
      } catch (error) {
        console.error('Error fetching admin stats:', error);
      } finally {
        setIsLoadingStats(false);
      }
    };

    if (user?.email === 'officialhiremeapp@gmail.com') {
      fetchStats();
    }
  }, [user, profile]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  if (!user || user.email !== 'officialhiremeapp@gmail.com') {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      {/* Admin Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white py-8 px-6 shadow-lg">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div>
            <div className="flex items-center mb-2">
              <Shield className="h-8 w-8 mr-3" />
              <h1 className="text-3xl font-bold">Admin Dashboard</h1>
            </div>
            <p className="text-indigo-100">Welcome back, Administrator</p>
          </div>
          <div className="text-right">
            <p className="text-sm text-indigo-200">Logged in as</p>
            <p className="font-medium">{user.email}</p>
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto p-6 py-12">
        {/* Pending Companies Alert */}
        {adminStats.pendingCompanies > 0 && (
          <div className="mb-8 bg-orange-50 border-2 border-orange-200 rounded-xl p-6 shadow-lg">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <div className="w-12 h-12 bg-orange-100 rounded-full flex items-center justify-center mr-4">
                  <Clock className="h-6 w-6 text-orange-600" />
                </div>
                <div>
                  <h3 className="text-xl font-bold text-orange-900">
                    {adminStats.pendingCompanies} {adminStats.pendingCompanies === 1 ? 'Company' : 'Companies'} Awaiting Review
                  </h3>
                  <p className="text-orange-700">New company registration{adminStats.pendingCompanies !== 1 ? 's' : ''} require your approval</p>
                </div>
              </div>
              <Link 
                href="/admin/verify-companies"
                className="px-6 py-3 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors font-semibold shadow-md hover:shadow-lg"
              >
                Review Now →
              </Link>
            </div>
          </div>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Link href="/admin/verify-companies" className="block">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-400 hover:shadow-xl transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Pending</p>
                  <p className="text-3xl font-bold text-orange-600">
                    {isLoadingStats ? '...' : adminStats.pendingCompanies}
                  </p>
                </div>
                <Clock className="h-8 w-8 text-orange-400" />
              </div>
            </div>
          </Link>

          <Link href="/admin/users?filter=verified_companies" className="block">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-green-400 hover:shadow-xl transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Verified Companies</p>
                  <p className="text-3xl font-bold text-green-600">
                    {isLoadingStats ? '...' : adminStats.verifiedCompanies}
                  </p>
                </div>
                <UserCheck className="h-8 w-8 text-green-400" />
              </div>
            </div>
          </Link>

          <Link href="/admin/users?filter=job_seekers" className="block">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-400 hover:shadow-xl transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Job Seekers</p>
                  <p className="text-3xl font-bold text-blue-600">
                    {isLoadingStats ? '...' : adminStats.jobSeekers}
                  </p>
                </div>
                <Users className="h-8 w-8 text-blue-400" />
              </div>
            </div>
          </Link>

          <Link href="/admin/users" className="block">
            <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-purple-400 hover:shadow-xl transition-shadow cursor-pointer">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-1">Total Users</p>
                  <p className="text-3xl font-bold text-purple-600">
                    {isLoadingStats ? '...' : adminStats.totalUsers}
                  </p>
                </div>
                <TrendingUp className="h-8 w-8 text-purple-400" />
              </div>
            </div>
          </Link>
        </div>

        {/* Admin Actions */}
        <div className="mb-8">
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Admin Tools</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            
            {/* Company Verification */}
            <Link href="/admin/verify-companies" className="block">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-orange-400 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-orange-100 rounded-lg">
                    <Building2 className="h-6 w-6 text-orange-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">Company Verification</h3>
                    <p className="text-gray-600 text-sm">Review and approve company registrations</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* User Management */}
            <Link href="/admin/users" className="block">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-blue-400 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-blue-100 rounded-lg">
                    <Users className="h-6 w-6 text-blue-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">User Management</h3>
                    <p className="text-gray-600 text-sm">Manage users and roles</p>
                  </div>
                </div>
              </div>
            </Link>

            {/* System Cleanup */}
            <Link href="/admin/cleanup" className="block">
              <div className="bg-white rounded-xl shadow-lg p-6 border-l-4 border-red-400 hover:shadow-xl transition-shadow">
                <div className="flex items-center">
                  <div className="p-3 bg-red-100 rounded-lg">
                    <Trash2 className="h-6 w-6 text-red-600" />
                  </div>
                  <div className="ml-4">
                    <h3 className="text-lg font-semibold text-gray-900">System Cleanup</h3>
                    <p className="text-gray-600 text-sm">Clean up orphaned data</p>
                  </div>
                </div>
              </div>
            </Link>
          </div>
        </div>

        {/* Platform Overview */}
        <div className="bg-white rounded-xl shadow-lg p-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Platform Activity</h2>
          <div className="space-y-4">
            <Link href="/admin/verify-companies" className="block">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 hover:bg-gray-50 rounded-lg px-2 transition-colors cursor-pointer">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-orange-100 rounded-full flex items-center justify-center mr-3">
                    <Building2 className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Companies Pending Verification</p>
                    <p className="text-sm text-gray-500">Awaiting admin review</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-orange-600">{adminStats.pendingCompanies}</span>
              </div>
            </Link>
            
            <Link href="/admin/users?filter=verified_companies" className="block">
              <div className="flex items-center justify-between py-3 border-b border-gray-200 hover:bg-gray-50 rounded-lg px-2 transition-colors cursor-pointer">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mr-3">
                    <UserCheck className="h-5 w-5 text-green-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Verified Companies</p>
                    <p className="text-sm text-gray-500">Active employer accounts</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-green-600">{adminStats.verifiedCompanies}</span>
              </div>
            </Link>
            
            <Link href="/admin/users?filter=job_seekers" className="block">
              <div className="flex items-center justify-between py-3 hover:bg-gray-50 rounded-lg px-2 transition-colors cursor-pointer">
                <div className="flex items-center">
                  <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mr-3">
                    <Users className="h-5 w-5 text-blue-600" />
                  </div>
                  <div>
                    <p className="font-medium text-gray-900">Job Seekers</p>
                    <p className="text-sm text-gray-500">Candidates in the system</p>
                  </div>
                </div>
                <span className="text-2xl font-bold text-blue-600">{adminStats.jobSeekers}</span>
              </div>
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}