"use client";
import { useState, useRef, useEffect } from 'react';
import { useToast } from '@/components/NotificationSystem';
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
  const toast = useToast();
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

  // Compress video using MediaRecorder API with canvas
  const compressVideo = async (file: File): Promise<File> => {
    return new Promise((resolve, reject) => {
      const video = document.createElement('video');
      const objectUrl = URL.createObjectURL(file);
      video.src = objectUrl;
      video.muted = true;
      video.playsInline = true;
      video.crossOrigin = 'anonymous';

      video.onloadedmetadata = () => {
        video.currentTime = 0;
      };

      video.oncanplaythrough = () => {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        
        if (!ctx) {
          window.URL.revokeObjectURL(objectUrl);
          reject(new Error('Canvas context not available'));
          return;
        }

        // Set canvas dimensions (max 1280x720 for intro videos)
        const maxWidth = 1280;
        const maxHeight = 720;
        let width = video.videoWidth;
        let height = video.videoHeight;

        if (width > maxWidth || height > maxHeight) {
          const ratio = Math.min(maxWidth / width, maxHeight / height);
          width = Math.floor(width * ratio);
          height = Math.floor(height * ratio);
        }

        canvas.width = width;
        canvas.height = height;

        // Try different codecs based on browser support
        const codecs = [
          'video/webm;codecs=vp9',
          'video/webm;codecs=vp8',
          'video/webm',
          'video/mp4'
        ];

        let selectedMimeType = 'video/webm';
        for (const codec of codecs) {
          if (MediaRecorder.isTypeSupported(codec)) {
            selectedMimeType = codec;
            break;
          }
        }

        const stream = canvas.captureStream(30); // 30 fps
        const mediaRecorder = new MediaRecorder(stream, {
          mimeType: selectedMimeType,
          videoBitsPerSecond: 2000000 // 2 Mbps for good quality/size balance
        });

        const chunks: Blob[] = [];
        mediaRecorder.ondataavailable = (e) => {
          if (e.data && e.data.size > 0) {
            chunks.push(e.data);
          }
        };

        mediaRecorder.onstop = () => {
          const blob = new Blob(chunks, { type: selectedMimeType });
          const extension = selectedMimeType.includes('mp4') ? '.mp4' : '.webm';
          const compressedFile = new File([blob], file.name.replace(/\.[^/.]+$/, extension), {
            type: blob.type,
            lastModified: Date.now()
          });
          window.URL.revokeObjectURL(objectUrl);
          resolve(compressedFile);
        };

        mediaRecorder.onerror = (event: any) => {
          window.URL.revokeObjectURL(objectUrl);
          reject(new Error('Compression failed: ' + (event.error?.message || 'Unknown error')));
        };

        let animationFrameId: number;
        const drawFrame = () => {
          if (video.ended || video.paused) {
            if (mediaRecorder.state !== 'inactive') {
              mediaRecorder.stop();
            }
            if (animationFrameId) {
              cancelAnimationFrame(animationFrameId);
            }
            return;
          }
          
          ctx.drawImage(video, 0, 0, width, height);
          animationFrameId = requestAnimationFrame(drawFrame);
        };

        video.onplay = () => {
          mediaRecorder.start();
          drawFrame();
        };

        video.onended = () => {
          if (mediaRecorder.state === 'recording') {
            mediaRecorder.stop();
          }
          if (animationFrameId) {
            cancelAnimationFrame(animationFrameId);
          }
        };

        // Start playback
        video.play().catch((err) => {
          window.URL.revokeObjectURL(objectUrl);
          reject(new Error('Could not play video: ' + err.message));
        });
      };

      video.onerror = (e) => {
        window.URL.revokeObjectURL(objectUrl);
        reject(new Error('Could not load video'));
      };

      video.load();
    });
  };

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
      // Upload original file immediately (user can save profile right away)
      const { url, error } = await uploadVideo(file, userId, (progress) => {
        setUploadProgress(progress);
      });
      
      if (error) throw new Error(error);
      if (!url) throw new Error('Upload failed - no URL returned');
      
      // Notify parent component immediately so user can save
      onUploadComplete(url);
      toast.info('Success', 'Video uploaded! You can save your profile now.');
      
      // Compress in background if file is larger than 10MB
      if (file.size > 10 * 1024 * 1024) {
        setIsCompressingInBackground(true);
        
        // Compress in background (non-blocking)
        compressVideo(file)
          .then(async (compressedFile) => {
            // Upload compressed version
            const { url: compressedUrl, error: compressError } = await uploadVideo(
              compressedFile, 
              userId
            );
            
            if (!compressError && compressedUrl) {
              // Replace with compressed version
              onUploadComplete(compressedUrl);
              const sizeReduction = ((1 - compressedFile.size / file.size) * 100).toFixed(0);
              toast.info('Info', `Video optimized: ${sizeReduction}% smaller`);
            }
          })
          .catch((error) => {
            console.error('Background compression error:', error);
            // Silently fail - original video is already uploaded
          })
          .finally(() => {
            setIsCompressingInBackground(false);
          });
      }
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
      await deleteFile(currentVideo);
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
