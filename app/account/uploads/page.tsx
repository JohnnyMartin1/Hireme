"use client";
import { useState } from 'react';
import { useToast } from '@/components/NotificationSystem';
import BackButton from '@/components/BackButton';

/**
 * Uploads page. Provides simple forms for uploading a resume (PDF) and
 * introduction video (MP4). Uploads are sent via fetch to API routes
 * which must handle file storage and return a success status.
 */
export default function UploadsPage() {
  const toast = useToast();
  const [resumeFile, setResumeFile] = useState<File | null>(null);
  const [videoFile, setVideoFile] = useState<File | null>(null);
  const [loading, setLoading] = useState(false);
  const handleResumeUpload = async () => {
    if (!resumeFile) return;
    const formData = new FormData();
    formData.append('file', resumeFile);
    setLoading(true);
    const res = await fetch('/api/upload/resume', { method: 'POST', body: formData });
    setLoading(false);
    if (res.ok) toast.info('Info', 'Resume uploaded'); else toast.error('Error', 'Failed to upload resume');
  };
  const handleVideoUpload = async () => {
    if (!videoFile) return;
    const formData = new FormData();
    formData.append('file', videoFile);
    setLoading(true);
    const res = await fetch('/api/upload/video', { method: 'POST', body: formData });
    setLoading(false);
    if (res.ok) toast.info('Info', 'Video uploaded'); else toast.error('Error', 'Failed to upload video');
  };
  return (
    <div className="max-w-xl mx-auto">
      <BackButton fallback="/account/profile" />
      <h2 className="text-2xl font-bold my-4">Uploads</h2>
      <div className="space-y-8">
        <div>
          <h3 className="text-lg font-semibold mb-2">Resume (PDF)</h3>
          <input type="file" accept="application/pdf" onChange={(e) => setResumeFile(e.target.files?.[0] || null)} />
          <button onClick={handleResumeUpload} disabled={!resumeFile || loading} className="ml-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Upload</button>
        </div>
        <div>
          <h3 className="text-lg font-semibold mb-2">Introduction Video (MP4)</h3>
          <input type="file" accept="video/mp4" onChange={(e) => setVideoFile(e.target.files?.[0] || null)} />
          <button onClick={handleVideoUpload} disabled={!videoFile || loading} className="ml-2 px-4 py-2 bg-blue-600 text-white rounded disabled:opacity-50">Upload</button>
        </div>
      </div>
    </div>
  );
}