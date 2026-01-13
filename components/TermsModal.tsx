"use client";
import { X } from "lucide-react";
import Link from "next/link";
import { useEffect } from "react";

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAccept?: () => void;
}

export default function TermsModal({ isOpen, onClose, onAccept }: TermsModalProps) {
  const handleAccept = () => {
    if (onAccept) {
      onAccept();
    }
    onClose();
  };
  // Close on Escape key
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';
    }

    return () => {
      document.removeEventListener('keydown', handleEscape);
      document.body.style.overflow = 'unset';
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div 
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div 
        className="bg-white rounded-2xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200 flex-shrink-0">
          <h2 className="text-2xl font-bold text-navy-900">Terms of Service (Candidates)</h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600 transition-colors p-2 hover:bg-slate-100 rounded-lg"
            aria-label="Close"
          >
            <X className="h-6 w-6" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          <div className="max-w-none">
            <p className="text-slate-600 mb-6 text-sm">Last Updated: January 10, 2026</p>
            <div className="space-y-6 text-slate-700 leading-relaxed">
              <div className="bg-sky-50 border border-sky-200 rounded-lg p-4 mb-6">
                <h3 className="font-semibold text-navy-900 mb-2">Key Points:</h3>
                <ul className="space-y-2 text-sm list-disc list-inside text-slate-700">
                  <li>You must be at least 18 years old to use HireMe</li>
                  <li>HireMe is free for candidates - employers pay for the service</li>
                  <li>You own your content, but grant HireMe license to use it on the platform</li>
                  <li>HireMe facilitates connections but is not involved in hiring decisions</li>
                  <li>You agree to use the platform responsibly and legally</li>
                  <li>Disputes are resolved through arbitration (you can opt out within 30 days)</li>
                </ul>
              </div>
              
              <p className="text-slate-700">
                Welcome to HireMe. These Terms of Service ("Terms") are a legal agreement between you and HireMe LLC ("HireMe," "we," "us," or "our"), governing your use of the HireMe website, platform, and services (collectively, the "Platform"). By accessing or using the Platform, you agree to be bound by these Terms and our Privacy Policy and Cookie Policy (collectively, the "Agreement"). If you do not agree, do not use HireMe.
              </p>
              
              <p className="text-slate-700">
                <strong className="text-navy-900">Eligibility:</strong> You must be at least 18 years old (or the age of majority in your jurisdiction) to use HireMe.
              </p>
              
              <p className="text-slate-700">
                <strong className="text-navy-900">Free for Candidates:</strong> The Platform is free for Candidate users. HireMe does not charge Candidates any fee to create an account or to be contacted by Employers.
              </p>
              
              <p className="text-slate-700">
                <strong className="text-navy-900">Your Content:</strong> You retain ownership of your User Content, but grant HireMe a license to use it to operate and promote the Platform.
              </p>
              
              <p className="text-sm text-slate-600 bg-slate-50 border border-slate-200 rounded-lg p-4">
                <strong>Please review the{" "}
                <Link href="/terms/candidates" target="_blank" className="text-navy-800 hover:underline font-semibold">
                  complete Terms of Service
                </Link>
                {" "}for full legal details, including arbitration agreements, liability limitations, and all terms and conditions.</strong>
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-6 border-t border-slate-200 flex-shrink-0 flex items-center justify-between">
          <Link 
            href="/terms/candidates" 
            target="_blank"
            className="text-sm text-navy-800 hover:text-navy-700 font-semibold hover:underline"
          >
            View Full Terms →
          </Link>
          <button
            onClick={handleAccept}
            className="px-6 py-2.5 bg-navy-800 text-white rounded-lg font-semibold hover:bg-navy-700 transition-colors"
          >
            I've Read the Terms
          </button>
        </div>
      </div>
    </div>
  );
}
