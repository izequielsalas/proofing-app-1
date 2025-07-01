// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db, isPrivateBrowsing } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, onSnapshot, setDoc } from 'firebase/firestore';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isPrivate, setIsPrivate] = useState(false);
  const [firestoreError, setFirestoreError] = useState(false);

  useEffect(() => {
    // Check if we're in private browsing mode
    isPrivateBrowsing().then(setIsPrivate);
  }, []);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log('Auth state changed:', user ? 'User logged in' : 'User logged out');
      
      if (user) {
        setCurrentUser(user);
        await handleUserProfile(user);
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, [isPrivate]);

  const handleUserProfile = async (user) => {
    try {
      const userDocRef = doc(db, 'users', user.uid);
      
      if (isPrivate) {
        // In private browsing, use one-time fetch instead of real-time listener
        console.log('Private browsing detected, using one-time fetch for user profile');
        await fetchUserProfileOnce(userDocRef, user);
      } else {
        // Normal browsing, use real-time listener
        const unsubscribeProfile = onSnapshot(
          userDocRef, 
          (doc) => {
            console.log('User profile snapshot received');
            if (doc.exists()) {
              const profileData = doc.data();
              setUserProfile(profileData);
            } else {
              console.log('User profile does not exist, creating default profile');
              createUserProfile(user);
            }
            setLoading(false);
            setFirestoreError(false);
          },
          (error) => {
            console.error('Firestore listener error:', error);
            setFirestoreError(true);
            // Fallback to one-time fetch
            fetchUserProfileOnce(userDocRef, user);
          }
        );
        
        return () => unsubscribeProfile();
      }
    } catch (error) {
      console.error('Error handling user profile:', error);
      setFirestoreError(true);
      setLoading(false);
    }
  };

  const fetchUserProfileOnce = async (userDocRef, user) => {
    try {
      const docSnap = await getDoc(userDocRef);
      if (docSnap.exists()) {
        const profileData = docSnap.data();
        setUserProfile(profileData);
        console.log('User profile loaded:', profileData.role);
      } else {
        console.log('User profile does not exist, creating default profile');
        await createUserProfile(user);
      }
      setLoading(false);
      setFirestoreError(false);
    } catch (error) {
      console.error('Error fetching user profile:', error);
      setFirestoreError(true);
      // Create a minimal default profile in memory as fallback
      const fallbackProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        role: 'client',
        isActive: true,
        clientId: user.uid,
        permissions: {
          canViewAllProofs: false,
          canUploadProofs: false,
          canApproveProofs: true,
          canManageUsers: false
        }
      };
      setUserProfile(fallbackProfile);
      setLoading(false);
    }
  };

  const createUserProfile = async (user) => {
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
      console.log('User profile created successfully');
    } catch (error) {
      console.error('Error creating user profile:', error);
      // Set profile in memory even if Firestore write fails
      setUserProfile(defaultProfile);
    }
  };

  // Role checking helpers
  const isAdmin = () => userProfile?.role === 'admin';
  const isClient = () => userProfile?.role === 'client';
  const isDesigner = () => userProfile?.role === 'designer';
  
  const hasPermission = (permission) => {
    return userProfile?.permissions?.[permission] || isAdmin();
  };

  const canViewProof = (proof) => {
    if (isAdmin()) return true;
    if (isClient()) return proof.clientId === userProfile.clientId;
    if (isDesigner()) return proof.assignedTo?.includes(userProfile.uid);
    return false;
  };

  // Refresh user profile (useful in private browsing)
  const refreshUserProfile = async () => {
    if (currentUser) {
      setLoading(true);
      await handleUserProfile(currentUser);
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