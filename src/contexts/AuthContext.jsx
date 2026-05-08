// src/contexts/AuthContext.jsx - SIMPLIFIED: invite-only, no auto-create fallbacks

import React, { createContext, useContext, useState, useEffect } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, query, where, collection, getDocs } from 'firebase/firestore';
import { auth, db } from '../firebase';

const AuthContext = createContext();

export function useAuth() {
  return useContext(AuthContext);
}

export function AuthProvider({ children }) {
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [firestoreError, setFirestoreError] = useState(null);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      await findAndSetUserProfile(user);
    });

    return unsubscribe;
  }, []);

  const findAndSetUserProfile = async (user) => {
    try {
      setLoading(true);
      setFirestoreError(null);

      // Fast path: look up by UID
      const userDocSnap = await getDoc(doc(db, 'users', user.uid));
      if (userDocSnap.exists()) {
        setUserProfile({ id: userDocSnap.id, ...userDocSnap.data() });
        setLoading(false);
        return;
      }

      // Fallback: search by email (handles legacy users created before UID-as-docID)
      const emailSnapshot = await getDocs(query(
        collection(db, 'users'),
        where('email', '==', user.email.toLowerCase())
      ));

      if (!emailSnapshot.empty) {
        const profile = emailSnapshot.docs[0];
        setUserProfile({ id: profile.id, ...profile.data() });
        setLoading(false);
        return;
      }

      // No profile found — account not recognized
      console.warn('⚠️ No profile found for authenticated user:', user.email);
      setFirestoreError('no_profile');
      setLoading(false);

    } catch (error) {
      console.error('Error finding user profile:', error);
      setFirestoreError('error');
      setLoading(false);
    }
  };

  const refreshUserProfile = async () => {
    if (currentUser) {
      setLoading(true);
      await findAndSetUserProfile(currentUser);
    }
  };

  // Role checking helpers
  const isAdmin = () => userProfile?.role === 'admin';
  const isClient = () => userProfile?.role === 'client';
  const isDesigner = () => userProfile?.role === 'designer';

  const hasPermission = (permission) => {
    if (permission === 'canUploadProofs') return isAdmin() || isDesigner();
    return userProfile?.permissions?.[permission] || isAdmin();
  };

  const canViewProof = (proof) => {
    if (isAdmin()) return true;
    if (isClient()) return proof.clientId === userProfile?.clientId;
    if (isDesigner()) return proof.assignedTo?.includes(userProfile?.uid) || proof.uploadedBy === userProfile?.uid;
    return false;
  };

  const canAssignProofs = () => isAdmin() || isDesigner();

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
    firestoreError,
    refreshUserProfile,
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}