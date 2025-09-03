"use client";
import { useFirebaseAuth } from "./FirebaseAuthProvider";

export default function SignOutButton() {
  const { signOut } = useFirebaseAuth();
  
  return (
    <button
      onClick={() => signOut()}
      className="inline-flex items-center rounded-md border px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50"
    >
      Sign out
    </button>
  );
}
