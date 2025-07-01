// src/components/UnauthorizedPage.jsx
import React from 'react';
import { Link } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function UnauthorizedPage() {
  const { userProfile } = useAuth();

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <AlertCircle className="h-16 w-16 text-red-500 mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              Sorry, you don't have permission to access this page.
            </p>
          </div>

          <div className="bg-gray-50 rounded-lg p-4 mb-6">
            <h3 className="font-medium text-gray-900 mb-2">Your Current Role:</h3>
            <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 capitalize">
              {userProfile?.role || 'Unknown'}
            </span>
          </div>

          <div className="space-y-3">
            <Link
              to="/dashboard"
              className="btn-primary btn-full flex items-center justify-center gap-2"
            >
              <Home size={16} />
              Return to Dashboard
            </Link>
            
            <button
              onClick={() => window.history.back()}
              className="btn-secondary btn-full flex items-center justify-center gap-2"
            >
              <ArrowLeft size={16} />
              Go Back
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              If you believe this is an error, please contact your administrator.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}