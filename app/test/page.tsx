"use client";

export default function TestPage() {
  return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-blue-600 mb-4">
          Test Page Working! ✅
        </h1>
        <p className="text-gray-600 mb-4">
          If you can see this, the Next.js server is working correctly.
        </p>
        <a 
          href="/" 
          className="text-blue-500 hover:underline"
        >
          ← Back to Home
        </a>
      </div>
    </div>
  );
}
