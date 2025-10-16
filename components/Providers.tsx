"use client";
import { ProfileCompletionProvider } from "./ProfileCompletionProvider";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ProfileCompletionProvider>
      {children}
    </ProfileCompletionProvider>
  );
}
