// src/contexts/AuthContext.jsx - FIXED VERSION

import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, onSnapshot, setDoc, getDoc, collection, query, where, getDocs } from 'firebase/firestore';
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
        // ⭐ NEW: Enhanced profile lookup that handles invitations
        await findAndSetUserProfile(user);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  // ⭐ NEW: Enhanced function to find user profile (handles invitations)
  const findAndSetUserProfile = async (user) => {
    try {
      console.log('🔍 Looking for user profile:', user.email);
      
      // Strategy 1: Look for profile with user's UID (normal case)
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);
      
      if (userDoc.exists()) {
        console.log('✅ Found profile by UID');
        setUserProfile(userDoc.data());
        setLoading(false);
        return;
      }
      
      // Strategy 2: Look for invitation record by email (invitation case)
      console.log('🔍 No profile by UID, checking for invitation...');
      const invitationQuery = query(
        collection(db, 'users'),
        where('email', '==', user.email.toLowerCase()),
        where('uid', '==', user.uid) // Must match the current user's UID
      );
      
      const invitationSnapshot = await getDocs(invitationQuery);
      
      if (!invitationSnapshot.empty) {
        console.log('✅ Found existing profile by email+UID (likely from invitation)');
        const profileData = { id: invitationSnapshot.docs[0].id, ...invitationSnapshot.docs[0].data() };
        setUserProfile(profileData);
        setLoading(false);
        return;
      }
      
      // Strategy 3: Look for old invitation that hasn't been linked yet
      console.log('🔍 Checking for unlinked invitation...');
      const oldInvitationQuery = query(
        collection(db, 'users'),
        where('email', '==', user.email.toLowerCase()),
        where('status', 'in', ['invited', 'active'])
      );
      
      const oldInvitationSnapshot = await getDocs(oldInvitationQuery);
      
      if (!oldInvitationSnapshot.empty) {
        console.log('⚠️ Found unlinked invitation! This should have been handled by AcceptInvitation component.');
        const inviteData = oldInvitationSnapshot.docs[0].data();
        
        // If it's an invitation without UID, something went wrong in the signup process
        if (!inviteData.uid) {
          console.log('🔧 Linking orphaned invitation to current user');
          // We could fix this here, but it's better handled in AcceptInvitation
        }
        
        setUserProfile(inviteData);
        setLoading(false);
        return;
      }
      
      // Strategy 4: No profile found anywhere - create new one (normal signup)
      console.log('ℹ️ No existing profile found, creating new profile');
      await createUserProfile(user);
      
    } catch (error) {
      console.error('Error finding user profile:', error);
      setFirestoreError(true);
      // Fallback to creating a profile
      await createUserProfile(user);
    }
  };

  const fetchUserProfileOnce = async (userDocRef, user) => {
    try {
      const userDoc = await getDoc(userDocRef);
      if (userDoc.exists()) {
        console.log('User profile fetched once');
        setUserProfile(userDoc.data());
        setLoading(false);
      } else {
        // ⭐ UPDATED: Use the enhanced profile finder
        await findAndSetUserProfile(user);
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
    
    // ⭐ CRITICAL: Check one more time if invitation exists before creating
    try {
      const lastCheckQuery = query(
        collection(db, 'users'),
        where('email', '==', user.email.toLowerCase())
      );
      
      const lastCheckSnapshot = await getDocs(lastCheckQuery);
      
      if (!lastCheckSnapshot.empty) {
        console.log('⚠️ Found existing profile during create - using existing instead');
        const existingProfile = lastCheckSnapshot.docs[0].data();
        setUserProfile(existingProfile);
        setLoading(false);
        return;
      }
    } catch (error) {
      console.log('Final check failed, proceeding with creation:', error);
    }
    
    // Create new profile (normal signup flow)
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
      console.log('✅ New user profile created successfully');
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
      await findAndSetUserProfile(currentUser);
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