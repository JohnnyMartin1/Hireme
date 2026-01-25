"use client";
import { useState, useEffect } from 'react';
import { useFirebaseAuth } from "@/components/FirebaseAuthProvider";
import { useRouter } from "next/navigation";
import { ArrowLeft, Users, Search, Filter, Eye, Mail, Shield, Trash2, Clock, CheckCircle } from "lucide-react";
import Link from "next/link";
import { queryDocuments, getDocument } from '@/lib/firebase-firestore';
import { where } from 'firebase/firestore';
import { useToast } from '@/components/NotificationSystem';

interface User {
  id: string;
  email: string;
  firstName?: string;
  lastName?: string;
  role: string;
  status?: string;
  emailVerified?: boolean;
  companyName?: string;
  createdAt: any;
  isActive?: boolean;
}

export default function UsersManagementPage() {
  const { user, profile, loading } = useFirebaseAuth();
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [filteredUsers, setFilteredUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
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
      loadUsers();
      
      // Check for URL parameters to set initial filters
      const urlParams = new URLSearchParams(window.location.search);
      const filter = urlParams.get('filter');
      
      if (filter === 'verified_companies') {
        setRoleFilter('EMPLOYER');
        setStatusFilter('verified');
      } else if (filter === 'job_seekers') {
        setRoleFilter('JOB_SEEKER');
      }
    }
  }, [user]);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const loadUsers = async () => {
    setIsLoading(true);
    try {
      // Get users that actually exist in Firebase Auth
      const response = await fetch('/api/auth/verify-users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ 
          userIds: [] // Empty array means get all users
        }),
      });

      if (response.ok) {
        const { validUserIds } = await response.json();
        
        // Now get Firestore data only for valid users - optimized with parallel batch requests
        const validUsers: User[] = [];
        
        // Process in batches to avoid overwhelming Firestore and improve performance
        const batchSize = 20;
        for (let i = 0; i < validUserIds.length; i += batchSize) {
          const batch = validUserIds.slice(i, i + batchSize);
          
          // Fetch all users in parallel for this batch
          const userPromises = batch.map((userId: string) => getDocument('users', userId));
          const userResults = await Promise.all(userPromises);
          
          // Process results
          userResults.forEach(({ data: userData, error }) => {
            if (!error && userData) {
              validUsers.push(userData as User);
            }
          });
        }

        // Sort users by creation date (newest first)
        const sortedUsers = validUsers.sort((a: User, b: User) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt || 0);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt || 0);
          return dateB.getTime() - dateA.getTime();
        });
        
        setUsers(sortedUsers);
      } else {
        // Fallback to old method if API fails
        const { data, error } = await queryDocuments('users', []);
        if (!error && data) {
          setUsers(data as User[]);
        }
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Error', 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = [...users];

    // Search filter
    if (searchTerm) {
      filtered = filtered.filter(user => 
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.firstName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.lastName?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.companyName?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    // Status filter
    if (statusFilter !== 'all') {
      if (statusFilter === 'verified') {
        filtered = filtered.filter(user => user.status === 'verified' || (user.role === 'JOB_SEEKER' && user.emailVerified));
      } else if (statusFilter === 'pending') {
        filtered = filtered.filter(user => user.status === 'pending_verification');
      } else if (statusFilter === 'active') {
        filtered = filtered.filter(user => user.isActive !== false);
      } else if (statusFilter === 'inactive') {
        filtered = filtered.filter(user => user.isActive === false);
      }
    }

    setFilteredUsers(filtered);
  };

  const getRoleColor = (role: string) => {
    switch (role) {
      case 'JOB_SEEKER': return 'bg-blue-100 text-blue-800';
      case 'EMPLOYER': return 'bg-green-100 text-green-800';
      case 'RECRUITER': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusColor = (user: User) => {
    if (user.role === 'EMPLOYER') {
      if (user.status === 'verified') return 'bg-green-100 text-green-800';
      if (user.status === 'pending_verification') return 'bg-orange-100 text-orange-800';
      if (user.status === 'rejected') return 'bg-red-100 text-red-800';
    }
    if (user.emailVerified) return 'bg-green-100 text-green-800';
    return 'bg-gray-100 text-gray-800';
  };

  const getStatusText = (user: User) => {
    if (user.role === 'EMPLOYER') {
      return user.status || 'pending_verification';
    }
    return user.emailVerified ? 'verified' : 'unverified';
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading admin panel...</p>
        </div>
      </div>
    );
  }

  if (!user || user.email !== 'officialhiremeapp@gmail.com') {
    return null; // Will redirect
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-blue-50">
      <div className="max-w-7xl mx-auto p-6 py-12">
        <Link 
          href="/admin"
          className="text-indigo-600 hover:text-indigo-700 flex items-center space-x-1 mb-6 font-medium"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to Admin Dashboard</span>
        </Link>

        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">Manage all users on the platform</p>
          </div>
          <div className="flex items-center text-gray-600">
            <Users className="h-5 w-5 mr-2" />
            <span className="text-xl font-semibold text-gray-800">
              {isLoading ? '...' : filteredUsers.length} users
            </span>
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white rounded-xl shadow-lg p-6 mb-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-3 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Role</label>
              <select
                value={roleFilter}
                onChange={(e) => setRoleFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Roles</option>
                <option value="JOB_SEEKER">Job Seekers</option>
                <option value="EMPLOYER">Employers</option>
                <option value="RECRUITER">Recruiters</option>
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="flex items-end">
              <button
                onClick={() => {
                  setSearchTerm('');
                  setRoleFilter('all');
                  setStatusFilter('all');
                }}
                className="w-full px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors"
              >
                Clear Filters
              </button>
            </div>
          </div>
        </div>

        {/* Users List */}
        <div className="bg-white rounded-xl shadow-lg overflow-hidden">
          {isLoading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading users...</p>
            </div>
          ) : filteredUsers.length === 0 ? (
            <div className="p-8 text-center text-gray-500">
              <Users className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <p className="text-lg font-medium">No users found</p>
              <p className="mt-2">Try adjusting your search or filter criteria.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Joined</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {filteredUsers.map((user) => (
                    <tr key={user.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className="flex-shrink-0 h-10 w-10">
                            <div className="h-10 w-10 rounded-full bg-indigo-100 flex items-center justify-center">
                              <span className="text-sm font-medium text-indigo-600">
                                {(user.firstName?.[0] || user.email[0]).toUpperCase()}
                              </span>
                            </div>
                          </div>
                          <div className="ml-4">
                            <div className="text-sm font-medium text-gray-900">
                              {user.firstName && user.lastName 
                                ? `${user.firstName} ${user.lastName}`
                                : 'No name set'
                              }
                            </div>
                            <div className="text-sm text-gray-500">{user.email}</div>
                            {user.companyName && (
                              <div className="text-xs text-gray-400">{user.companyName}</div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getRoleColor(user.role)}`}>
                          {user.role.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(user)}`}>
                          {getStatusText(user).replace('_', ' ')}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {user.createdAt?.toDate 
                          ? user.createdAt.toDate().toLocaleDateString()
                          : new Date(user.createdAt || 0).toLocaleDateString()
                        }
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-2">
                          <Link
                            href={user.role === 'JOB_SEEKER' ? `/candidate/${user.id}` : `/company/${user.id}`}
                            target="_blank"
                            className="text-indigo-600 hover:text-indigo-900 flex items-center"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            View
                          </Link>
                          <button
                            onClick={() => {
                              navigator.clipboard.writeText(user.email);
                              toast.success('Copied', 'Email copied to clipboard');
                            }}
                            className="text-blue-600 hover:text-blue-900 flex items-center"
                          >
                            <Mail className="h-4 w-4 mr-1" />
                            Email
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
