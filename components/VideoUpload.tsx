"use client";
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/NotificationSystem';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { Upload, X, Video, Loader2 } from 'lucide-react';

interface VideoUploadProps {
  currentVideo?: string;
  onUploadComplete: (videoUrl: string) => void;
  onDelete: () => void;
  userId: string;
}

export default function VideoUpload({ 
  currentVideo, 
  onUploadComplete, 
  onDelete, 
  userId: _userId 
}: VideoUploadProps) {
  const toast = useToast();
  const { user } = useFirebaseAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [isCompressing, setIsCompressing] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [dragActive, setDragActive] = useState(false);
  const [isCompressingInBackground, setIsCompressingInBackground] = useState(false);
  // Recording functionality removed
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    // no-op cleanup since recording is removed
  }, []);

  // Compression is intentionally disabled; uploads now use signed URLs.

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.includes('video/')) {
      toast.info('Info', 'Please upload a video file.');
      return;
    }
    
    // Check file size (1 minute video ~ 75MB)
    if (file.size > 75 * 1024 * 1024) {
      toast.info('Info', 'Video file size must be less than 75MB.');
      return;
    }

    // Check video duration (max 1 minute)
    const checkDuration = (): Promise<boolean> => {
      return new Promise((resolve, reject) => {
        const video = document.createElement('video');
        video.preload = 'metadata';
        const objectUrl = URL.createObjectURL(file);
        video.src = objectUrl;
        
        video.onloadedmetadata = () => {
          window.URL.revokeObjectURL(objectUrl);
          const duration = video.duration;
          if (duration > 60) {
            resolve(false);
          } else {
            resolve(true);
          }
        };
        
        video.onerror = () => {
          window.URL.revokeObjectURL(objectUrl);
          reject(new Error('Could not read video file'));
        };
      });
    };

    try {
      const isValidDuration = await checkDuration();
      if (!isValidDuration) {
        toast.info('Info', 'Video duration must be 1 minute or less.');
        return;
      }
    } catch (error) {
      toast.error('Error', 'Could not read video file. Please try another file.');
      return;
    }

    // Upload immediately, compress in background if needed
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const authToken = user ? await user.getIdToken() : '';
      const prepRes = await fetch('/api/upload/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          mode: 'prepare',
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      const prep = await prepRes.json().catch(() => ({}));
      if (!prepRes.ok) throw new Error(prep?.error || 'Failed to prepare upload');

      const putRes = await fetch(prep.uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file,
      });
      if (!putRes.ok) throw new Error('Failed to upload video to storage');
      setUploadProgress(80);

      const finalizeRes = await fetch('/api/upload/video', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
        },
        body: JSON.stringify({
          mode: 'complete',
          storagePath: prep.storagePath,
          fileName: file.name,
          mimeType: file.type,
          sizeBytes: file.size,
        }),
      });
      const finalize = await finalizeRes.json().catch(() => ({}));
      if (!finalizeRes.ok) throw new Error(finalize?.error || 'Failed to finalize upload');
      setUploadProgress(100);
      onUploadComplete(String(finalize?.file?.storagePath || prep.storagePath));
      toast.info('Success', 'Video uploaded successfully.');
    } catch (error) {
        console.error('Upload error:', error);
        toast.error('Error', 'Failed to upload video. Please try again.');
      } finally {
        setIsUploading(false);
        setUploadProgress(0);
      }
  };

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === 'dragenter' || e.type === 'dragover') {
      setDragActive(true);
    } else if (e.type === 'dragleave') {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileSelect(e.dataTransfer.files[0]);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentVideo) return;
    
    try {
      const authToken = user ? await user.getIdToken() : '';
      const res = await fetch('/api/upload/video', {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      if (!res.ok) throw new Error('Delete failed');
      onDelete();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Error', 'Failed to delete video. Please try again.');
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="space-y-4">
      {currentVideo ? (
        <div className="space-y-3">
          <div className="bg-green-50 border border-green-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Video className="h-5 w-5 text-green-600 mr-3" />
                <div>
                  <p className="font-medium text-green-800">Profile Video uploaded</p>
                  {isCompressingInBackground ? (
                    <p className="text-sm text-blue-600 flex items-center">
                      <Loader2 className="h-3 w-3 animate-spin mr-2" />
                      Optimizing video in background...
                    </p>
                  ) : (
                    <p className="text-sm text-green-600">Video ready</p>
                  )}
                </div>
              </div>
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800 transition-colors"
                title="Remove video"
                disabled={isCompressingInBackground}
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            {currentVideo?.startsWith('http') ? (
              <video src={currentVideo} controls className="w-full rounded-lg max-h-48" preload="metadata" />
            ) : (
              <p className="text-sm text-slate-600">Private video uploaded. Recruiters will access it via secure signed links.</p>
            )}
          </div>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Upload Section */}
          <div
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${
              dragActive 
                ? 'border-blue-400 bg-blue-50' 
                : 'border-gray-300 hover:border-gray-400'
            }`}
            onDragEnter={handleDrag}
            onDragLeave={handleDrag}
            onDragOver={handleDrag}
            onDrop={handleDrop}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept="video/*"
              onChange={(e) => e.target.files?.[0] && handleFileSelect(e.target.files[0])}
              className="hidden"
            />
            
            {isCompressing || isUploading ? (
              <div className="space-y-3">
                {isCompressing && (
                  <div className="flex items-center justify-center">
                    <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                    <span className="text-gray-600">Compressing video...</span>
                  </div>
                )}
                {isUploading && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-center">
                      <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                      <span className="text-gray-600">Uploading... {Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${uploadProgress}%` }}
                      />
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">Upload Video</p>
                <p className="text-xs text-gray-500 mb-3">
                  Drag and drop a video file here, or click to browse (max 75MB, 1 minute)
                </p>
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                >
                  Choose File
                </button>
              </div>
            )}
          </div>

          {/* Recording option removed */}
        </div>
      )}
    </div>
  );
}
