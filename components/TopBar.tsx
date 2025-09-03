"use client";
import { useFirebaseAuth } from './FirebaseAuthProvider';
import Link from 'next/link';
import { User, LogOut, Bell, Settings } from 'lucide-react';

export default function TopBar({ role }: { role: string }) {
  const { signOut } = useFirebaseAuth();
  
  return (
    <header className="flex items-center justify-between p-4 border-b bg-gradient-to-r from-white to-blue-50 shadow-sm">
      <div className="flex items-center">
        <div className="p-2 bg-blue-100 rounded-lg mr-3">
          <User className="h-6 w-6 text-blue-600" />
        </div>
        <div>
          <div className="font-bold text-xl text-gray-900">
            HireMe
          </div>
          <div className="text-sm text-gray-600 capitalize">
            {role.toLowerCase()} dashboard
          </div>
        </div>
      </div>
      
      <div className="flex items-center space-x-4">
        <button className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors">
          <Bell className="h-5 w-5" />
        </button>
        
        <Link 
          href="/account/profile" 
          className="p-2 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Settings className="h-5 w-5" />
        </Link>
        
        <button 
          onClick={() => signOut()} 
          className="flex items-center px-4 py-2 text-red-600 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors border border-red-200 hover:border-red-300"
        >
          <LogOut className="h-4 w-4 mr-2" />
          Sign out
        </button>
      </div>
    </header>
  );
}