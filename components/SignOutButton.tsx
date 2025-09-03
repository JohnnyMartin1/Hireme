"use client";
import FirebaseAuthProvider from "@/components/FirebaseAuthProvider";

export default function SignOutButton() {
  return (
    <FirebaseAuthProvider>
      <button
        onClick={() => {
          // For now, just redirect to login
          window.location.href = "/auth/login";
        }}
        className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
      >
        Sign out
      </button>
    </FirebaseAuthProvider>
  );
}
