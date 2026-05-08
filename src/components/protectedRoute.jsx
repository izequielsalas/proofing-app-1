import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requireRole = null }) {
  const { currentUser, userProfile, loading, firestoreError } = useAuth();
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    if (loading) return;

    console.log('ProtectedRoute check:', {
      currentUser: !!currentUser,
      userProfile: !!userProfile,
      firestoreError,
      currentPath: window.location.pathname
    });

    // Not logged in — send to auth
    if (!currentUser) {
      navigate('/auth');
      return;
    }

    // Logged in but no profile found — not an invited user
    // Sign them out and redirect with an error message
    if (currentUser && firestoreError === 'no_profile') {
      console.warn('Authenticated user has no profile — signing out');
      signOut(auth).then(() => {
        navigate('/auth', {
          state: { error: 'No account found. Please contact Cesar Graphics for an invitation.' }
        });
      });
      return;
    }

    // Generic connection error — show message but don't boot them
    if (currentUser && firestoreError === 'error') {
      console.warn('Firestore error loading profile');
      setChecking(false);
      return;
    }

    // Logged in with profile — check role if required
    if (currentUser && userProfile) {
      if (requireRole && userProfile.role !== requireRole) {
        console.log(`Role required: ${requireRole}, user has: ${userProfile.role}`);
        navigate('/unauthorized');
        return;
      }
      setChecking(false);
      return;
    }

  }, [currentUser, userProfile, loading, navigate, requireRole, firestoreError]);

  // Loading state
  if (loading || (checking && currentUser && !userProfile && !firestoreError)) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-cesar-navy mx-auto mb-4"></div>
          <p className="text-gray-600">
            {loading ? 'Checking authentication...' : 'Loading your profile...'}
          </p>
          {firestoreError === 'error' && (
            <p className="text-sm text-[#92690B] mt-2">
              Having trouble connecting. Please refresh the page.
            </p>
          )}
        </div>
      </div>
    );
  }

  if (!currentUser || (!userProfile && !firestoreError)) {
    return null;
  }

  return children;
}