'use client';

import React from 'react';
import Link from 'next/link'; // Import Link for navigation

export default function ProfilePage() {
  return (
    <div className="min-h-screen bg-[#201819] text-white p-8 flex flex-col items-center">
      {/* Back Button */}  
      <div className="absolute top-8 left-8 z-10">
        <Link href="/" className="px-4 py-2 bg-white/10 border border-white/20 text-white rounded-lg hover:bg-white/20 transition-colors flex items-center gap-2">
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth="1.5" stroke="currentColor" className="w-5 h-5">
            <path strokeLinecap="round" strokeLinejoin="round" d="M10.5 19.5 3 12m0 0 7.5-7.5M3 12h18" />
          </svg>
          Back to Library
        </Link>
      </div>

      <h1 className="text-3xl font-serif italic mb-8 mt-16">User Profile & Settings</h1>

      <div className="bg-[#2d2627] p-6 rounded-lg shadow-lg w-full max-w-md">
        <h2 className="text-xl font-semibold mb-4">Account Details</h2>
        {/* Placeholder content */}  
        <div className="space-y-3 text-gray-300">
          <p><strong>Email:</strong> user@example.com (placeholder)</p>
          <p><strong>Joined:</strong> January 1, 2024 (placeholder)</p>
          {/* Add more profile details here */}  
        </div>
      </div>

      <div className="bg-[#2d2627] p-6 rounded-lg shadow-lg w-full max-w-md mt-6">
        <h2 className="text-xl font-semibold mb-4">Preferences</h2>
        {/* Placeholder content */}  
        <div className="space-y-3 text-gray-300">
          <p>Reading Theme: Dark (placeholder)</p>
          <p>Notifications: Enabled (placeholder)</p>
          {/* Add more settings options here */} 
        </div>
      </div>

      {/* Add more sections like Security, Billing, etc. as needed */}
    </div>
  );
} 