// src/components/ProtectedRoute.jsx
import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

const KNOWN_ROLES = ['admin', 'designer', 'client', 'production'];

export default function ProtectedRoute({ children, requireRole = null }) {
  const { currentUser, userProfile, loading, firestoreError } = useAuth();
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    // 1. Not logged in at all
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    // 2. Logged in, profile not found anywhere — auto sign out
    if (firestoreError === 'no_profile') {
      console.warn('No profile found — signing out');
      signOut(auth).then(() => {
        navigate('/auth', {
          state: { error: 'No account found. Please contact Cesar Graphics for an invitation.' }
        });
      });
      return;
    }

    // 3. Firestore connection error — let them see an error state, don't boot
    if (firestoreError === 'error') {
      setChecking(false);
      return;
    }

    // 4. Profile loaded — run all checks
    if (currentUser && userProfile) {

      // 4a. Account is deactivated
      if (userProfile.isActive === false) {
        navigate('/unauthorized', {
          state: { reason: 'inactive' }
        });
        return;
      }

      // 4b. Role is missing or unrecognized
      if (!userProfile.role || !KNOWN_ROLES.includes(userProfile.role)) {
        console.warn('User has unknown/missing role:', userProfile.role);
        navigate('/unauthorized', {
          state: { reason: 'no_role' }
        });
        return;
      }

      // 4c. Page requires a specific role the user doesn't have
      if (requireRole && userProfile.role !== requireRole) {
        navigate('/unauthorized', {
          state: { reason: 'wrong_role', required: requireRole }
        });
        return;
      }

      setChecking(false);
      return;
    }

  }, [currentUser, userProfile, loading, navigate, requireRole, firestoreError]);

  // Loading spinner
  if (loading || (checking && currentUser && !userProfile && !firestoreError)) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cesar-navy mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Checking authentication...' : 'Loading your profile...'}
          </p>
        </div>
      </div>
    );
  }

  // Firestore connection error with retry option
  if (firestoreError === 'error' && currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-4xl mb-4">⚠️</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Connection Problem</h2>
          <p className="text-gray-600 mb-6">
            Having trouble connecting to the database. Please try refreshing the page.
          </p>
          <div className="space-y-3">
            <button
              onClick={() => window.location.reload()}
              className="w-full px-4 py-2 bg-cesar-navy hover:bg-[#003070] text-white rounded-lg transition-colors"
            >
              Refresh Page
            </button>
            <button
              onClick={() => signOut(auth).then(() => navigate('/auth'))}
              className="w-full px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
            >
              Sign Out
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!currentUser || (!userProfile && !firestoreError)) {
    return null;
  }

  return children;
}