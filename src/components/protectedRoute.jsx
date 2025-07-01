import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export default function ProtectedRoute({ children, requireRole = null }) {
  const { currentUser, userProfile, loading, firestoreError } = useAuth();
  const [checking, setChecking] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    // Wait for authentication to initialize
    if (loading) return;

    console.log('ProtectedRoute check:', { 
      currentUser: !!currentUser, 
      userProfile: !!userProfile, 
      firestoreError,
      currentPath: window.location.pathname 
    });

    // If no user is authenticated, redirect to auth
    if (!currentUser) {
      console.log('No current user, redirecting to auth');
      navigate('/auth');
      return;
    }

    // If user exists but no profile and we're not already on createProfile page
    if (currentUser && !userProfile && !firestoreError && window.location.pathname !== '/createProfile') {
      console.log('User exists but no profile found, redirecting to create profile');
      navigate('/createProfile');
      return;
    }

    // If we have firestore error, continue anyway (fallback profile should exist)
    if (currentUser && (userProfile || firestoreError)) {
      // If specific role is required and user doesn't have it
      if (requireRole && userProfile?.role !== requireRole) {
        console.log(`Role required: ${requireRole}, user has: ${userProfile?.role}`);
        navigate('/unauthorized');
        return;
      }
      
      console.log('All checks passed, allowing access');
      setChecking(false);
      return;
    }

    // If we have a user but still waiting for profile (not an error case)
    if (currentUser && !userProfile && !firestoreError) {
      console.log('User exists, waiting for profile to load...');
      // Don't redirect immediately, give it a moment to load
      const timeout = setTimeout(() => {
        if (!userProfile && window.location.pathname !== '/createProfile') {
          console.log('Profile still not loaded after timeout, redirecting to create profile');
          navigate('/createProfile');
        }
      }, 3000); // Wait 3 seconds for profile to load

      return () => clearTimeout(timeout);
    }

  }, [currentUser, userProfile, loading, navigate, requireRole, firestoreError]);

  // Show loading spinner while checking authentication or waiting for profile
  if (loading || (checking && currentUser && !userProfile && !firestoreError)) {
    const message = loading 
      ? 'Checking authentication...' 
      : 'Loading user profile...';
      
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">{message}</p>
          {firestoreError && (
            <p className="text-sm text-yellow-600 mt-2">
              Having trouble connecting to database...
            </p>
          )}
        </div>
      </div>
    );
  }

  // Only render children if user is authenticated and has proper access
  const shouldRender = currentUser && (userProfile || firestoreError);
  
  if (!shouldRender) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Preparing your dashboard...</p>
        </div>
      </div>
    );
  }

  return children;
}