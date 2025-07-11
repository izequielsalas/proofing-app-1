// Updated AcceptInvitation.jsx - Full Component with Option B Implementation

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs, setDoc, getDoc, arrayUnion } from 'firebase/firestore';
import { getFunctions, httpsCallable } from 'firebase/functions';
import { auth, db } from '../firebase';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [loading, setLoading] = useState(false);
  const [invitation, setInvitation] = useState(null);
  const [error, setError] = useState('');
  const [debugLog, setDebugLog] = useState([]);

  // Helper function to add debug messages
  const addDebugLog = (message) => {
    console.log('🔍 DEBUG:', message);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()}: ${message}`]);
  };

  useEffect(() => {
    const inviteEmail = searchParams.get('email');
    if (inviteEmail) {
      setEmail(inviteEmail);
      fetchInvitation(inviteEmail);
    } else {
      setError('Invalid invitation link');
    }
  }, [searchParams]);

  const fetchInvitation = async (email) => {
    try {
      addDebugLog(`Fetching invitation for email: ${email}`);
      const q = query(
        collection(db, 'users'), 
        where('email', '==', email.toLowerCase()),
        where('status', '==', 'invited')
      );
      const snapshot = await getDocs(q);
      
      if (!snapshot.empty) {
        const inviteData = { id: snapshot.docs[0].id, ...snapshot.docs[0].data() };
        setInvitation(inviteData);
        setDisplayName(inviteData.displayName || '');
        addDebugLog(`Invitation found! ID: ${inviteData.id}`);
      } else {
        setError('Invitation not found or already used');
        addDebugLog('No invitation found');
      }
    } catch (error) {
      console.error('Error fetching invitation:', error);
      setError('Error loading invitation');
      addDebugLog(`Error fetching invitation: ${error.message}`);
    }
  };

  // Enhanced proof transfer function
  const transferProofOwnership = async (oldClientId, newUserUid) => {
    try {
      addDebugLog(`Calling Firebase Function to transfer proofs...`);
      addDebugLog(`From: ${oldClientId} → To: ${newUserUid}`);
      
      const functions = getFunctions();
      const transferFunction = httpsCallable(functions, 'transferProofOwnership');
      
      const result = await transferFunction({
        oldClientId: oldClientId,
        newUserUid: newUserUid
      });
      
      addDebugLog(`✅ Function result: ${result.data.message}`);
      addDebugLog(`Proofs transferred: ${result.data.proofsTransferred}`);
      
      return result.data;
      
    } catch (error) {
      console.error('Error calling transfer function:', error);
      addDebugLog(`❌ Function error: ${error.message}`);
      throw error;
    }
  };

  // OPTION B: Enhanced invitation acceptance with standard user creation
  const handleAcceptInvitation = async (e) => {
    e.preventDefault();
    
    if (!invitation) {
      setError('Invalid invitation');
      return;
    }

    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    setError('');
    setDebugLog([]);

    try {
      addDebugLog('🚀 Starting Option B invitation acceptance...');
      addDebugLog('Creating Firebase Auth account...');
      
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      addDebugLog(`✅ Auth account created! UID: ${user.uid}`);

      // Create NEW user document with UID as document ID (OPTION B - Standard Pattern)
      addDebugLog('Creating user profile with standard UID-as-document-ID pattern...');
      const newUserData = {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim(),
        role: 'client',
        status: 'active',
        isActive: true,
        clientId: user.uid,
        activatedAt: new Date(),
        emailVerified: user.emailVerified,
        // Copy relevant data from invitation
        invitedBy: invitation.invitedBy,
        inviterEmail: invitation.inviterEmail,
        invitedAt: invitation.invitedAt,
        originalInvitationId: invitation.id, // Keep reference to original invitation
        permissions: {
          canViewAllProofs: false,
          canUploadProofs: false,
          canApproveProofs: true,
          canManageUsers: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      // Create user document using UID as document ID
      await setDoc(doc(db, 'users', user.uid), newUserData);
      addDebugLog('✅ User profile created with standard UID-as-document-ID pattern');

      // Transfer proofs from invitation ID to user UID
      addDebugLog('Starting proof transfer via Firebase Function...');
      try {
        const transferResult = await transferProofOwnership(invitation.id, user.uid);
        addDebugLog(`✅ Proof transfer complete: ${transferResult.proofsTransferred} proofs transferred`);
      } catch (transferError) {
        addDebugLog(`⚠️ Proof transfer failed: ${transferError.message}`);
        addDebugLog('Account created successfully, but proof transfer failed. Contact admin if you don\'t see your proofs.');
      }

      // Mark original invitation as processed (keep for audit trail)
      addDebugLog('Marking original invitation as processed...');
      try {
        await updateDoc(doc(db, 'users', invitation.id), {
          status: 'processed',
          processedAt: new Date(),
          processedByUid: user.uid,
          newUserDocumentId: user.uid,
          note: 'Invitation processed - user created with UID as document ID'
        });
        addDebugLog('✅ Original invitation marked as processed');
      } catch (updateError) {
        addDebugLog(`⚠️ Could not update original invitation: ${updateError.message}`);
        // Non-critical error, don't fail the process
      }

      addDebugLog('🎉 Account activation complete with Option B!');
      
      // Redirect after showing debug info
      setTimeout(() => {
        navigate('/dashboard', { 
          state: { 
            message: 'Welcome! Your account has been activated. You can now review your proofs.' 
          }
        });
      }, 3000);

    } catch (error) {
      console.error('Error accepting invitation:', error);
      addDebugLog(`❌ Error: ${error.message}`);
      
      if (error.code === 'auth/email-already-in-use') {
        addDebugLog('Email already exists. Handling existing account scenario...');
        
        try {
          // Try to sign in with existing account
          await signInWithEmailAndPassword(auth, email, password);
          addDebugLog('✅ Signed in with existing account');
          
          // Check if user already has a profile with UID as document ID
          const existingUserDoc = await getDoc(doc(db, 'users', auth.currentUser.uid));
          
          if (existingUserDoc.exists()) {
            addDebugLog('User already has a standard profile, checking for proof transfer...');
            const existingData = existingUserDoc.data();
            
            // Only transfer if not already done for this invitation
            if (existingData.originalInvitationId !== invitation.id) {
              try {
                const transferResult = await transferProofOwnership(invitation.id, auth.currentUser.uid);
                addDebugLog(`✅ Additional proofs transferred: ${transferResult.proofsTransferred}`);
                
                // Update user record to include this invitation reference
                await updateDoc(doc(db, 'users', auth.currentUser.uid), {
                  additionalInvitations: arrayUnion(invitation.id),
                  updatedAt: new Date()
                });
                
              } catch (transferError) {
                addDebugLog(`⚠️ Proof transfer failed: ${transferError.message}`);
              }
            } else {
              addDebugLog('Proofs already transferred for this invitation');
            }
          } else {
            addDebugLog('Creating standard profile for existing auth account...');
            // Create profile for existing auth user following standard pattern
            const userData = {
              uid: auth.currentUser.uid,
              email: auth.currentUser.email,
              displayName: displayName.trim(),
              role: 'client',
              status: 'active',
              isActive: true,
              clientId: auth.currentUser.uid,
              originalInvitationId: invitation.id,
              activatedAt: new Date(),
              permissions: {
                canViewAllProofs: false,
                canUploadProofs: false,
                canApproveProofs: true,
                canManageUsers: false
              },
              createdAt: new Date(),
              updatedAt: new Date()
            };
            
            await setDoc(doc(db, 'users', auth.currentUser.uid), userData);
            addDebugLog('✅ Standard profile created for existing account');
            
            // Transfer proofs
            try {
              await transferProofOwnership(invitation.id, auth.currentUser.uid);
              addDebugLog('✅ Proofs transferred to existing account');
            } catch (transferError) {
              addDebugLog(`⚠️ Proof transfer failed: ${transferError.message}`);
            }
          }
          
          // Mark invitation as processed
          try {
            await updateDoc(doc(db, 'users', invitation.id), {
              status: 'processed',
              processedAt: new Date(),
              processedByUid: auth.currentUser.uid,
              note: 'Processed for existing account'
            });
          } catch (updateError) {
            addDebugLog(`⚠️ Could not update invitation: ${updateError.message}`);
          }
          
          navigate('/dashboard');
          
        } catch (signInError) {
          console.error('Sign in error:', signInError);
          setError('Account already exists but password is incorrect. Please contact support or try signing in normally.');
        }
      } else {
        setError('Failed to create account. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (error && !invitation) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
        <div className="max-w-md w-full space-y-8">
          <div className="text-center">
            <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
              Invalid Invitation
            </h2>
            <p className="mt-2 text-sm text-red-600">{error}</p>
            <p className="mt-4 text-sm text-gray-600">
              Please contact Cesar Graphics for a new invitation.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        <div className="text-center">
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            Accept Your Invitation
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Create your account to access the proofing portal
          </p>
          
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && invitation && (
            <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded text-left">
              <p className="text-xs text-blue-800">
                <strong>Debug Info:</strong><br/>
                <strong>Invitation ID:</strong> {invitation.id}<br/>
                <strong>Implementation:</strong> Option B (Standard UID Pattern)
              </p>
            </div>
          )}
        </div>

        <form className="mt-8 space-y-6" onSubmit={handleAcceptInvitation}>
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-4">
              <p className="text-sm text-red-800">{error}</p>
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="displayName" className="block text-sm font-medium text-gray-700">
                Your Name
              </label>
              <input
                id="displayName"
                name="displayName"
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Enter your full name"
              />
            </div>

            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                Email Address
              </label>
              <input
                id="email"
                name="email"
                type="email"
                value={email}
                disabled
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-500 bg-gray-50 rounded-md sm:text-sm"
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Create Password
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Choose a secure password"
              />
            </div>

            <div>
              <label htmlFor="confirmPassword" className="block text-sm font-medium text-gray-700">
                Confirm Password
              </label>
              <input
                id="confirmPassword"
                name="confirmPassword"
                type="password"
                required
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="mt-1 appearance-none relative block w-full px-3 py-2 border border-gray-300 placeholder-gray-500 text-gray-900 rounded-md focus:outline-none focus:ring-blue-500 focus:border-blue-500 focus:z-10 sm:text-sm"
                placeholder="Confirm your password"
              />
            </div>
          </div>

          <div>
            <button
              type="submit"
              disabled={loading || !invitation}
              className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? 'Creating Account...' : 'Create Account & Access Portal'}
            </button>
          </div>

          {/* Debug log in development */}
          {process.env.NODE_ENV === 'development' && debugLog.length > 0 && (
            <div className="mt-4 p-3 bg-gray-50 border border-gray-200 rounded text-left">
              <p className="text-xs font-medium text-gray-700 mb-2">Debug Log:</p>
              <div className="text-xs text-gray-600 max-h-32 overflow-y-auto">
                {debugLog.map((log, index) => (
                  <div key={index} className="mb-1">{log}</div>
                ))}
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}