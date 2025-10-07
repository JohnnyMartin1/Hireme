"use client";
import { useState, useRef, useEffect } from 'react';
import { Upload, X, Video, Loader2 } from 'lucide-react';
import { uploadVideo, deleteFile } from '@/lib/firebase-storage';

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
  userId 
}: VideoUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  // Recording functionality removed
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  // Cleanup on unmount
  useEffect(() => {
    // no-op cleanup since recording is removed
  }, []);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.includes('video/')) {
      alert('Please upload a video file.');
      return;
    }
    
    // Check file size (1 minute video ~ 50MB)
    if (file.size > 50 * 1024 * 1024) {
      alert('Video file size must be less than 50MB.');
      return;
    }

    setIsUploading(true);
    try {
      const { url, error } = await uploadVideo(file, userId);
      if (error) throw new Error(error);
      if (!url) throw new Error('Upload failed - no URL returned');
      onUploadComplete(url);
    } catch (error) {
      console.error('Upload error:', error);
      alert('Failed to upload video. Please try again.');
    } finally {
      setIsUploading(false);
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

  const handleDelete = async () => {
    if (!currentVideo) return;
    
    try {
      await deleteFile(currentVideo);
      onDelete();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete video. Please try again.');
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
                  <p className="text-sm text-green-600">Video ready</p>
                </div>
              </div>
              <button
                onClick={handleDelete}
                className="text-red-600 hover:text-red-800 transition-colors"
                title="Remove video"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <video 
              src={currentVideo} 
              controls 
              className="w-full rounded-lg max-h-48"
              preload="metadata"
            />
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
            
            {isUploading ? (
              <div className="flex items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600 mr-3" />
                <span className="text-gray-600">Uploading...</span>
              </div>
            ) : (
              <div>
                <Upload className="h-8 w-8 text-gray-400 mx-auto mb-3" />
                <p className="text-sm font-medium text-gray-700 mb-1">Upload Video</p>
                <p className="text-xs text-gray-500 mb-3">
                  Drag and drop a video file here, or click to browse (max 50MB)
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
