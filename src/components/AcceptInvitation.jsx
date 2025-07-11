// src/components/AcceptInvitation.jsx - Using Firebase Function

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { doc, updateDoc, collection, query, where, getDocs } from 'firebase/firestore';
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

  // Use Firebase Function for proof transfer
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
      addDebugLog('Creating Firebase Auth account...');
      
      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;
      
      addDebugLog(`✅ Auth account created! UID: ${user.uid}`);

      // Update the invited user record first
      addDebugLog('Updating user record...');
      await updateDoc(doc(db, 'users', invitation.id), {
        uid: user.uid,
        displayName: displayName.trim(),
        status: 'active',
        activatedAt: new Date(),
        emailVerified: user.emailVerified,
        clientId: user.uid
      });
      addDebugLog('✅ User record updated');

      // Now transfer proofs using Firebase Function
      addDebugLog('Starting proof transfer via Firebase Function...');
      try {
        const transferResult = await transferProofOwnership(invitation.id, user.uid);
        addDebugLog(`✅ Proof transfer complete: ${transferResult.proofsTransferred} proofs transferred`);
      } catch (transferError) {
        // Log the error but don't fail the account creation
        addDebugLog(`⚠️ Proof transfer failed: ${transferError.message}`);
        addDebugLog('Account created successfully, but proof transfer failed. Contact admin if you don\'t see your proofs.');
      }

      addDebugLog('🎉 Account activation complete!');
      
      // Show debug log for a moment, then redirect
      setTimeout(() => {
        navigate('/dashboard', { 
          state: { 
            message: 'Welcome! Your account has been activated. You can now review your proofs.' 
          }
        });
      }, 3000); // Give user time to see debug info

    } catch (error) {
      console.error('Error accepting invitation:', error);
      addDebugLog(`❌ Error: ${error.message}`);
      
      if (error.code === 'auth/email-already-in-use') {
        addDebugLog('Email already exists, trying sign in...');
        try {
          await signInWithEmailAndPassword(auth, email, password);
          
          await updateDoc(doc(db, 'users', invitation.id), {
            uid: auth.currentUser.uid,
            status: 'active',
            activatedAt: new Date(),
            clientId: auth.currentUser.uid
          });

          // Transfer proofs for existing account
          try {
            await transferProofOwnership(invitation.id, auth.currentUser.uid);
          } catch (transferError) {
            addDebugLog(`⚠️ Proof transfer failed for existing account: ${transferError.message}`);
          }
          
          navigate('/dashboard');
        } catch (signInError) {
          setError('Account already exists. Please sign in with your existing password.');
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
      <div className="max-w-4xl w-full space-y-8">
        
        {/* Debug Panel */}
        {debugLog.length > 0 && (
          <div className="bg-gray-100 border rounded-lg p-4">
            <h3 className="font-bold text-gray-900 mb-2">🔍 Debug Log:</h3>
            <div className="text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
              {debugLog.map((log, index) => (
                <div key={index} className="text-gray-700">{log}</div>
              ))}
            </div>
          </div>
        )}

        <div className="max-w-md mx-auto">
          <div>
            <div className="mx-auto h-12 w-12 flex items-center justify-center rounded-full bg-blue-100">
              <svg className="h-6 w-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <h2 className="mt-6 text-center text-3xl font-extrabold text-gray-900">
              Complete Your Account
            </h2>
            <p className="mt-2 text-center text-sm text-gray-600">
              You've been invited to access the Cesar Graphics proofing portal
            </p>
            {invitation && (
              <div className="mt-4 bg-blue-50 border border-blue-200 rounded-md p-4">
                <p className="text-sm text-blue-800">
                  <strong>Invited by:</strong> {invitation.inviterEmail}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Your email:</strong> {invitation.email}
                </p>
                <p className="text-sm text-blue-800">
                  <strong>Invitation ID:</strong> {invitation.id}
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
                  placeholder="Choose a secure password (min 6 characters)"
                  minLength="6"
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
                  minLength="6"
                />
              </div>
            </div>

            <div>
              <button
                type="submit"
                disabled={loading || !invitation}
                className="group relative w-full flex justify-center py-2 px-4 border border-transparent text-sm font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Creating Account...
                  </>
                ) : (
                  'Complete Account Setup'
                )}
              </button>
            </div>

            <div className="text-center">
              <p className="text-xs text-gray-500">
                By creating an account, you agree to receive email notifications about your proofs and projects.
              </p>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}