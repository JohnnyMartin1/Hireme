"use client";
import { useFirebaseAuth } from "./FirebaseAuthProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
