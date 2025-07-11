const {onDocumentCreated, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {defineSecret} = require('firebase-functions/params');
const {Resend} = require('resend');
const { onRequest, onCall } = require('firebase-functions/v2/https'); // Added onCall

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Define secrets for secure API key storage
const resendApiKey = defineSecret('RESEND_API_KEY');

// ⚠️ UPDATE THESE SETTINGS FOR YOUR SETUP
const ADMIN_EMAIL = 'isaac@s-proof.app'; 
const FRONTEND_URL = 'https://proofingapp1.web.app';
const FROM_EMAIL_TESTING = 'no-reply@s-proof.app';
const FROM_EMAIL = FROM_EMAIL_TESTING;
const GMAIL_FALLBACK = 'isaactheking7@gmail.com'; // Gmail fallback for M365 delivery issues

// NEW: Client Invitation Email Template
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

// Client Invitation Function
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
    
    const emailData = {
      from: FROM_EMAIL,
      to: clientEmail,
      subject: '🎨 You\'re invited to Cesar Graphics Proofing Portal',
      html: getClientInvitationTemplate(clientName, inviterEmail || 'Cesar Graphics', inviteUrl)
    };

    const result = await resend.emails.send(emailData);
    
    console.log('✅ Invitation email sent successfully:', {
      to: clientEmail,
      clientName,
      inviterEmail,
      resendId: result.data?.id
    });

    return { 
      success: true, 
      message: 'Invitation sent successfully',
      emailId: result.data?.id 
    };

  } catch (error) {
    console.error('❌ Error sending invitation email:', error);
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

// EXISTING FUNCTIONS (keeping your current email functions)

// Monitor when new proofs are created and send notifications
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

    // Also notify admin
    const adminEmailData = {
      from: FROM_EMAIL,
      to: ADMIN_EMAIL,
      subject: `📊 New Proof Uploaded: ${proof.title}`,
      html: `
        <h2>New Proof Notification</h2>
        <p><strong>Project:</strong> ${proof.title}</p>
        <p><strong>Client:</strong> ${proof.clientName} (${proof.clientEmail})</p>
        <p><strong>Uploaded by:</strong> ${proof.uploaderEmail}</p>
        <p><strong>File:</strong> ${proof.fileName}</p>
        <p><strong>View:</strong> <a href="${FRONTEND_URL}/proof/${proofId}">Review Proof</a></p>
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
      'handleNewProof',
      'handleProofStatusChange'
    ]
  });
});