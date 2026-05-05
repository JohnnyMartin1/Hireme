"use client";
import { useState } from 'react';
import { useToast } from '@/components/NotificationSystem';
import { ArrowLeft } from 'lucide-react';
import Link from 'next/link';
import FileUpload from '@/components/FileUpload';
import VideoUpload from '@/components/VideoUpload';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';

/**
 * Uploads page. Provides simple forms for uploading a resume (PDF) and
 * introduction video (MP4). Uploads are sent via fetch to API routes
 * which must handle file storage and return a success status.
 */
export default function UploadsPage() {
  const { user } = useFirebaseAuth();
  const toast = useToast();
  const [resumePath, setResumePath] = useState('');
  const [transcriptPath, setTranscriptPath] = useState('');
  const [videoPath, setVideoPath] = useState('');
  const [profileImageUrl, setProfileImageUrl] = useState('');

  return (
    <div className="min-h-screen bg-slate-50 mobile-safe-top mobile-safe-bottom">
      {/* Header */}
      <header className="sticky top-0 bg-white shadow-sm z-50 border-b border-slate-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between">
          <Link
            href="/account/profile"
            className="flex items-center gap-2 text-navy-800 hover:text-navy-600 transition-all duration-200 group px-3 py-2 rounded-lg hover:bg-sky-50 hover:shadow-md min-h-[44px]"
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 group-hover:-translate-x-1 transition-transform duration-200" />
            <span className="font-medium text-sm sm:text-base hidden sm:inline">Back to Profile</span>
            <span className="font-medium text-sm sm:text-base sm:hidden">Back</span>
          </Link>
          <Link href="/" className="flex items-center gap-2">
            <div className="w-8 h-8 bg-navy-800 rounded-lg flex items-center justify-center">
              <svg width="20" height="20" viewBox="0 0 269 274" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M111.028 0C172.347 0.000238791 222.055 51.647 222.055 115.356C222.055 140.617 214.238 163.98 200.983 182.981L258.517 242.758L238.036 264.036L181.077 204.857C161.97 221.02 137.589 230.713 111.028 230.713C49.7092 230.713 2.76862e-05 179.066 0 115.356C0 51.6468 49.7092 0 111.028 0Z" fill="white"/>
                <path d="M205.69 115.392C205.69 170.42 163.308 215.029 111.028 215.029C58.748 215.029 16.3666 170.42 16.3666 115.392C16.3666 60.3646 58.748 15.7559 111.028 15.7559C163.308 15.7559 205.69 60.3646 205.69 115.392Z" fill="#4F86F7"/>
              </svg>
            </div>
            <span className="text-xl font-bold text-navy-900">HireMe</span>
          </Link>
        </div>
      </header>

      <div className="max-w-xl mx-auto px-4 sm:px-6 py-8">
        <h2 className="text-2xl font-bold mb-4">Uploads</h2>
        <p className="text-sm text-slate-600 mb-6 rounded-lg border border-slate-200 bg-white p-4">
          Files you upload are stored securely. <strong>Resume, transcript, and intro video</strong> are private: employers only receive
          time-limited access when you are tied to a job, in a message thread, or in an approved talent pool. Your <strong>profile image</strong> may
          appear on your public discovery profile. AI-assisted matching may use text derived from your profile; it does not replace employer judgment.
        </p>
        <div className="space-y-8">
          <div><h3 className="text-lg font-semibold mb-2">Resume (PDF, max 5MB)</h3><FileUpload type="resume" currentFile={resumePath} onUploadComplete={setResumePath} onDelete={() => setResumePath('')} userId={user?.uid || ''} /></div>
          <div><h3 className="text-lg font-semibold mb-2">Transcript (PDF/image, max 10MB)</h3><FileUpload type="transcript" currentFile={transcriptPath} onUploadComplete={setTranscriptPath} onDelete={() => setTranscriptPath('')} userId={user?.uid || ''} /></div>
          <div><h3 className="text-lg font-semibold mb-2">Profile image (JPEG/PNG/WEBP, max 5MB)</h3><FileUpload type="profile-image" currentFile={profileImageUrl} onUploadComplete={setProfileImageUrl} onDelete={() => setProfileImageUrl('')} userId={user?.uid || ''} /></div>
          <div><h3 className="text-lg font-semibold mb-2">Intro video (MP4/WEBM/MOV, max 100MB)</h3><VideoUpload currentVideo={videoPath} onUploadComplete={setVideoPath} onDelete={() => setVideoPath('')} userId={user?.uid || ''} /></div>
        </div>
      </div>
    </div>
  );
}