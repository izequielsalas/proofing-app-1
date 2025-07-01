// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext({});

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState(false);
  const [isPrivate, setIsPrivate] = useState(false);

  // Check for private browsing mode
  useEffect(() => {
    const checkPrivateBrowsing = () => {
      try {
        localStorage.setItem('test', 'test');
        localStorage.removeItem('test');
        setIsPrivate(false);
      } catch {
        setIsPrivate(true);
      }
    };
    
    checkPrivateBrowsing();
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user?.email);
      setCurrentUser(user);
      
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        
        // Try to get user profile from Firestore
        try {
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            console.log('User profile found in Firestore');
            // Set up real-time listener for profile updates
            const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
              if (doc.exists()) {
                setUserProfile(doc.data());
                setLoading(false);
              } else {
                createUserProfile(user);
              }
            }, (error) => {
              console.error('Profile listener error:', error);
              setFirestoreError(true);
              fetchUserProfileOnce(userDocRef, user);
            });
            
            return () => unsubscribeProfile();
          } else {
            console.log('No user profile found, creating one');
            createUserProfile(user);
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
          setFirestoreError(true);
          fetchUserProfileOnce(userDocRef, user);
        }
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const fetchUserProfileOnce = async (userDocRef, user) => {
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        console.log('User profile fetched once');
        setUserProfile(userDoc.data());
        setLoading(false);
      } else {
        createUserProfile(user);
      }
    } catch (error) {
      console.error('One-time fetch also failed:', error);
      // Create fallback profile for private browsing
      const fallbackProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        role: 'client',
        createdAt: new Date(),
        updatedAt: new Date(),
        isActive: true,
        clientId: user.uid,
        permissions: {
          canViewAllProofs: false,
          canUploadProofs: false,
          canApproveProofs: true,
          canManageUsers: false
        }
      };
      console.log('Using fallback profile');
      setUserProfile(fallbackProfile);
      setLoading(false);
    }
  };

  const createUserProfile = async (user) => {
    console.log('Creating new user profile for:', user.email);
    const userRef = doc(db, 'users', user.uid);
    const defaultProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email,
      role: 'client', // Default role
      createdAt: new Date(),
      updatedAt: new Date(),
      isActive: true,
      clientId: user.uid, // For clients, their clientId is their own uid
      permissions: {
        canViewAllProofs: false,
        canUploadProofs: false,
        canApproveProofs: true,
        canManageUsers: false
      }
    };
    
    try {
      await setDoc(userRef, defaultProfile);
      setUserProfile(defaultProfile);
      setLoading(false);
      console.log('User profile created successfully');
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Set profile in memory even if Firestore write fails
      setUserProfile(defaultProfile);
      setLoading(false);
    }
  };

  // Role checking helpers
  const isAdmin = () => userProfile?.role === 'admin';
  const isClient = () => userProfile?.role === 'client';
  const isDesigner = () => userProfile?.role === 'designer';
  
  const hasPermission = (permission) => {
    // Special handling for upload permissions - both admins and designers can upload
    if (permission === 'canUploadProofs') {
      return isAdmin() || isDesigner();
    }
    return userProfile?.permissions?.[permission] || isAdmin();
  };

  const canViewProof = (proof) => {
    if (isAdmin()) return true;
    if (isClient()) return proof.clientId === userProfile.clientId;
    if (isDesigner()) return proof.assignedTo?.includes(userProfile.uid) || proof.uploadedBy === userProfile.uid;
    return false;
  };

  // Enhanced permission for assigning proofs to clients
  const canAssignProofs = () => {
    return isAdmin() || isDesigner();
  };

  // Refresh user profile (useful in private browsing)
  const refreshUserProfile = async () => {
    if (currentUser) {
      setLoading(true);
      const userDocRef = doc(db, 'users', currentUser.uid);
      await fetchUserProfileOnce(userDocRef, currentUser);
    }
  };

  const value = {
    currentUser,
    userProfile,
    isAdmin,
    isClient,
    isDesigner,
    hasPermission,
    canViewProof,
    canAssignProofs,
    loading,
    isPrivateBrowsing: isPrivate,
    firestoreError,
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
      {/* Debug info for development */}
      {process.env.NODE_ENV === 'development' && isPrivate && (
        <div className="fixed bottom-4 right-4 bg-yellow-100 border border-yellow-400 text-yellow-800 px-3 py-2 rounded text-sm">
          Private Browsing Mode Detected
        </div>
      )}
    </AuthContext.Provider>
  );
}