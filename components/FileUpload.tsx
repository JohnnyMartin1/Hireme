"use client";
import { useState, useRef } from 'react';
import { Upload, X, FileText, User, Loader2 } from 'lucide-react';
import { uploadResume, uploadProfileImage, deleteFile } from '@/lib/firebase-storage';

interface FileUploadProps {
  type: 'resume' | 'profile-image';
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
  userId 
}: FileUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [dragActive, setDragActive] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (type === 'resume') {
      if (!file.type.includes('pdf') && !file.type.includes('doc') && !file.type.includes('docx')) {
        alert('Please upload a PDF, DOC, or DOCX file for your resume.');
        return;
      }
      if (file.size > 5 * 1024 * 1024) { // 5MB limit
        alert('Resume file size must be less than 5MB.');
        return;
      }
    } else if (type === 'profile-image') {
      if (!file.type.includes('image/')) {
        alert('Please upload an image file for your profile picture.');
        return;
      }
      if (file.size > 2 * 1024 * 1024) { // 2MB limit
        alert('Profile image file size must be less than 2MB.');
        return;
      }
    }

    setIsUploading(true);
    try {
      let fileUrl: string;
      
      if (type === 'resume') {
        const { url, error } = await uploadResume(file, userId);
        if (error) throw new Error(error);
        if (!url) throw new Error('Failed to get upload URL');
        fileUrl = url;
      } else {
        const { url, error } = await uploadProfileImage(file, userId);
        if (error) throw new Error(error);
        if (!url) throw new Error('Failed to get upload URL');
        fileUrl = url;
      }

      onUploadComplete(fileUrl);
    } catch (error) {
      console.error('Upload error:', error);
      alert(`Failed to upload ${type === 'resume' ? 'resume' : 'profile image'}. Please try again.`);
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
    if (!currentFile) return;
    
    try {
      await deleteFile(currentFile);
      onDelete();
    } catch (error) {
      console.error('Delete error:', error);
      alert('Failed to delete file. Please try again.');
    }
  };

  return (
    <div className="space-y-4">
      {currentFile ? (
        <div className="flex items-center justify-between p-4 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            {type === 'resume' ? (
              <FileText className="h-5 w-5 text-green-600 mr-3" />
            ) : (
              <img 
                src={currentFile} 
                alt="Profile" 
                className="h-10 w-10 rounded-full object-cover mr-3"
              />
            )}
            <div>
              <p className="font-medium text-green-800">
                {type === 'resume' ? 'Resume uploaded' : 'Profile image uploaded'}
              </p>
              <p className="text-sm text-green-600">
                {type === 'resume' ? 'PDF file ready' : 'Image ready'}
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
            accept={type === 'resume' ? '.pdf,.doc,.docx' : 'image/*'}
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
                {type === 'resume' ? 'Upload Resume' : 'Upload Profile Picture'}
              </p>
              <p className="text-xs text-gray-500 mb-3">
                {type === 'resume' 
                  ? 'Drag and drop a PDF, DOC, or DOCX file here, or click to browse' 
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
