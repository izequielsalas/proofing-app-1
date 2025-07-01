// src/contexts/AuthContext.jsx
import React, { createContext, useContext, useEffect, useState } from 'react';
import { auth, db } from '../firebase';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setCurrentUser(user);
        
        // Subscribe to user profile for real-time role updates
        const userDocRef = doc(db, 'users', user.uid);
        const unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const profileData = doc.data();
            setUserProfile(profileData);
          } else {
            // Create default user profile if it doesn't exist
            createUserProfile(user);
          }
          setLoading(false);
        });
        
        return () => unsubscribeProfile();
      } else {
        setCurrentUser(null);
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const createUserProfile = async (user) => {
    const userRef = doc(db, 'users', user.uid);
    const defaultProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || '',
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
    } catch (error) {
      console.error('Error creating user profile:', error);
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

  const value = {
    currentUser,
    userProfile,
    isAdmin,
    isClient,
    isDesigner,
    hasPermission,
    canViewProof,
    loading
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}