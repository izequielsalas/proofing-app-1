// src/contexts/AuthContext.jsx - UPDATED with invitation mode race condition fix

import React, { createContext, useContext, useState, useEffect, useRef } from 'react';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc, setDoc, query, where, collection, getDocs, updateDoc } from 'firebase/firestore';
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

  // ⭐ RACE CONDITION FIX: Track when AcceptInvitation is handling signup
  const invitationModeRef = useRef(false);

  const setInvitationMode = (val) => {
    invitationModeRef.current = val;
    console.log(`🔒 Invitation mode: ${val ? 'ON' : 'OFF'}`);
  };

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (!user) {
        setUserProfile(null);
        setLoading(false);
        return;
      }

      // ⭐ RACE CONDITION FIX: If AcceptInvitation is handling signup,
      // don't auto-create a profile — let AcceptInvitation finish first
      if (invitationModeRef.current) {
        console.log('⏳ Invitation mode active — skipping auto-profile creation');
        // Wait for AcceptInvitation to create the profile, then pick it up
        const checkForProfile = async (retries = 5) => {
          for (let i = 0; i < retries; i++) {
            await new Promise(r => setTimeout(r, 1000));
            try {
              const userDoc = await getDoc(doc(db, 'users', user.uid));
              if (userDoc.exists()) {
                console.log('✅ Profile found (created by AcceptInvitation)');
                setUserProfile({ id: userDoc.id, ...userDoc.data() });
                setLoading(false);
                return;
              }
            } catch (err) {
              console.warn('Retry check failed:', err.message);
            }
          }
          // If still no profile after retries, create a fallback
          console.warn('⚠️ Profile not found after waiting — creating fallback');
          await createUserProfile(user);
        };
        checkForProfile();
        return;
      }

      // Normal flow: find existing profile
      await findAndSetUserProfile(user);
    });

    return unsubscribe;
  }, []);

  const findAndSetUserProfile = async (user) => {
    try {
      setLoading(true);
      setFirestoreError(null);

      console.log('Looking for user profile for:', user.email);

      // Fast path: check by UID (standard case)
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);

      if (userDocSnap.exists()) {
        console.log('✅ Found user profile by UID');
        setUserProfile({ id: userDocSnap.id, ...userDocSnap.data() });
        setLoading(false);
        return;
      }

      console.log('No profile found by UID, searching by email...');

      // Fallback: search by email for edge cases
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '==', user.email.toLowerCase())
      );
      const emailSnapshot = await getDocs(emailQuery);

      if (!emailSnapshot.empty) {
        const existingProfile = emailSnapshot.docs[0];
        console.log('✅ Found profile by email');
        setUserProfile({ id: existingProfile.id, ...existingProfile.data() });
        setLoading(false);
        return;
      }

      // Check for pending invitations in invitations collection
      // (handles case where user signs in normally but has a pending invitation)
      const invitationsQuery = query(
        collection(db, 'invitations'),
        where('email', '==', user.email.toLowerCase()),
        where('status', '==', 'pending')
      );
      const invitationsSnapshot = await getDocs(invitationsQuery);

      if (!invitationsSnapshot.empty) {
        console.log('🔄 Found pending invitation, upgrading...');
        const invitation = invitationsSnapshot.docs[0];
        await upgradeInvitationToUser(user, invitation);
        return;
      }

      // No profile at all — create one (normal signup, not invitation)
      console.log('No existing records found, creating new profile');
      await createUserProfile(user);

    } catch (error) {
      console.error('Error finding user profile:', error);
      setFirestoreError(error.message);

      // Create fallback profile to prevent app from breaking
      const fallbackProfile = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || user.email,
        role: 'client',
        clientId: user.uid,
        isActive: true,
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

  const upgradeInvitationToUser = async (user, invitationDoc) => {
    try {
      const invitationData = invitationDoc.data();
      console.log('Upgrading invitation to full user account...');

      // Create full user profile with UID as document ID
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName || invitationData.displayName || user.email,
        role: 'client',
        status: 'active',
        isActive: true,
        clientId: user.uid, // ⭐ clientId === UID
        activatedAt: new Date(),
        emailVerified: user.emailVerified,
        permissions: {
          canViewAllProofs: false,
          canUploadProofs: false,
          canApproveProofs: true,
          canManageUsers: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Preserve invitation metadata
      if (invitationData.invitedBy) {
        userData.invitedBy = invitationData.invitedBy;
        userData.inviterEmail = invitationData.inviterEmail;
        userData.invitedAt = invitationData.invitedAt;
      }
      userData.originalInvitationId = invitationDoc.id;

      // Create user document with UID as document ID
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('✅ User profile created');

      // Transfer any proofs assigned to the invitation
      await transferProofsFromInvitation(invitationDoc.id, user.uid);

      // Mark invitation as completed
      if (invitationData.type === 'client_invitation') {
        // New invitations collection
        await updateDoc(doc(db, 'invitations', invitationDoc.id), {
          status: 'completed',
          completedAt: new Date(),
          userUid: user.uid
        });
      } else {
        // Legacy invitation in users collection
        try {
          await updateDoc(doc(db, 'users', invitationDoc.id), {
            status: 'processed',
            processedAt: new Date(),
            processedByUid: user.uid
          });
        } catch (legacyErr) {
          console.warn('Could not update legacy invitation:', legacyErr.message);
        }
      }

      setUserProfile(userData);
      setLoading(false);

      console.log('🎉 Successfully upgraded invitation to user account');

    } catch (error) {
      console.error('Error upgrading invitation:', error);
      throw error;
    }
  };

  const transferProofsFromInvitation = async (invitationId, userUid) => {
    try {
      console.log(`Transferring proofs from ${invitationId} to ${userUid}`);

      const proofsQuery = query(
        collection(db, 'proofs'),
        where('clientId', '==', invitationId)
      );
      const proofsSnapshot = await getDocs(proofsQuery);

      if (proofsSnapshot.empty) {
        console.log('No proofs found to transfer');
        return;
      }

      console.log(`Found ${proofsSnapshot.docs.length} proofs to transfer`);

      const updatePromises = proofsSnapshot.docs.map(proofDoc => {
        return updateDoc(doc(db, 'proofs', proofDoc.id), {
          clientId: userUid,
          transferredAt: new Date(),
          originalInvitationId: invitationId
        });
      });

      await Promise.all(updatePromises);
      console.log(`✅ Successfully transferred ${proofsSnapshot.docs.length} proofs`);

    } catch (error) {
      console.error('Error transferring proofs:', error);
      // Don't throw — this shouldn't prevent account creation
    }
  };

  const createUserProfile = async (user) => {
    console.log('Creating new user profile for:', user.email);

    const userRef = doc(db, 'users', user.uid);
    const defaultProfile = {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email,
      role: 'client',
      status: 'active',
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

    try {
      await setDoc(userRef, defaultProfile);
      setUserProfile(defaultProfile);
      setLoading(false);
      console.log('✅ New user profile created successfully');
    } catch (error) {
      console.error('Error creating user profile:', error);
      setUserProfile(defaultProfile);
      setLoading(false);
    }
  };

  // Role checking helpers
  const isAdmin = () => userProfile?.role === 'admin';
  const isClient = () => userProfile?.role === 'client';
  const isDesigner = () => userProfile?.role === 'designer';

  const hasPermission = (permission) => {
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

  const canAssignProofs = () => {
    return isAdmin() || isDesigner();
  };

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
    firestoreError,
    refreshUserProfile,
    setInvitationMode  // ⭐ Exposed for AcceptInvitation to use
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}
