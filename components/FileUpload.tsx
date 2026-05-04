"use client";
import { useState, useRef } from 'react';
import { useToast } from '@/components/NotificationSystem';
import { useFirebaseAuth } from '@/components/FirebaseAuthProvider';
import { Upload, X, FileText, Loader2 } from 'lucide-react';

interface FileUploadProps {
  type: 'resume' | 'profile-image' | 'transcript';
  currentFile?: string;
  onUploadComplete: (fileUrl: string) => void;
  onDelete: () => void;
  userId: string;
}

export default function FileUpload({ 
  type, 
  currentFile, 
  onUploadComplete, 
  onDelete, 
  userId: _userId 
}: FileUploadProps) {
  const toast = useToast();
  const { user } = useFirebaseAuth();
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (type === 'resume') {
      if (!file.type.includes('pdf')) {
        toast.info('Info', 'Please upload a PDF file for your resume.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        toast.info('Info', 'Resume file size must be less than 5MB.');
        return;
      }
    } else if (type === 'transcript') {
      const transcriptTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/webp'];
      if (!transcriptTypes.includes(file.type)) {
        toast.info('Info', 'Transcript must be PDF, JPEG, PNG, or WEBP.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.info('Info', 'Transcript file size must be less than 10MB.');
        return;
      }
    } else if (type === 'profile-image') {
      if (!file.type.includes('image/')) {
        toast.info('Info', 'Please upload an image file for your profile picture.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        toast.info('Info', 'Profile image file size must be less than 2MB.');
        return;
      }
    }

    setIsUploading(true);
    try {
      const authToken = user ? await user.getIdToken() : '';
      const route = type === 'resume' ? 'resume' : type === 'transcript' ? 'transcript' : 'profile-image';
      const formData = new FormData();
      formData.append('file', file);
      const res = await fetch(`/api/upload/${route}`, {
        method: 'POST',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
        body: formData,
      });
      const payload = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(payload?.error || 'Upload failed');
      const value = type === 'profile-image' ? String(payload?.file?.url || '') : String(payload?.file?.storagePath || '');
      if (!value) throw new Error('Upload failed');
      onUploadComplete(value);
    } catch (error) {
      console.error('Upload error:', error);
      const fileTypeName = type === 'resume' ? 'resume' : type === 'transcript' ? 'transcript' : 'profile image';
      toast.error('Error', `Failed to upload ${fileTypeName}. Please try again.`);
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

  const handleDelete = async (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (!currentFile) return;
    
    try {
      const authToken = user ? await user.getIdToken() : '';
      const route = type === 'resume' ? 'resume' : type === 'transcript' ? 'transcript' : 'profile-image';
      const res = await fetch(`/api/upload/${route}`, {
        method: 'DELETE',
        headers: authToken ? { Authorization: `Bearer ${authToken}` } : undefined,
      });
      if (!res.ok) throw new Error('Delete failed');
      onDelete();
    } catch (error) {
      console.error('Delete error:', error);
      toast.error('Error', 'Failed to delete file. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {currentFile ? (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            {type === 'resume' || type === 'transcript' ? (
              <FileText className="h-5 w-5 text-green-600 mr-3" />
            ) : (
              currentFile?.startsWith('http') ? (
                <img src={currentFile} alt="Profile" className="h-10 w-10 rounded-full object-cover mr-3" />
              ) : (
                <div className="h-10 w-10 rounded-full bg-green-100 mr-3" />
              )
            )}
            <div>
              <p className="font-medium text-green-800">
                {type === 'resume'
                  ? 'Resume uploaded'
                  : type === 'transcript'
                  ? 'Transcript uploaded'
                  : 'Profile image uploaded'}
              </p>
              <p className="text-sm text-green-600">
                {type === 'resume' || type === 'transcript'
                  ? 'PDF file ready'
                  : 'Image ready'}
              </p>
            </div>
          </div>
          <button
            onClick={handleDelete}
            className="text-red-600 hover:text-red-800 transition-colors"
            title="Remove file"
          >
            <X className="h-5 w-5" />
          </button>
        </div>
      ) : (
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
            accept={type === 'resume' ? '.pdf' : type === 'transcript' ? '.pdf,image/jpeg,image/png,image/webp' : 'image/*'}
            
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
              <p className="text-sm font-medium text-gray-700 mb-1">
                {type === 'resume' ? 'Upload Resume' : type === 'transcript' ? 'Upload Transcript' : 'Upload Profile Picture'}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {type === 'resume'
                  ? 'Drag and drop a PDF file here, or click to browse'
                  : type === 'transcript'
                  ? 'Drag and drop a PDF/image file here, or click to browse'
                  : 'Drag and drop an image file here, or click to browse'
                }
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
      )}
    </div>
  );
}
