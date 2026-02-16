// src/components/AcceptInvitation.jsx - UPDATED for invitations collection + race condition fix

import { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { 
  collection, query, where, getDocs, 
  doc, setDoc, updateDoc, writeBatch 
} from 'firebase/firestore';
import { auth, db } from '../firebase';
import { useAuth } from '../contexts/AuthContext';

export default function AcceptInvitation() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setInvitationMode } = useAuth();

  const [invitation, setInvitation] = useState(null);
  const [email, setEmail] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [debugLog, setDebugLog] = useState([]);

  const addDebugLog = (msg) => {
    console.log('🔍 DEBUG:', msg);
    setDebugLog(prev => [...prev, `${new Date().toLocaleTimeString()} - ${msg}`]);
  };

  // Step 1: Find the invitation (check both collections)
  useEffect(() => {
    const fetchInvitation = async () => {
      const emailParam = searchParams.get('email');
      if (!emailParam) {
        setError('No email provided in invitation link');
        setLoading(false);
        return;
      }

      setEmail(emailParam.toLowerCase());
      addDebugLog(`Looking up invitation for: ${emailParam}`);

      try {
        // Check 'invitations' collection first (new system)
        const invQuery = query(
          collection(db, 'invitations'),
          where('email', '==', emailParam.toLowerCase()),
          where('status', '==', 'pending')
        );
        const invSnapshot = await getDocs(invQuery);

        if (!invSnapshot.empty) {
          const invDoc = invSnapshot.docs[0];
          const invData = { id: invDoc.id, ...invDoc.data(), source: 'invitations' };
          setInvitation(invData);
          setDisplayName(invData.displayName || '');
          addDebugLog(`✅ Found invitation (invitations collection): ${invDoc.id}`);
          setLoading(false);
          return;
        }

        // Fallback: check 'users' collection (legacy invitations)
        const legacyQuery = query(
          collection(db, 'users'),
          where('email', '==', emailParam.toLowerCase()),
          where('status', '==', 'invited')
        );
        const legacySnapshot = await getDocs(legacyQuery);

        if (!legacySnapshot.empty) {
          const legDoc = legacySnapshot.docs[0];
          const legData = { id: legDoc.id, ...legDoc.data(), source: 'users' };
          setInvitation(legData);
          setDisplayName(legData.displayName || '');
          addDebugLog(`✅ Found legacy invitation (users collection): ${legDoc.id}`);
          setLoading(false);
          return;
        }

        setError('Invitation not found or already used.');
        addDebugLog('❌ No invitation found');
      } catch (err) {
        console.error('Error fetching invitation:', err);
        setError('Error loading invitation');
        addDebugLog(`❌ Error: ${err.message}`);
      }
      setLoading(false);
    };

    fetchInvitation();
  }, [searchParams]);

  // Step 2: Handle signup
  const handleAcceptInvitation = async (e) => {
    e.preventDefault();

    if (!invitation) { setError('Invalid invitation'); return; }
    if (password !== confirmPassword) { setError('Passwords do not match'); return; }
    if (password.length < 6) { setError('Password must be at least 6 characters'); return; }

    setLoading(true);
    setError('');
    setDebugLog([]);

    // ⭐ Tell AuthContext to stand down — we're handling profile creation
    setInvitationMode(true);

    try {
      addDebugLog('🚀 Starting invitation acceptance...');

      // ---- Create or sign into Firebase Auth ----
      let user;
      try {
        addDebugLog('Creating Firebase Auth account...');
        const cred = await createUserWithEmailAndPassword(auth, email, password);
        user = cred.user;
        addDebugLog(`✅ Auth account created — UID: ${user.uid}`);
      } catch (authErr) {
        if (authErr.code === 'auth/email-already-in-use') {
          addDebugLog('Account exists, signing in...');
          try {
            const cred = await signInWithEmailAndPassword(auth, email, password);
            user = cred.user;
            addDebugLog(`✅ Signed in — UID: ${user.uid}`);
          } catch (signInErr) {
            throw new Error(
              signInErr.code === 'auth/wrong-password'
                ? 'Account exists but password is incorrect. Contact support.'
                : signInErr.message
            );
          }
        } else {
          throw authErr;
        }
      }

      // ---- Create user doc with Auth UID as doc ID ----
      addDebugLog('Creating user profile (UID = doc ID)...');
      const userData = {
        uid: user.uid,
        email: user.email,
        displayName: displayName.trim(),
        role: 'client',
        status: 'active',
        isActive: true,
        clientId: user.uid,  // ⭐ This is the key — clientId === UID
        activatedAt: new Date(),
        emailVerified: user.emailVerified,
        invitedBy: invitation.invitedBy || null,
        inviterEmail: invitation.inviterEmail || null,
        invitedAt: invitation.invitedAt || null,
        originalInvitationId: invitation.id,
        permissions: {
          canViewAllProofs: false,
          canUploadProofs: false,
          canApproveProofs: true,
          canManageUsers: false
        },
        createdAt: new Date(),
        updatedAt: new Date()
      };

      await setDoc(doc(db, 'users', user.uid), userData);
      addDebugLog('✅ User profile created');

      // ---- Transfer proofs from invitation ID → Auth UID ----
      addDebugLog(`Transferring proofs: ${invitation.id} → ${user.uid}`);

      const proofsQuery = query(
        collection(db, 'proofs'),
        where('clientId', '==', invitation.id)
      );
      const proofsSnapshot = await getDocs(proofsQuery);

      if (proofsSnapshot.empty) {
        addDebugLog('ℹ️ No proofs to transfer (client may not have any yet)');
      } else {
        addDebugLog(`Found ${proofsSnapshot.size} proofs to transfer`);
        const batch = writeBatch(db);

        proofsSnapshot.docs.forEach(proofDoc => {
          batch.update(doc(db, 'proofs', proofDoc.id), {
            clientId: user.uid,
            transferredAt: new Date(),
            originalInvitationId: invitation.id
          });
        });

        await batch.commit();
        addDebugLog(`✅ ${proofsSnapshot.size} proofs transferred`);
      }

      // ---- Mark invitation as completed ----
      addDebugLog('Marking invitation as completed...');
      try {
        if (invitation.source === 'invitations') {
          await updateDoc(doc(db, 'invitations', invitation.id), {
            status: 'completed',
            completedAt: new Date(),
            userUid: user.uid
          });
        } else {
          // Legacy: mark old users-collection invitation
          await updateDoc(doc(db, 'users', invitation.id), {
            status: 'processed',
            processedAt: new Date(),
            processedByUid: user.uid,
            newUserDocumentId: user.uid,
            note: 'Invitation processed - user created with UID as document ID'
          });
        }
        addDebugLog('✅ Invitation marked as completed');
      } catch (markErr) {
        addDebugLog(`⚠️ Could not update invitation status: ${markErr.message}`);
      }

      addDebugLog('🎉 Account activation complete!');

      // ⭐ Done — AuthContext can resume normal operation
      setInvitationMode(false);

      // Small delay to let AuthContext pick up the new profile
      setTimeout(() => {
        navigate('/dashboard', {
          state: {
            message: 'Welcome! Your account has been activated. You can now review your proofs.'
          }
        });
      }, 1500);

    } catch (err) {
      console.error('Invitation acceptance error:', err);
      setInvitationMode(false); // ⭐ Reset on error too
      setError(err.message);
      addDebugLog(`❌ Error: ${err.message}`);
      setLoading(false);
    }
  };

  // ---- Render ----
  if (loading && !invitation) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p>Loading invitation...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="max-w-md w-full bg-white rounded-lg shadow-md p-8">
        <h2 className="text-2xl font-bold text-center mb-6">
          Welcome to Cesar Graphics
        </h2>

        {/* Debug Panel */}
        {debugLog.length > 0 && (
          <div className="mb-4 p-3 bg-gray-100 rounded text-xs max-h-48 overflow-y-auto">
            <strong>Debug Log:</strong>
            {debugLog.map((log, i) => (
              <div key={i} className={
                log.includes('❌') ? 'text-red-600' :
                log.includes('✅') ? 'text-green-600' :
                log.includes('⚠️') ? 'text-yellow-600' : 'text-gray-700'
              }>
                {log}
              </div>
            ))}
          </div>
        )}

        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded">
            {error}
          </div>
        )}

        {invitation ? (
          <form onSubmit={handleAcceptInvitation} className="space-y-4">
            <p className="text-gray-600 text-center mb-4">
              You've been invited to the proofing portal.
              Create your account to view your proofs.
            </p>

            <div>
              <label className="block text-sm font-medium text-gray-700">Email</label>
              <input
                type="email"
                value={email}
                disabled
                className="mt-1 block w-full rounded-md border-gray-300 bg-gray-100 px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Display Name</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700">Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                required
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm px-3 py-2"
              />
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
            >
              {loading ? 'Creating Account...' : 'Create Account'}
            </button>
          </form>
        ) : (
          <div className="text-center">
            <p className="text-gray-600">
              {error || 'Invitation not found.'}
            </p>
            <p className="mt-4 text-sm text-gray-500">
              Please contact Cesar Graphics for a new invitation.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
