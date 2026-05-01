"use client";

import { useEffect, useState } from "react";
import { auth } from "@/lib/firebase";

export default function TestFirebaseClient() {
  const [status, setStatus] = useState("Loading...");
  const [user, setUser] = useState<{ email?: string | null } | null>(null);

  useEffect(() => {
    if (auth) {
      setStatus("Firebase Auth is initialized");
      const unsubscribe = auth.onAuthStateChanged((u) => {
        if (u) {
          setUser(u);
          setStatus("User is signed in: " + (u.email || ""));
        } else {
          setUser(null);
          setStatus("No user signed in");
        }
      });
      return () => unsubscribe();
    }
    setStatus("Firebase Auth is NOT initialized");
  }, []);

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Firebase Test Page</h1>
      <div className="space-y-4">
        <div>
          <strong>Status:</strong> {status}
        </div>
        {user && (
          <div>
            <strong>User:</strong> {user.email}
          </div>
        )}
      </div>
    </div>
  );
}
