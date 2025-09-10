"use client";
import { useState, useRef, useEffect } from 'react';
import { Upload, X, Video, Camera, Loader2, Play, Pause, Square } from 'lucide-react';
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
  const [isRecording, setIsRecording] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState<Blob | null>(null);
  const [recordedUrl, setRecordedUrl] = useState<string>('');
  const [mediaRecorder, setMediaRecorder] = useState<MediaRecorder | null>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [recordingTime, setRecordingTime] = useState(0);
  const [showRecording, setShowRecording] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const recordingTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }
      if (recordedUrl) {
        URL.revokeObjectURL(recordedUrl);
      }
    };
  }, [stream, recordedUrl]);

  const handleFileSelect = async (file: File) => {
    if (!file) return;

    // Validate file type
    if (!file.type.includes('video/')) {
      alert('Please upload a video file.');
      return;
    }
    
    // Check file size (1 minute video ~ 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Video file size must be less than 10MB.');
      return;
    }

    setIsUploading(true);
    try {
      const { url, error } = await uploadVideo(file, userId);
      if (error) throw new Error(error);
      if (!url) throw new Error('Failed to get upload URL');
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

  const startRecording = async () => {
    try {
      // Reset states first
      setIsRecording(false);
      setShowRecording(false);
      setRecordingTime(0);
      setRecordedBlob(null);
      setRecordedUrl('');
      
      // Clean up any existing stream
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
      if (recordingTimerRef.current) {
        clearInterval(recordingTimerRef.current);
      }

      const mediaStream = await navigator.mediaDevices.getUserMedia({ 
        video: { 
          width: { ideal: 1280 },
          height: { ideal: 720 }
        }, 
        audio: true 
      });
      
      setStream(mediaStream);
      
      // Set up video preview
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
        videoRef.current.muted = true;
        videoRef.current.playsInline = true;
        try {
          await videoRef.current.play();
        } catch (playError) {
          console.warn('Autoplay failed, user may need to interact first:', playError);
        }
      }

      // Check for supported MIME types
      let mimeType = 'video/webm;codecs=vp9,opus';
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm;codecs=vp8,opus';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/webm';
      }
      if (!MediaRecorder.isTypeSupported(mimeType)) {
        mimeType = 'video/mp4';
      }

      const recorder = new MediaRecorder(mediaStream, {
        mimeType: MediaRecorder.isTypeSupported(mimeType) ? mimeType : undefined
      });
      
      const chunks: Blob[] = [];

      recorder.ondataavailable = (event) => {
        console.log('Data available:', event.data.size);
        if (event.data.size > 0) {
          chunks.push(event.data);
        }
      };

      recorder.onstart = () => {
        console.log('Recording started');
        setIsRecording(true);
        setShowRecording(true);
        setRecordingTime(0);
        
        // Start timer
        recordingTimerRef.current = setInterval(() => {
          setRecordingTime(prev => {
            if (prev >= 60) { // 1 minute limit
              stopRecording();
              return 60;
            }
            return prev + 1;
          });
        }, 1000);
      };

      recorder.onstop = () => {
        console.log('Recording stopped, chunks:', chunks.length);
        if (recordingTimerRef.current) {
          clearInterval(recordingTimerRef.current);
        }
        
        if (chunks.length > 0) {
          const blob = new Blob(chunks, { type: 'video/webm' });
          console.log('Created blob:', blob.size);
          setRecordedBlob(blob);
          const url = URL.createObjectURL(blob);
          setRecordedUrl(url);
        }
        
        setShowRecording(false);
        setIsRecording(false);
        
        // Stop all tracks
        mediaStream.getTracks().forEach(track => track.stop());
      };

      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event);
        alert('Recording failed. Please try again.');
        stopRecording();
      };

      setMediaRecorder(recorder);
      
      // Start recording with 1-second timeslice to ensure data is available
      recorder.start(1000);

    } catch (error) {
      console.error('Error starting recording:', error);
      setShowRecording(false);
      setIsRecording(false);
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          alert('Camera access denied. Please allow camera permissions and try again.');
        } else if (error.name === 'NotFoundError') {
          alert('No camera found. Please connect a camera and try again.');
        } else {
          alert('Failed to start recording: ' + error.message);
        }
      } else {
        alert('Failed to start recording. Please check camera permissions.');
      }
    }
  };

  const stopRecording = (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    console.log('Stopping recording...');
    if (mediaRecorder && isRecording) {
      mediaRecorder.stop();
    }
    if (recordingTimerRef.current) {
      clearInterval(recordingTimerRef.current);
    }
  };

  const saveRecording = async (e?: React.MouseEvent) => {
    if (e) {
      e.preventDefault();
      e.stopPropagation();
    }
    if (!recordedBlob) return;

    setIsUploading(true);
    try {
      // Convert blob to file
      const file = new File([recordedBlob], `profile-video-${Date.now()}.webm`, {
        type: 'video/webm'
      });

      const { url, error } = await uploadVideo(file, userId);
      if (error) throw new Error(error);
      if (!url) throw new Error('Failed to get upload URL');
      
      onUploadComplete(url);
      setRecordedBlob(null);
      setRecordedUrl('');
    } catch (error) {
      console.error('Error saving recording:', error);
      alert('Failed to save recording. Please try again.');
    } finally {
      setIsUploading(false);
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
      ) : recordedUrl ? (
        <div className="space-y-3">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center">
                <Video className="h-5 w-5 text-blue-600 mr-3" />
                <div>
                  <p className="font-medium text-blue-800">Recording complete</p>
                  <p className="text-sm text-blue-600">Review your video</p>
                </div>
              </div>
            </div>
            <video 
              src={recordedUrl} 
              controls 
              className="w-full rounded-lg max-h-48"
            />
            <div className="flex gap-2 mt-3">
              <button
                type="button"
                onClick={saveRecording}
                disabled={isUploading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 transition-colors text-sm"
              >
                {isUploading ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Saving...
                  </>
                ) : (
                  'Save Recording'
                )}
              </button>
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  setRecordedBlob(null);
                  if (recordedUrl) {
                    URL.revokeObjectURL(recordedUrl);
                  }
                  setRecordedUrl('');
                }}
                className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors text-sm"
              >
                Discard
              </button>
            </div>
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
                  Drag and drop a video file here, or click to browse (max 1 minute)
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

          {/* Recording Section */}
          <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
            <Camera className="h-8 w-8 text-gray-400 mx-auto mb-3" />
            <p className="text-sm font-medium text-gray-700 mb-1">Record Video</p>
            <p className="text-xs text-gray-500 mb-3">
              Record a 1-minute video directly on this website
            </p>
            <button
              type="button"
              onClick={startRecording}
              disabled={isRecording}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors text-sm"
            >
              Start Recording
            </button>
          </div>

          {/* Recording Interface */}
          {showRecording && (
            <div className="border-2 border-red-300 rounded-lg p-4 bg-red-50">
              <div className="text-center mb-3">
                <div className="text-lg font-bold text-red-600 mb-2">
                  {isRecording ? `Recording... ${formatTime(recordingTime)}` : 'Starting camera...'}
                </div>
                <video
                  ref={videoRef}
                  autoPlay
                  muted
                  playsInline
                  className="w-full rounded-lg max-h-48 bg-black"
                />
              </div>
              <div className="flex justify-center">
                {isRecording ? (
                  <button
                    type="button"
                    onClick={stopRecording}
                    className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors text-sm flex items-center"
                  >
                    <Square className="h-4 w-4 mr-2" />
                    Stop Recording
                  </button>
                ) : (
                  <div className="flex items-center text-gray-600">
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Initializing camera...
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
