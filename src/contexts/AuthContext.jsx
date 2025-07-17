// src/contexts/AuthContext.jsx - FIXED VERSION

import React, { createContext, useContext, useState, useEffect } from 'react';
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

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);
      if (user) {
        await findAndSetUserProfile(user);
      } else {
        setUserProfile(null);
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  const findAndSetUserProfile = async (user) => {
    try {
      setLoading(true);
      setFirestoreError(null);
      
      console.log('Looking for user profile for:', user.email);
      
      // First, try to find user by UID (standard pattern)
      const userDocRef = doc(db, 'users', user.uid);
      const userDocSnap = await getDoc(userDocRef);
      
      if (userDocSnap.exists()) {
        const userData = userDocSnap.data();
        console.log('✅ Found user profile by UID');
        setUserProfile(userData);
        setLoading(false);
        return;
      }
      
      console.log('No profile found by UID, searching by email...');
      
      // Search by email for any existing records
      const emailQuery = query(
        collection(db, 'users'),
        where('email', '==', user.email.toLowerCase())
      );
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        // Found existing profile(s) by email
        console.log(`Found ${emailSnapshot.docs.length} profile(s) by email`);
        
        // Look for an active client profile first
        const activeProfile = emailSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.role === 'client' && data.status === 'active' && data.uid;
        });
        
        if (activeProfile) {
          console.log('✅ Found active client profile, using it');
          setUserProfile(activeProfile.data());
          setLoading(false);
          return;
        }
        
        // Look for invitation records that need to be upgraded
        const invitationProfile = emailSnapshot.docs.find(doc => {
          const data = doc.data();
          return data.status === 'invited' && !data.uid;
        });
        
        if (invitationProfile) {
          console.log('🔄 Found invitation profile, upgrading to full user...');
          await upgradeInvitationToUser(user, invitationProfile);
          return;
        }
      }
      
      // Check for pending invitations in invitations collection
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
      
      // No existing records found, create new user profile
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
        clientId: user.uid,
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

      // Create user document with UID as document ID
      await setDoc(doc(db, 'users', user.uid), userData);
      console.log('✅ User profile created');

      // Transfer any proofs assigned to the invitation
      await transferProofsFromInvitation(invitationDoc.id, user.uid);

      // Mark invitation as completed
      if (invitationData.type === 'client_invitation') {
        // New invitation system
        await updateDoc(doc(db, 'invitations', invitationDoc.id), {
          status: 'completed',
          completedAt: new Date(),
          userUid: user.uid
        });
      } else {
        // Legacy invitation in users collection
        await updateDoc(doc(db, 'users', invitationDoc.id), {
          status: 'processed',
          processedAt: new Date(),
          processedByUid: user.uid
        });
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
      
      // Find proofs assigned to the invitation
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
      
      // Update each proof to point to the user's UID
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
      // Don't throw - this shouldn't prevent account creation
    }
  };

  const createUserProfile = async (user) => {
    console.log('Creating new user profile for:', user.email);
    
    // Create new profile (normal signup flow)
    const userRef = doc(db, 'users', user.uid);
    const defaultProfile = {
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

  const canAssignProofs = () => {
    return isAdmin() || isDesigner();
  };

  // Refresh user profile (useful after invitation acceptance)
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
    refreshUserProfile
  };

  return (
    <AuthContext.Provider value={value}>
      {!loading && children}
    </AuthContext.Provider>
  );
}