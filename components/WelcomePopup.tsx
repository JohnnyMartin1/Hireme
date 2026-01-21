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
    <div key="page1" className="flex flex-col items-center justify-center h-full text-center px-8">
      <div className="max-w-4xl">
        <h1 className="text-4xl md:text-5xl font-bold mb-6 leading-tight text-navy-900 tracking-tight">
          👋 Welcome to HireMe for Job Seekers!
        </h1>
        <p className="text-slate-600 text-xl md:text-2xl max-w-3xl mx-auto leading-relaxed">
          We're excited to have you on board! HireMe was built to make job searching faster, smarter, and more human — so you can skip messy job boards, endless applications, and focus on opportunities that actually fit your goals.
        </p>
      </div>
    </div>,

    // Page 2: Complete Your Profile
    <div key="page2" className="flex flex-col items-center justify-center h-full px-8">
      <div className="max-w-4xl w-full">
        <h2 className="text-3xl font-bold text-navy-900 mb-8 text-center tracking-tight">🚀 How HireMe Works</h2>
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-slate-100 border-t-4 border-t-sky-500">
          <div className="flex items-center mb-6">
            <span className="flex items-center justify-center w-12 h-12 bg-sky-500 text-white rounded-full text-2xl font-bold mr-4">1</span>
            <h3 className="text-2xl font-bold text-navy-900">Complete Your Profile</h3>
          </div>
          <p className="text-slate-600 text-lg mb-6 leading-relaxed">Build a comprehensive profile that showcases your skills and experience:</p>
          <ul className="list-none space-y-3 text-slate-600 mb-6">
            <li className="flex items-center text-lg"><User className="h-5 w-5 text-sky-500 mr-3" /> Education, experience, and key skills</li>
            <li className="flex items-center text-lg"><FileText className="h-5 w-5 text-sky-500 mr-3" /> Links to your resume, portfolio, and social profiles</li>
            <li className="flex items-center text-lg"><Video className="h-5 w-5 text-sky-500 mr-3" /> A short video introduction</li>
          </ul>
          <div className="bg-sky-50 p-4 rounded-xl border-l-4 border-sky-500">
            <p className="text-navy-800 text-lg">
              <span className="font-semibold">💡 Tip:</span> The more complete your profile, the more likely employers are to reach out with relevant opportunities.
            </p>
          </div>
        </div>
      </div>
    </div>,

    // Page 3: Employers Find You
    <div key="page3" className="flex flex-col items-center justify-center h-full px-8">
      <div className="max-w-4xl w-full">
        <h2 className="text-3xl font-bold text-navy-900 mb-8 text-center tracking-tight">🚀 How HireMe Works</h2>
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-slate-100 border-t-4 border-t-navy-600">
          <div className="flex items-center mb-6">
            <span className="flex items-center justify-center w-12 h-12 bg-navy-600 text-white rounded-full text-2xl font-bold mr-4">2</span>
            <h3 className="text-2xl font-bold text-navy-900">Employers Find You</h3>
          </div>
          <p className="text-slate-600 text-lg mb-6 leading-relaxed">Instead of applying to hundreds of jobs, employers reach out to you:</p>
          <ul className="list-none space-y-3 text-slate-600 mb-6">
            <li className="flex items-center text-lg"><Search className="h-5 w-5 text-navy-600 mr-3" /> They search for candidates matching specific criteria</li>
            <li className="flex items-center text-lg"><MessageSquare className="h-5 w-5 text-navy-600 mr-3" /> They message you directly with job opportunities</li>
            <li className="flex items-center text-lg"><Star className="h-5 w-5 text-navy-600 mr-3" /> They can save your profile for future opportunities</li>
          </ul>
          <div className="bg-slate-50 p-4 rounded-xl border-l-4 border-navy-600">
            <p className="text-navy-800 text-lg">
              <span className="font-semibold">🎯 Result:</span> Quality conversations with employers who are actively looking for someone like you.
            </p>
          </div>
        </div>
      </div>
    </div>,

    // Page 4: Connect & Get Hired
    <div key="page4" className="flex flex-col items-center justify-center h-full px-8">
      <div className="max-w-4xl w-full">
        <h2 className="text-3xl font-bold text-navy-900 mb-8 text-center tracking-tight">🚀 How HireMe Works</h2>
        <div className="bg-white rounded-2xl shadow-lg p-8 border-2 border-slate-100 border-t-4 border-t-sky-400">
          <div className="flex items-center mb-6">
            <span className="flex items-center justify-center w-12 h-12 bg-sky-400 text-white rounded-full text-2xl font-bold mr-4">3</span>
            <h3 className="text-2xl font-bold text-navy-900">Connect & Get Hired</h3>
          </div>
          <p className="text-slate-600 text-lg mb-6 leading-relaxed">Build relationships and land your dream job:</p>
          <ul className="list-none space-y-3 text-slate-600 mb-6">
            <li className="flex items-center text-lg"><MessageSquare className="h-5 w-5 text-sky-400 mr-3" /> Respond to messages and schedule interviews</li>
            <li className="flex items-center text-lg"><Handshake className="h-5 w-5 text-sky-400 mr-3" /> Build relationships with potential employers</li>
            <li className="flex items-center text-lg"><Briefcase className="h-5 w-5 text-sky-400 mr-3" /> Get hired for roles that actually fit your goals</li>
          </ul>
          <div className="bg-sky-50 p-4 rounded-xl border-l-4 border-sky-400">
            <p className="text-navy-800 text-lg">
              <span className="font-semibold">🏆 Success:</span> Skip the application black hole and get straight to meaningful conversations.
            </p>
          </div>
        </div>
      </div>
    </div>,

    // Page 5: Quality and Accountability + Ready to Get Started
    <div key="page5" className="flex flex-col items-center justify-center h-full px-8">
      <div className="max-w-4xl w-full">
        <h2 className="text-3xl font-bold text-navy-900 mb-8 text-center tracking-tight">⭐ Quality and Accountability</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
          <div className="flex items-start p-6 bg-sky-50 rounded-xl border-2 border-slate-100">
            <CheckCircle className="h-8 w-8 text-sky-600 mr-4 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-navy-900 mb-3">For Employers</h3>
              <p className="text-slate-600 text-lg leading-relaxed">Employers must post real jobs before reaching out, ensuring you only hear about actual opportunities.</p>
            </div>
          </div>
          <div className="flex items-start p-6 bg-slate-50 rounded-xl border-2 border-slate-100">
            <UserCheck className="h-8 w-8 text-navy-600 mr-4 flex-shrink-0 mt-1" />
            <div>
              <h3 className="text-xl font-bold text-navy-900 mb-3">For You</h3>
              <p className="text-slate-600 text-lg leading-relaxed">We monitor employer responsiveness — any employers who consistently ignore messages or fail to reply professionally are removed from the platform.</p>
            </div>
          </div>
        </div>
        <p className="text-center text-slate-600 text-lg italic mb-8">
          This means you'll only interact with serious, professional employers who respect your time and expertise.
        </p>

        <div className="bg-gradient-to-r from-navy-800 to-navy-600 text-white py-8 px-6 rounded-2xl shadow-lg text-center">
          <h2 className="text-3xl font-bold mb-4 tracking-tight">🎯 Ready to Get Started?</h2>
          <p className="text-slate-100 text-xl mb-6 max-w-2xl mx-auto leading-relaxed">
            Complete your profile to start receiving messages from employers who are looking for someone exactly like you.
          </p>
          <Link 
            href="/account/profile"
            onClick={handleClose}
            className="inline-flex items-center px-8 py-4 bg-white text-navy-800 font-bold rounded-lg shadow-lg hover:bg-sky-50 hover:scale-105 transition-all duration-300 text-lg"
          >
            Start Building Your Profile <ArrowRight className="ml-2 h-5 w-5" />
          </Link>
        </div>
      </div>
    </div>
  ];

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50 transition-opacity duration-200 ${isClosing ? 'opacity-0' : 'opacity-100'}`}>
      <div className={`bg-white rounded-2xl shadow-2xl max-w-5xl w-full mx-4 max-h-[90vh] relative flex flex-col transform transition-all duration-200 ${isClosing ? 'scale-95 opacity-0' : 'scale-100 opacity-100'}`}>
        {/* Close Button */}
        <button
          onClick={handleClose}
          className="absolute top-4 left-4 z-10 p-2 hover:bg-slate-100 rounded-full transition-colors"
        >
          <X className="h-6 w-6 text-slate-600" />
        </button>

        {/* Content Area */}
        <div className="flex-1 flex items-center justify-center p-8 min-h-[500px]">
          <div className="w-full transition-all duration-300 ease-in-out">
            {pages[currentPage]}
          </div>
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between p-6 border-t-2 border-slate-100 bg-slate-50 rounded-b-2xl">
          {/* Previous Button */}
          <button
            onClick={handlePrevPage}
            disabled={currentPage === 0}
            className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              currentPage === 0 
                ? 'text-slate-400 cursor-not-allowed' 
                : 'text-navy-800 hover:bg-sky-50 hover:scale-105'
            }`}
          >
            <ArrowLeft className="h-5 w-5 mr-2" />
            Previous
          </button>

          {/* Page Indicators */}
          <div className="flex space-x-3">
            {pages.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentPage(index)}
                className={`w-3 h-3 rounded-full transition-all duration-200 ${
                  index === currentPage 
                    ? 'bg-navy-800 scale-125' 
                    : 'bg-slate-300 hover:bg-slate-400 hover:scale-110'
                }`}
              />
            ))}
          </div>

          {/* Next Button */}
          <button
            onClick={handleNextPage}
            disabled={currentPage === pages.length - 1}
            className={`flex items-center px-6 py-3 rounded-lg font-semibold transition-all duration-200 ${
              currentPage === pages.length - 1
                ? 'text-slate-400 cursor-not-allowed'
                : 'bg-navy-800 text-white hover:bg-navy-700 hover:scale-105 shadow-lg'
            }`}
          >
            Next
            <ArrowRight className="h-5 w-5 ml-2" />
          </button>
        </div>
      </div>
    </div>
  );
}
