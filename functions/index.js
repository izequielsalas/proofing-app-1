const {onDocumentCreated, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {getAuth} = require('firebase-admin/auth'); // Add this line
const {defineSecret} = require('firebase-functions/params');
const {Resend} = require('resend');
const { onRequest, onCall, HttpsError } = require('firebase-functions/v2/https'); // Add HttpsError

// Initialize Firebase Admin FIRST
initializeApp();

// THEN initialize the services
const db = getFirestore();
const auth = getAuth(); // Add this line AFTER initializeApp()


// Define secrets for secure API key storage
const resendApiKey = defineSecret('RESEND_API_KEY');

// ⚠️ UPDATE THESE SETTINGS FOR YOUR SETUP
const ADMIN_EMAIL = 'isaac@s-proof.app'; 
const FRONTEND_URL = 'https://proofingapp1.web.app';
const FROM_EMAIL_TESTING = 'no-reply@s-proof.app';
const FROM_EMAIL = FROM_EMAIL_TESTING;
const GMAIL_FALLBACK = 'isaactheking7@gmail.com'; // Gmail fallback for M365 delivery issues

// ✨ NEW: Smart Invitation Email Template
const getSmartInvitationTemplate = (data) => {
  const { clientName, inviterEmail, inviteUrl, hasPendingProofs, proofCount, proofs, totalProofs } = data;
  
  // Generate proof list HTML if there are pending proofs
  const proofListHTML = hasPendingProofs ? `
    <div style="background: #F7FAFC; border-radius: 12px; padding: 24px; margin: 24px 0;">
      <h3 style="color: #2D3748; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
        🎨 ${proofCount === 1 ? 'Your Proof is' : `${proofCount} Proofs are`} Ready for Review:
      </h3>
      ${proofs.map(proof => `
        <div style="background: #ffffff; border-radius: 8px; padding: 16px; margin-bottom: 12px; border-left: 4px solid #4F46E5;">
          <h4 style="color: #2D3748; font-size: 16px; font-weight: 600; margin: 0 0 8px 0;">
            📄 ${proof.title}
          </h4>
          <p style="color: #4A5568; font-size: 14px; margin: 0 0 8px 0;">
            <strong>File:</strong> ${proof.fileName}
          </p>
          <p style="color: #4A5568; font-size: 14px; margin: 0;">
            <strong>Uploaded:</strong> ${new Date(proof.createdAt?.toDate?.() || proof.createdAt).toLocaleDateString()}
          </p>
        </div>
      `).join('')}
      ${totalProofs > 3 ? `
        <p style="color: #4A5568; font-size: 14px; margin: 12px 0 0 0; font-style: italic;">
          + ${totalProofs - 3} more proof${totalProofs - 3 > 1 ? 's' : ''} waiting for you
        </p>
      ` : ''}
    </div>
  ` : '';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Cesar Graphics${hasPendingProofs ? ' - Proofs Ready!' : ''}</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
    <div style="min-height: 100vh; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2D3748 0%, #1A202C 100%); padding: 40px 40px 60px 40px; text-align: center; position: relative;">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%);"></div>
                <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                    Welcome to Cesar Graphics
                </h1>
                <p style="color: #A0AEC0; font-size: 18px; margin: 0; font-weight: 400;">
                    ${hasPendingProofs ? `${proofCount} Proof${proofCount > 1 ? 's' : ''} Ready for Review` : 'Proofing Portal Invitation'}
                </p>
            </div>

            <!-- Content -->
            <div style="padding: 40px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h2 style="color: #2D3748; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
                        Hi ${clientName}! 🎉
                    </h2>
                    ${hasPendingProofs ? `
                        <p style="color: #4A5568; font-size: 16px; line-height: 1.6; margin: 0 0 8px 0;">
                            Welcome to Cesar Graphics! We've invited you to our proofing portal and you already have <strong>${proofCount} proof${proofCount > 1 ? 's' : ''}</strong> waiting for your review.
                        </p>
                        <p style="color: #4A5568; font-size: 16px; line-height: 1.6; margin: 0;">
                            Click the button below to create your account and review your proof${proofCount > 1 ? 's' : ''} immediately.
                        </p>
                    ` : `
                        <p style="color: #4A5568; font-size: 16px; line-height: 1.6; margin: 0;">
                            You've been invited to join <strong>Cesar Graphics Proofing Portal</strong> by ${inviterEmail}. Our platform makes it easy to review and approve print designs.
                        </p>
                    `}
                </div>

                ${proofListHTML}

                <!-- CTA Button -->
                <div style="text-align: center; margin: 32px 0;">
                    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); transition: transform 0.2s;">
                        ${hasPendingProofs ? `Get Started & Review ${proofCount > 1 ? 'Proofs' : 'Proof'}` : 'Accept Invitation & Get Started'}
                    </a>
                </div>

                <!-- What to Expect -->
                <div style="background: #F7FAFC; border-radius: 12px; padding: 24px; margin: 24px 0;">
                    <h3 style="color: #2D3748; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                        ${hasPendingProofs ? '🚀 What happens next:' : '🎯 What you can do:'}
                    </h3>
                    <ul style="color: #4A5568; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                        ${hasPendingProofs ? `
                            <li style="margin-bottom: 8px;">Click the button above to create your account</li>
                            <li style="margin-bottom: 8px;">Review your ${proofCount > 1 ? 'proofs' : 'proof'} in high quality</li>
                            <li style="margin-bottom: 8px;">Approve or request changes with comments</li>
                            <li style="margin-bottom: 0;">Get instant notifications on future proofs</li>
                        ` : `
                            <li style="margin-bottom: 8px;">Review high-quality proof images and PDFs</li>
                            <li style="margin-bottom: 8px;">Approve or decline with detailed feedback</li>
                            <li style="margin-bottom: 8px;">Track the status of all your projects</li>
                            <li style="margin-bottom: 0;">Get instant email notifications for new proofs</li>
                        `}
                    </ul>
                </div>

                <!-- Support -->
                <div style="text-align: center; padding: 20px 0;">
                    <p style="color: #4A5568; font-size: 14px; margin: 0 0 8px 0;">
                        Need help? Just reply to this email!
                    </p>
                    <p style="color: #2D3748; font-size: 16px; font-weight: 600; margin: 0;">
                        Welcome to the team! 🎉
                    </p>
                    <p style="color: #4A5568; font-size: 14px; margin: 8px 0 0 0;">
                        <strong>The Cesar Graphics Team</strong>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #F7FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="color: #A0AEC0; font-size: 12px; margin: 0;">
                    This invitation will expire in 7 days. ${hasPendingProofs ? 'Your proofs will remain available.' : 'If you need a new invitation, please contact us.'}
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// OLD: Basic Invitation Email Template (kept for backwards compatibility)
const getClientInvitationTemplate = (clientName, inviterEmail, inviteUrl) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Cesar Graphics Proofing Portal</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
    <div style="min-height: 100vh; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2D3748 0%, #1A202C 100%); padding: 40px 40px 60px 40px; text-align: center; position: relative;">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%);"></div>
                <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                    Welcome to Cesar Graphics
                </h1>
                <p style="color: #A0AEC0; font-size: 18px; margin: 0; font-weight: 400;">
                    Proofing Portal Invitation
                </p>
            </div>

            <!-- Content -->
            <div style="padding: 40px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h2 style="color: #2D3748; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
                        Hi ${clientName}! 👋
                    </h2>
                    <p style="color: #4A5568; font-size: 16px; line-height: 1.6; margin: 0;">
                        You've been invited by <strong>${inviterEmail}</strong> to access our professional proofing portal.
                    </p>
                </div>

                <!-- Features -->
                <div style="background: #F7FAFC; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <h3 style="color: #2D3748; font-size: 18px; font-weight: 600; margin: 0 0 16px 0; text-align: center;">
                        🎨 What you can do:
                    </h3>
                    <ul style="color: #4A5568; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;">✅ Review and approve design proofs instantly</li>
                        <li style="margin-bottom: 8px;">💬 Request changes with detailed feedback</li>
                        <li style="margin-bottom: 8px;">📊 Track the status of all your projects</li>
                        <li style="margin-bottom: 8px;">⬇️ Download final approved files</li>
                        <li style="margin-bottom: 0;">📱 Access from any device, anywhere</li>
                    </ul>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${inviteUrl}" style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(79, 70, 229, 0.4); transition: all 0.2s;">
                        🚀 Accept Invitation & Create Account
                    </a>
                </div>

                <!-- Backup Link -->
                <div style="background: #EDF2F7; border-radius: 8px; padding: 16px; margin-bottom: 24px;">
                    <p style="color: #4A5568; font-size: 14px; margin: 0 0 8px 0; font-weight: 500;">
                        Button not working? Copy and paste this link:
                    </p>
                    <p style="color: #2B6CB0; font-size: 12px; word-break: break-all; background: #ffffff; padding: 8px; border-radius: 4px; margin: 0; border: 1px solid #E2E8F0;">
                        ${inviteUrl}
                    </p>
                </div>

                <!-- Support -->
                <div style="text-align: center; border-top: 1px solid #E2E8F0; padding-top: 24px;">
                    <p style="color: #718096; font-size: 14px; margin: 0 0 8px 0;">
                        Questions? Need help? Just reply to this email!
                    </p>
                    <p style="color: #2D3748; font-size: 16px; font-weight: 600; margin: 0;">
                        Welcome to the team! 🎉
                    </p>
                    <p style="color: #4A5568; font-size: 14px; margin: 8px 0 0 0;">
                        <strong>The Cesar Graphics Team</strong>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #F7FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="color: #A0AEC0; font-size: 12px; margin: 0;">
                    This invitation will expire in 7 days. If you need a new invitation, please contact us.
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// MODERN CLIENT EMAIL TEMPLATE - Sleek & Professional (EXISTING)
const getClientNotificationTemplate = (data) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Proof Ready - Cesar Graphics</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
    <div style="min-height: 100vh; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #2D3748 0%, #1A202C 100%); padding: 40px 40px 60px 40px; text-align: center; position: relative;">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%);"></div>
                <h1 style="color: #ffffff; font-size: 32px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                    Cesar Graphics
                </h1>
                <p style="color: #A0AEC0; font-size: 18px; margin: 0; font-weight: 400;">
                    Proof Ready for Review
                </p>
            </div>

            <!-- Content -->
            <div style="padding: 40px;">
                <div style="text-align: center; margin-bottom: 32px;">
                    <h2 style="color: #2D3748; font-size: 24px; font-weight: 600; margin: 0 0 16px 0;">
                        Hi ${data.clientName}! 🎨
                    </h2>
                    <p style="color: #4A5568; font-size: 16px; line-height: 1.6; margin: 0;">
                        Your proof for <strong>"${data.title}"</strong> is ready for review!
                    </p>
                </div>

                <!-- Urgency Banner -->
                <div style="background: linear-gradient(135deg, #FED7D7 0%, #FEB2B2 100%); border-left: 4px solid #E53E3E; border-radius: 8px; padding: 16px; margin-bottom: 32px;">
                    <div style="display: flex; align-items: center;">
                        <span style="font-size: 24px; margin-right: 12px;">⏰</span>
                        <div>
                            <p style="color: #C53030; font-weight: 600; margin: 0 0 4px 0; font-size: 14px;">
                                ACTION REQUIRED
                            </p>
                            <p style="color: #742A2A; margin: 0; font-size: 14px; line-height: 1.4;">
                                Please review and approve your proof as soon as possible to keep your project on schedule.
                            </p>
                        </div>
                    </div>
                </div>

                <!-- Review Steps -->
                <div style="background: #F7FAFC; border-radius: 12px; padding: 24px; margin-bottom: 32px;">
                    <h3 style="color: #2D3748; font-size: 18px; font-weight: 600; margin: 0 0 16px 0;">
                        📋 How to review your proof:
                    </h3>
                    <ol style="color: #4A5568; font-size: 14px; line-height: 1.6; margin: 0; padding-left: 20px;">
                        <li style="margin-bottom: 8px;"><strong>Click the button below</strong> to access your account</li>
                        <li style="margin-bottom: 8px;"><strong>Review the proof carefully</strong> - check all text, images, and colors</li>
                        <li style="margin-bottom: 8px;"><strong>Either approve it or request changes</strong> with specific feedback</li>
                        <li style="margin-bottom: 0;"><strong>Add any comments</strong> to help us perfect your design</li>
                    </ol>
                </div>

                <!-- CTA Button -->
                <div style="text-align: center; margin-bottom: 32px;">
                    <a href="${FRONTEND_URL}/auth" style="display: inline-block; background: linear-gradient(135deg, #48BB78 0%, #38A169 100%); color: #ffffff; text-decoration: none; padding: 16px 32px; border-radius: 8px; font-weight: 600; font-size: 16px; box-shadow: 0 4px 12px rgba(72, 187, 120, 0.4);">
                        👀 Review Your Proof Now
                    </a>
                </div>

                <!-- Support -->
                <div style="text-align: center; border-top: 1px solid #E2E8F0; padding-top: 24px;">
                    <p style="color: #718096; font-size: 14px; margin: 0 0 8px 0;">
                        Questions about your proof? Need assistance? Just reply to this email!
                    </p>
                    <p style="color: #2D3748; font-size: 16px; font-weight: 600; margin: 0;">
                        Thank you for choosing Cesar Graphics! 🙏
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div style="background: #F7FAFC; padding: 20px; text-align: center;">
                <p style="color: #A0AEC0; font-size: 12px; margin: 0;">
                    Cesar Graphics | Professional Printing & Design Services
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// ⭐ NEW: Proof Ownership Transfer Function
exports.transferProofOwnership = onCall(async (request) => {
  // Verify the request is from an authenticated user
  if (!request.auth) {
    throw new Error('Must be authenticated to transfer proofs');
  }

  const { oldClientId, newUserUid } = request.data;
  
  if (!oldClientId || !newUserUid) {
    throw new Error('Missing required parameters: oldClientId or newUserUid');
  }

  // Verify the user is transferring to their own UID
  if (newUserUid !== request.auth.uid) {
    throw new Error('Can only transfer proofs to your own account');
  }

  try {
    console.log(`🔄 Transferring proofs from ${oldClientId} to ${newUserUid}`);
    
    // Find all proofs assigned to the old client ID
    const proofsSnapshot = await db.collection('proofs')
      .where('clientId', '==', oldClientId)
      .get();
    
    console.log(`📋 Found ${proofsSnapshot.docs.length} proofs to transfer`);
    
    if (proofsSnapshot.empty) {
      console.log('ℹ️ No proofs found to transfer');
      return { 
        success: true, 
        message: 'No proofs found to transfer',
        proofsTransferred: 0 
      };
    }

    // Log details of proofs being transferred
    proofsSnapshot.docs.forEach((doc, index) => {
      const proof = doc.data();
      console.log(`📄 Proof ${index + 1}: "${proof.title}" (ID: ${doc.id})`);
    });

    // Use batch to update all proofs
    const batch = db.batch();
    
    proofsSnapshot.docs.forEach((doc) => {
      const proofRef = db.collection('proofs').doc(doc.id);
      batch.update(proofRef, {
        clientId: newUserUid,
        transferredAt: new Date(),
        originalInvitationId: oldClientId
      });
    });

    await batch.commit();
    
    console.log(`✅ Successfully transferred ${proofsSnapshot.docs.length} proofs to ${newUserUid}`);
    
    return { 
      success: true, 
      message: `Successfully transferred ${proofsSnapshot.docs.length} proofs`,
      proofsTransferred: proofsSnapshot.docs.length 
    };

  } catch (error) {
    console.error('❌ Error transferring proofs:', error);
    throw new Error(`Failed to transfer proofs: ${error.message}`);
  }
});

// ⭐ NEW: Complete User Deletion Function
exports.deleteUserCompletely = onCall(async (request) => {
  // Verify admin permissions
  const { auth, data } = request;
  
  if (!auth) {
    throw new HttpsError('unauthenticated', 'User must be authenticated');
  }

  // Get admin user profile to verify permissions
  const adminDoc = await db.collection('users').doc(auth.uid).get();
  if (!adminDoc.exists || adminDoc.data().role !== 'admin') {
    throw new HttpsError('permission-denied', 'Only admins can delete users');
  }

  const { userIdToDelete, transferProofsTo } = data;
  
  if (!userIdToDelete) {
    throw new HttpsError('invalid-argument', 'userIdToDelete is required');
  }

  // Prevent admin from deleting themselves
  if (userIdToDelete === auth.uid) {
    throw new HttpsError('permission-denied', 'Cannot delete your own account');
  }

  try {
    console.log(`🗑️ Starting complete deletion of user: ${userIdToDelete}`);
    
    // Step 1: Get user info before deletion
    const userDoc = await db.collection('users').doc(userIdToDelete).get();
    const userData = userDoc.data();
    
    if (!userData) {
      throw new HttpsError('not-found', 'User document not found');
    }

    console.log(`📋 User to delete: ${userData.email} (${userData.role})`);

    // Step 2: Handle proof ownership transfer
    let proofsTransferred = 0;
    if (transferProofsTo) {
      console.log(`📦 Transferring proofs to: ${transferProofsTo}`);
      
      // Find proofs owned by this user
      const clientProofsQuery = await db.collection('proofs')
        .where('clientId', '==', userIdToDelete)
        .get();
      
      // Find proofs assigned to this user
      const assignedProofsQuery = await db.collection('proofs')
        .where('assignedTo', 'array-contains', userIdToDelete)
        .get();
      
      const batch = db.batch();
      
      // Transfer client-owned proofs
      clientProofsQuery.docs.forEach(doc => {
        batch.update(doc.ref, { 
          clientId: transferProofsTo,
          transferredFrom: userIdToDelete,
          transferredAt: new Date(),
          transferredBy: auth.uid,
          transferReason: 'user_deletion'
        });
        proofsTransferred++;
      });
      
      // Transfer assigned proofs (remove from assignedTo array and add new user)
      assignedProofsQuery.docs.forEach(doc => {
        const currentAssigned = doc.data().assignedTo || [];
        const newAssigned = currentAssigned
          .filter(id => id !== userIdToDelete)
          .concat(transferProofsTo);
        
        batch.update(doc.ref, { 
          assignedTo: newAssigned,
          transferredFrom: userIdToDelete,
          transferredAt: new Date(),
          transferredBy: auth.uid,
          transferReason: 'user_deletion'
        });
        proofsTransferred++;
      });
      
      if (proofsTransferred > 0) {
        await batch.commit();
        console.log(`✅ Transferred ${proofsTransferred} proofs to ${transferProofsTo}`);
      }
    }

    // Step 3: Create audit log before deletion
    await db.collection('admin_actions').add({
      action: 'user_deleted',
      performedBy: auth.uid,
      performedByEmail: adminDoc.data().email,
      targetUserId: userIdToDelete,
      targetUserEmail: userData.email,
      targetUserRole: userData.role,
      proofsTransferred: proofsTransferred,
      transferredTo: transferProofsTo || null,
      timestamp: new Date(),
      details: {
        displayName: userData.displayName,
        createdAt: userData.createdAt,
        lastLogin: userData.lastLogin,
        isActive: userData.isActive
      }
    });

    console.log('📝 Audit log created');

    // Step 4: Delete Firebase Auth account
    try {
      await auth.deleteUser(userIdToDelete);
      console.log('🔐 Firebase Auth account deleted');
    } catch (authError) {
      console.warn('⚠️ Auth deletion failed (user may not exist in Auth):', authError.message);
      // Continue with Firestore deletion even if auth fails
    }

    // Step 5: Delete Firestore document
    await db.collection('users').doc(userIdToDelete).delete();
    console.log('🗃️ Firestore user document deleted');

    console.log(`✅ Complete deletion finished for ${userData.email}`);

    return {
      success: true,
      message: `User ${userData.email} completely deleted`,
      proofsTransferred: proofsTransferred,
      deletedFromAuth: true,
      deletedFromFirestore: true
    };

  } catch (error) {
    console.error('❌ Complete user deletion failed:', error);
    throw new HttpsError('internal', `Deletion failed: ${error.message}`);
  }
});

// ✨ UPDATED: Smart Client Invitation Function
exports.sendClientInvitation = onCall({
  secrets: [resendApiKey]
}, async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new Error('Must be authenticated to send invitations');
  }

  // Validate required data
  const { clientEmail, clientName, inviterEmail, inviteUrl } = request.data;
  
  if (!clientEmail || !clientName || !inviteUrl) {
    throw new Error('Missing required fields: clientEmail, clientName, or inviteUrl');
  }

  // Validate email format
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!emailRegex.test(clientEmail)) {
    throw new Error('Invalid email address format');
  }

  try {
    const resend = new Resend(resendApiKey.value());
    
    // ✨ NEW: Check for pending proofs for this email
    const pendingProofsQuery = await db.collection('proofs')
      .where('clientEmail', '==', clientEmail.toLowerCase())
      .where('status', '==', 'pending')
      .get();
    
    const pendingProofs = pendingProofsQuery.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    console.log(`📊 Found ${pendingProofs.length} pending proofs for ${clientEmail}`);
    
    // Prepare template data with proof information
    const templateData = {
      clientName,
      inviterEmail: inviterEmail || 'Cesar Graphics',
      inviteUrl,
      hasPendingProofs: pendingProofs.length > 0,
      proofCount: pendingProofs.length,
      proofs: pendingProofs.slice(0, 3), // Show max 3 proofs in email
      totalProofs: pendingProofs.length
    };
    
    const emailData = {
      from: FROM_EMAIL,
      to: clientEmail,
      subject: pendingProofs.length > 0 
        ? `🎨 Welcome to Cesar Graphics - ${pendingProofs.length} Proof${pendingProofs.length > 1 ? 's' : ''} Ready!`
        : '🎨 You\'re invited to Cesar Graphics Proofing Portal',
      html: getSmartInvitationTemplate(templateData)
    };

    const result = await resend.emails.send(emailData);
    
    console.log('✅ Smart invitation email sent successfully:', {
      to: clientEmail,
      clientName,
      inviterEmail,
      proofCount: pendingProofs.length,
      resendId: result.data?.id
    });

    return { 
      success: true, 
      message: `Invitation sent successfully${pendingProofs.length > 0 ? ` with ${pendingProofs.length} proof(s)` : ''}`,
      emailId: result.data?.id,
      proofCount: pendingProofs.length
    };

  } catch (error) {
    console.error('❌ Error sending smart invitation email:', error);
    throw new Error(`Failed to send invitation email: ${error.message}`);
  }
});

// Proof Ready Notification Function (for invited clients)
exports.sendProofNotification = onCall({
  secrets: [resendApiKey]
}, async (request) => {
  // Verify authentication
  if (!request.auth) {
    throw new Error('Must be authenticated to send notifications');
  }

  // Validate required data
  const { clientEmail, clientName, projectTitle, loginUrl } = request.data;
  
  if (!clientEmail || !clientName || !projectTitle) {
    throw new Error('Missing required fields: clientEmail, clientName, or projectTitle');
  }

  try {
    const resend = new Resend(resendApiKey.value());
    
    // Create data object for template
    const templateData = {
      clientName,
      title: projectTitle
    };
    
    const emailData = {
      from: FROM_EMAIL,
      to: clientEmail,
      subject: `🎨 New Proof Ready: ${projectTitle}`,
      html: getClientNotificationTemplate(templateData)
    };

    const result = await resend.emails.send(emailData);
    
    console.log('✅ Proof notification sent successfully:', {
      to: clientEmail,
      clientName,
      projectTitle,
      resendId: result.data?.id
    });

    return { 
      success: true, 
      message: 'Notification sent successfully',
      emailId: result.data?.id 
    };

  } catch (error) {
    console.error('❌ Error sending proof notification:', error);
    throw new Error(`Failed to send proof notification: ${error.message}`);
  }
});

// ✨ UPDATED: Smart handleNewProof function
exports.handleNewProof = onDocumentCreated('proofs/{proofId}', {
  secrets: [resendApiKey]
}, async (event) => {
  const proof = event.data.data();
  const proofId = event.params.proofId;
  
  console.log('🔔 New proof created:', proofId, proof.title);

  if (!proof.clientId || !proof.clientEmail) {
    console.log('⚠️ Skipping notification - no client assigned');
    return;
  }

  try {
    const resend = new Resend(resendApiKey.value());
    
    // ✨ NEW: Check client status before sending proof notification
    const clientDoc = await db.collection('users').doc(proof.clientId).get();
    
    if (!clientDoc.exists) {
      console.log('⚠️ Client document not found, skipping client notification');
    } else {
      const clientData = clientDoc.data();
      console.log(`📋 Client status: ${clientData.status} for ${clientData.email}`);
      
      // Only send separate proof notification if client is already active
      if (clientData.status === 'active') {
        const emailData = {
          from: FROM_EMAIL,
          to: proof.clientEmail,
          subject: `🎨 New Proof Ready: ${proof.title}`,
          html: getClientNotificationTemplate(proof)
        };

        // Try primary email first
        try {
          const result = await resend.emails.send(emailData);
          console.log('✅ Client notification sent via Resend:', result.data?.id);
          
          // Update proof with notification status
          await event.data.ref.update({
            emailSent: true,
            emailSentAt: new Date(),
            emailProvider: 'resend',
            resendId: result.data?.id
          });
        } catch (resendError) {
          console.error('❌ Resend failed, trying Gmail fallback:', resendError);
          
          // Gmail fallback for M365 delivery issues
          const gmailEmailData = {
            ...emailData,
            to: GMAIL_FALLBACK,
            subject: `[CLIENT: ${proof.clientEmail}] ${emailData.subject}`,
            html: `
              <div style="background: #fff3cd; border: 1px solid #ffeaa7; padding: 10px; margin-bottom: 20px; border-radius: 4px;">
                <strong>📧 Forward this to: ${proof.clientEmail}</strong><br>
                <small>Original delivery failed - M365 blocking detected</small>
              </div>
              ${emailData.html}
            `
          };
          
          const fallbackResult = await resend.emails.send(gmailEmailData);
          console.log('📨 Fallback notification sent to admin Gmail:', fallbackResult.data?.id);
          
          await event.data.ref.update({
            emailSent: true,
            emailSentAt: new Date(),
            emailProvider: 'resend-fallback',
            originalRecipient: proof.clientEmail,
            fallbackRecipient: GMAIL_FALLBACK,
            resendId: fallbackResult.data?.id
          });
        }
      } else if (clientData.status === 'invited') {
        console.log('🎯 Client recently invited - proof notification already included in invitation email');
        
        // Mark as notified but via invitation
        await event.data.ref.update({
          emailSent: true,
          emailSentAt: new Date(),
          emailProvider: 'invitation-included',
          notificationMethod: 'smart-invitation'
        });
      } else {
        console.log(`⚠️ Client status "${clientData.status}" - skipping notification`);
      }
    }

    // ✅ ALWAYS notify admin regardless of client status
    const adminEmailData = {
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `📊 New Proof Uploaded: ${proof.title}`,
      html: `
        <h2>New Proof Notification</h2>
        <p><strong>Project:</strong> ${proof.title}</p>
        <p><strong>Client:</strong> ${proof.clientName} (${proof.clientEmail})</p>
        <p><strong>Client Status:</strong> ${clientDoc.exists ? clientDoc.data().status : 'Unknown'}</p>
        <p><strong>Uploaded by:</strong> ${proof.uploaderEmail}</p>
        <p><strong>File:</strong> ${proof.fileName}</p>
        <p><strong>View:</strong> <a href="${FRONTEND_URL}/proof/${proofId}">Review Proof</a></p>
        ${clientDoc.exists && clientDoc.data().status === 'invited' ? 
          '<p><strong>📧 Note:</strong> Client notification included in invitation email</p>' : 
          ''}
      `
    };

    await resend.emails.send(adminEmailData);
    console.log('✅ Admin notification sent');

  } catch (error) {
    console.error('❌ Error in handleNewProof:', error);
  }
});

// Monitor proof status changes and send notifications  
exports.handleProofStatusChange = onDocumentUpdated('proofs/{proofId}', {
  secrets: [resendApiKey]
}, async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const proofId = event.params.proofId;

  // Check if status changed
  if (beforeData.status === afterData.status) {
    return; // No status change
  }

  console.log(`📝 Proof status changed: ${beforeData.status} → ${afterData.status} for ${afterData.title}`);

  try {
    const resend = new Resend(resendApiKey.value());
    
    // Notify admin of status changes
    const statusEmoji = {
      pending: '⏳',
      approved: '✅', 
      declined: '❌'
    };

    const adminEmailData = {
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `${statusEmoji[afterData.status]} Proof ${afterData.status.toUpperCase()}: ${afterData.title}`,
      html: `
        <h2>Proof Status Update</h2>
        <p><strong>Project:</strong> ${afterData.title}</p>
        <p><strong>Client:</strong> ${afterData.clientName}</p>
        <p><strong>Status:</strong> ${beforeData.status} → <strong>${afterData.status.toUpperCase()}</strong></p>
        ${afterData.clientFeedback ? `<p><strong>Client Feedback:</strong> ${afterData.clientFeedback}</p>` : ''}
        <p><strong>View:</strong> <a href="${FRONTEND_URL}/proof/${proofId}">Review Proof</a></p>
      `
    };

    await resend.emails.send(adminEmailData);
    console.log('✅ Admin status notification sent');

  } catch (error) {
    console.error('❌ Error in handleProofStatusChange:', error);
  }
});

// Health check endpoint
exports.healthCheck = onRequest(async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    functions: [
      'sendClientInvitation',
      'sendProofNotification', 
      'transferProofOwnership',  // Added to health check
      'deleteUserCompletely', // Add this line
      'handleNewProof',
      'handleProofStatusChange'
    ]
  });
});