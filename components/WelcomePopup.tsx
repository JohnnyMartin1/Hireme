"use client";
import { useState, useEffect } from "react";
import { X, User, Briefcase, Video, FileText, Link as LinkIcon, Star, MessageSquare, Search, DollarSign, CheckCircle, XCircle, UserCheck, Mail, ClipboardList, Handshake, Gauge, UserPlus, PlusCircle, ArrowRight, ArrowLeft } from "lucide-react";
import Link from "next/link";

interface WelcomePopupProps {
  isVisible: boolean;
  onClose: () => void;
}

export default function WelcomePopup({ isVisible, onClose }: WelcomePopupProps) {
  const [isClosing, setIsClosing] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
      setIsClosing(false);
      setCurrentPage(0); // Reset to first page when closing
    }, 200);
  };

  const handleNextPage = () => {
    if (currentPage < pages.length - 1) {
      setCurrentPage(currentPage + 1);
    }
  };

  const handlePrevPage = () => {
    if (currentPage > 0) {
      setCurrentPage(currentPage - 1);
    }
  };

  if (!isVisible) return null;

  // Define the content for each page
  const pages = [
    // Page 1: Welcome to HireMe for Job Seekers!
    <div key="page1" className="flex flex-col items-center justify-center h-full text-center px-4 sm:px-6 md:px-8">
      <div className="max-w-4xl w-full">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold mb-4 sm:mb-6 leading-tight text-navy-900 tracking-tight">
          👋 Welcome to HireMe for Job Seekers!
        </h1>
        <p className="text-slate-600 text-base sm:text-lg md:text-xl lg:text-2xl max-w-3xl mx-auto leading-relaxed">
          We're excited to have you on board! HireMe was built to make job searching faster, smarter, and more human — so you can skip messy job boards, endless applications, and focus on opportunities that actually fit your goals.
        </p>
      </div>
    </div>,

    // Page 2: Complete Your Profile
    <div key="page2" className="flex flex-col items-center justify-center h-full px-4 sm:px-6 md:px-8">
      <div className="max-w-4xl w-full">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-navy-900 mb-4 sm:mb-6 md:mb-8 text-center tracking-tight">🚀 How HireMe Works</h2>
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border-2 border-slate-100 border-t-4 border-t-sky-500">
          <div className="flex items-center mb-4 sm:mb-6">
            <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-sky-500 text-white rounded-full text-xl sm:text-2xl font-bold mr-3 sm:mr-4 flex-shrink-0">1</span>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-navy-900">Complete Your Profile</h3>
          </div>
          <p className="text-slate-600 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 leading-relaxed">Build a comprehensive profile that showcases your skills and experience:</p>
          <ul className="list-none space-y-2 sm:space-y-3 text-slate-600 mb-4 sm:mb-6">
            <li className="flex items-center text-sm sm:text-base md:text-lg"><User className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500 mr-2 sm:mr-3 flex-shrink-0" /> Education, experience, and key skills</li>
            <li className="flex items-center text-sm sm:text-base md:text-lg"><FileText className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500 mr-2 sm:mr-3 flex-shrink-0" /> Links to your resume, portfolio, and social profiles</li>
            <li className="flex items-center text-sm sm:text-base md:text-lg"><Video className="h-4 w-4 sm:h-5 sm:w-5 text-sky-500 mr-2 sm:mr-3 flex-shrink-0" /> A short video introduction</li>
          </ul>
          <div className="bg-sky-50 p-3 sm:p-4 rounded-xl border-l-4 border-sky-500">
            <p className="text-navy-800 text-sm sm:text-base md:text-lg">
              <span className="font-semibold">💡 Tip:</span> The more complete your profile, the more likely employers are to reach out with relevant opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>,

    // Page 3: Employers Find You
    <div key="page3" className="flex flex-col items-center justify-center h-full px-4 sm:px-6 md:px-8">
      <div className="max-w-4xl w-full">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-navy-900 mb-4 sm:mb-6 md:mb-8 text-center tracking-tight">🚀 How HireMe Works</h2>
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border-2 border-slate-100 border-t-4 border-t-navy-600">
          <div className="flex items-center mb-4 sm:mb-6">
            <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-navy-600 text-white rounded-full text-xl sm:text-2xl font-bold mr-3 sm:mr-4 flex-shrink-0">2</span>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-navy-900">Employers Find You</h3>
          </div>
          <p className="text-slate-600 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 leading-relaxed">Instead of applying to hundreds of jobs, employers reach out to you:</p>
          <ul className="list-none space-y-2 sm:space-y-3 text-slate-600 mb-4 sm:mb-6">
            <li className="flex items-center text-sm sm:text-base md:text-lg"><Search className="h-4 w-4 sm:h-5 sm:w-5 text-navy-600 mr-2 sm:mr-3 flex-shrink-0" /> They search for candidates matching specific criteria</li>
            <li className="flex items-center text-sm sm:text-base md:text-lg"><MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-navy-600 mr-2 sm:mr-3 flex-shrink-0" /> They message you directly with job opportunities</li>
            <li className="flex items-center text-sm sm:text-base md:text-lg"><Star className="h-4 w-4 sm:h-5 sm:w-5 text-navy-600 mr-2 sm:mr-3 flex-shrink-0" /> They can save your profile for future opportunities</li>
          </ul>
          <div className="bg-slate-50 p-3 sm:p-4 rounded-xl border-l-4 border-navy-600">
            <p className="text-navy-800 text-sm sm:text-base md:text-lg">
              <span className="font-semibold">🎯 Result:</span> Quality conversations with employers who are actively looking for someone like you.
            </p>
          </div>
        </div>
      </div>
    </div>,

    // Page 4: Connect & Get Hired
    <div key="page4" className="flex flex-col items-center justify-center h-full px-4 sm:px-6 md:px-8">
      <div className="max-w-4xl w-full">
        <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-navy-900 mb-4 sm:mb-6 md:mb-8 text-center tracking-tight">🚀 How HireMe Works</h2>
        <div className="bg-white rounded-2xl shadow-lg p-4 sm:p-6 md:p-8 border-2 border-slate-100 border-t-4 border-t-sky-400">
          <div className="flex items-center mb-4 sm:mb-6">
            <span className="flex items-center justify-center w-10 h-10 sm:w-12 sm:h-12 bg-sky-400 text-white rounded-full text-xl sm:text-2xl font-bold mr-3 sm:mr-4 flex-shrink-0">3</span>
            <h3 className="text-lg sm:text-xl md:text-2xl font-bold text-navy-900">Connect & Get Hired</h3>
          </div>
          <p className="text-slate-600 text-sm sm:text-base md:text-lg mb-4 sm:mb-6 leading-relaxed">Build relationships and land your dream job:</p>
          <ul className="list-none space-y-2 sm:space-y-3 text-slate-600 mb-4 sm:mb-6">
            <li className="flex items-center text-sm sm:text-base md:text-lg"><MessageSquare className="h-4 w-4 sm:h-5 sm:w-5 text-sky-400 mr-2 sm:mr-3 flex-shrink-0" /> Respond to messages and schedule interviews</li>
            <li className="flex items-center text-sm sm:text-base md:text-lg"><Handshake className="h-4 w-4 sm:h-5 sm:w-5 text-sky-400 mr-2 sm:mr-3 flex-shrink-0" /> Build relationships with potential employers</li>
            <li className="flex items-center text-sm sm:text-base md:text-lg"><Briefcase className="h-4 w-4 sm:h-5 sm:w-5 text-sky-400 mr-2 sm:mr-3 flex-shrink-0" /> Get hired for roles that actually fit your goals</li>
          </ul>
          <div className="bg-sky-50 p-3 sm:p-4 rounded-xl border-l-4 border-sky-400">
            <p className="text-navy-800 text-sm sm:text-base md:text-lg">
              <span className="font-semibold">🏆 Success:</span> Skip the application black hole and get straight to meaningful conversations.
            </p>
          </div>
        </div>
      </div>
    </div>,

    // Page 5: Quality and Accountability + Ready to Get Started
    <div key="page5" className="flex flex-col items-center justify-center h-full px-4 sm:px-6 md:px-8">
      <div className="max-w-4xl w-full">
        <h2 className="text-lg sm:text-2xl md:text-3xl font-bold text-navy-900 mb-3 sm:mb-6 md:mb-8 text-center tracking-tight">⭐ Quality & Accountability</h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6 mb-4 sm:mb-6">
          <div className="flex items-start p-3 sm:p-6 bg-sky-50 rounded-xl border-2 border-slate-100">
            <CheckCircle className="h-5 w-5 sm:h-8 sm:w-8 text-sky-600 mr-2 sm:mr-4 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm sm:text-xl font-bold text-navy-900 mb-1 sm:mb-3">For Employers</h3>
              <p className="text-xs sm:text-base md:text-lg leading-relaxed text-slate-600">Must post real jobs before reaching out.</p>
            </div>
          </div>
          <div className="flex items-start p-3 sm:p-6 bg-slate-50 rounded-xl border-2 border-slate-100">
            <UserCheck className="h-5 w-5 sm:h-8 sm:w-8 text-navy-600 mr-2 sm:mr-4 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="text-sm sm:text-xl font-bold text-navy-900 mb-1 sm:mb-3">For You</h3>
              <p className="text-xs sm:text-base md:text-lg leading-relaxed text-slate-600">We remove unresponsive employers.</p>
            </div>
          </div>
        </div>

        <div className="bg-gradient-to-r from-navy-800 to-navy-600 text-white py-4 sm:py-8 px-4 sm:px-6 rounded-2xl shadow-lg text-center">
          <h2 className="text-lg sm:text-2xl md:text-3xl font-bold mb-2 sm:mb-4 tracking-tight">🎯 Ready to Get Started?</h2>
          <p className="text-slate-100 text-sm sm:text-lg md:text-xl mb-3 sm:mb-6 max-w-2xl mx-auto leading-relaxed">
            Complete your profile to start receiving messages from employers.
          </p>
          <Link 
            href="/home/seeker"
            onClick={handleClose}
            className="inline-flex items-center px-5 py-2.5 sm:px-8 sm:py-4 bg-white text-navy-800 font-bold rounded-lg shadow-lg hover:bg-sky-50 hover:scale-105 transition-all duration-300 text-sm sm:text-base md:text-lg min-h-[44px]"
          >
            Finish
          </Link>
        </div>
      </div>
    </div>
  ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'} mobile-safe-top mobile-safe-bottom`}>
      <div className={`bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-2 sm:mx-4 max-h-[95vh] sm:max-h-[90vh] relative flex flex-col transform transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-2 right-2 sm:top-4 sm:left-4 z-10 p-2 sm:p-2 hover:bg-slate-100 rounded-full transition-colors min-h-[44px] min-w-[44px] flex items-center justify-center"
        >
          <X className="h-5 w-5 sm:h-6 sm:w-6 text-slate-600" />
        </button>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-4 sm:p-6 md:p-8 min-h-[400px] sm:min-h-[500px] overflow-y-auto">
          <div className="w-full transition-all duration-300 ease-in-out">
            {pages[currentPage]}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-3 sm:p-4 md:p-6 border-t-2 border-slate-100 bg-slate-50 rounded-b-2xl gap-2 sm:gap-4">
          {/* Previous Button */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className={`flex items-center justify-center px-3 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base min-h-[44px] flex-shrink-0 ${
              currentPage === 0 
                ? 'text-slate-400 cursor-not-allowed opacity-50' 
                : 'text-navy-800 hover:bg-sky-50 active:bg-sky-100'
            }`}
          >
            <ArrowLeft className="h-4 w-4 sm:h-5 sm:w-5 mr-1 sm:mr-2 flex-shrink-0" />
            <span className="hidden sm:inline whitespace-nowrap">Previous</span>
            <span className="sm:hidden whitespace-nowrap">Prev</span>
          </button>

          {/* Page Indicators */}
          <div className="flex items-center space-x-0.5 sm:space-x-3 flex-shrink-0">
            {pages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`welcome-popup-indicator rounded-full transition-all duration-200 flex-shrink-0 sm:w-3 sm:h-3 ${
                  index === currentPage 
                    ? 'bg-navy-800' 
                    : 'bg-slate-300 active:bg-slate-400'
                }`}
                aria-label={`Go to page ${index + 1}`}
              />
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={handleNextPage}
            disabled={currentPage === pages.length - 1}
            className={`flex items-center justify-center px-3 py-2.5 sm:px-6 sm:py-3 rounded-lg font-semibold transition-all duration-200 text-sm sm:text-base min-h-[44px] flex-shrink-0 whitespace-nowrap ${
              currentPage === pages.length - 1
                ? 'text-slate-400 cursor-not-allowed opacity-50'
                : 'bg-navy-800 text-white hover:bg-navy-700 active:bg-navy-600 shadow-lg'
            }`}
          >
            <span>Next</span>
            <ArrowRight className="h-4 w-4 sm:h-5 sm:w-5 ml-1 sm:ml-2 flex-shrink-0" />
          </button>
        </div>
      </div>
    </div>
  );
}
