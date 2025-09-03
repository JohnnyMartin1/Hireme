"use client";

import { ReactNode } from "react";
import { onAuthStateChanged, User } from "firebase/auth";
import { auth } from "@/lib/firebase";
import { useEffect, useState } from "react";

export default function FirebaseAuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  useEffect(() => {
    return onAuthStateChanged(auth, setUser);
  }, []);
  // You can put a context around this if you need; for now just render children.
  return <>{children}</>;
}
