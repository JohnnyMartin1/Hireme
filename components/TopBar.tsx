"use client";
import { signOut } from 'next-auth/react';
import Link from 'next/link';

export default function TopBar({ role }: { role: string }) {
  return (
    <header className="flex items-center justify-between p-4 border-b bg-white">
      <div className="font-bold text-xl">
        HireMe
      </div>
      <div className="flex items-center space-x-4 text-sm">
        <span className="text-gray-600 capitalize">{role.toLowerCase()}</span>
        <button onClick={() => signOut({ callbackUrl: '/' })} className="text-blue-600 hover:underline">
          Sign out
        </button>
      </div>
    </header>
  );
}