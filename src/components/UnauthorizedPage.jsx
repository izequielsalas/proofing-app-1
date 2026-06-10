// src/components/UnauthorizedPage.jsx
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertCircle, Home, ArrowLeft, LogOut } from 'lucide-react';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function UnauthorizedPage() {
  const { userProfile, currentUser } = useAuth();
  const navigate = useNavigate();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await signOut(auth);
      navigate('/auth');
    } catch (err) {
      console.error('Sign out error:', err);
      setSigningOut(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full text-center">
        <div className="bg-white rounded-lg shadow-lg p-8">
          <div className="mb-6">
            <AlertCircle className="h-16 w-16 text-cesar-magenta mx-auto mb-4" />
            <h1 className="text-2xl font-bold text-gray-900 mb-2">
              Access Denied
            </h1>
            <p className="text-gray-600">
              You don't have permission to access this page.
            </p>
          </div>

          {/* Show current user info to help diagnose issues */}
          <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
            <h3 className="font-medium text-gray-900 mb-2">Account Info:</h3>
            <div className="space-y-1 text-sm text-gray-600">
              <p><span className="font-medium">Email:</span> {currentUser?.email || 'Unknown'}</p>
              <p>
                <span className="font-medium">Role:</span>{' '}
                {userProfile?.role
                  ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-[#E0EAF5] text-cesar-navy capitalize">{userProfile.role}</span>
                  : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-700">No role assigned</span>
                }
              </p>
              <p>
                <span className="font-medium">Status:</span>{' '}
                {userProfile?.isActive === false
                  ? <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-700">Inactive</span>
                  : <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-700">Active</span>
                }
              </p>
            </div>
          </div>

          <div className="space-y-3">
            {/* Only show dashboard link if they have a valid role */}
            {userProfile?.role && userProfile?.isActive !== false && (
              <button
                onClick={() => navigate('/dashboard')}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-cesar-navy hover:bg-[#003070] text-white rounded-lg transition-colors"
              >
                <Home size={16} />
                Return to Dashboard
              </button>
            )}

            <button
              onClick={() => window.history.back()}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              <ArrowLeft size={16} />
              Go Back
            </button>

            {/* Always show logout — the escape hatch */}
            <button
              onClick={handleSignOut}
              disabled={signingOut}
              className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-50 hover:bg-red-100 text-red-700 border border-red-200 rounded-lg transition-colors disabled:opacity-50"
            >
              <LogOut size={16} />
              {signingOut ? 'Signing Out...' : 'Sign Out'}
            </button>
          </div>

          <div className="mt-6 pt-4 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              If your role is missing or incorrect, ask your administrator to update your account in User Management.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}