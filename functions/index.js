const {onDocumentCreated, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {defineSecret} = require('firebase-functions/params');
const {Resend} = require('resend');
const { onRequest } = require('firebase-functions/v2/https');

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

// FIXED Client Email Template - Email client friendly
const getClientNotificationTemplate = (data) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Proof Ready - Cesar Graphics</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background-color: #1f2937; padding: 30px 20px; text-align: center;">
            <h1 style="color: white; font-size: 28px; font-weight: bold; margin: 0;">
                Cesar Graphics
            </h1>
            <p style="color: #9ca3af; margin: 8px 0 0 0; font-size: 14px;">
                Professional Proofing System
            </p>
        </div>
        
        <!-- Content -->
        <div style="padding: 40px 30px;">
            <h2 style="color: #1f2937; margin-bottom: 10px;">
                New Proof Ready for Review
            </h2>
            
            <p style="color: #4b5563; font-size: 16px;">
                Hi ${data.clientName},
            </p>
            
            <p style="color: #4b5563; font-size: 16px;">
                A new proof is ready for your review:
            </p>
            
            <!-- Proof Card -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin: 25px 0;">
                <h3 style="color: #1f2937; font-size: 20px; font-weight: bold; margin: 0 0 15px 0;">
                    ${data.proofTitle}
                </h3>
                <div style="color: #64748b; margin: 8px 0;">
                    <strong>Uploaded:</strong> ${data.uploadDate}
                </div>
                <div style="color: #64748b; margin: 8px 0;">
                    <strong>File Type:</strong> ${data.fileType}
                </div>
                
                <div style="margin-top: 20px;">
                    <a href="${data.proofUrl}" 
                       style="display: inline-block; background-color: #3b82f6; color: white; padding: 14px 28px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        Review Proof →
                    </a>
                </div>
            </div>
            
            <p style="color: #4b5563; font-size: 16px;">
                Please review and approve or request changes as needed.
            </p>
            
            <p style="color: #4b5563; font-size: 16px; margin-top: 30px;">
                Best regards,<br>
                <strong>The Cesar Graphics Team</strong>
            </p>
        </div>
        
        <!-- Footer -->
        <div style="background-color: #1f2937; padding: 25px; text-align: center; color: #9ca3af; font-size: 12px;">
            <p style="margin: 0;"><strong>Cesar Graphics</strong> | Professional Printing Solutions</p>
            <p style="margin: 15px 0 0 0;">
                This is an automated message from our proofing system.
            </p>
        </div>
    </div>
</body>
</html>`;
};

// FIXED Admin Email Template - Email client friendly
const getAdminNotificationTemplate = (data) => {
  const statusColor = data.status === 'approved' ? '#10b981' : '#ef4444';
  const statusText = data.status.charAt(0).toUpperCase() + data.status.slice(1);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proof ${statusText} - Admin Alert</title>
</head>
<body style="font-family: Arial, sans-serif; margin: 0; padding: 20px; background-color: #f5f5f5;">
    <div style="max-width: 600px; margin: 0 auto; background-color: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
        
        <!-- Header -->
        <div style="background-color: #dc2626; padding: 25px 20px; text-align: center;">
            <h1 style="color: white; font-size: 24px; font-weight: bold; margin: 0;">
                Admin Alert - Cesar Graphics
            </h1>
        </div>
        
        <!-- Content -->
        <div style="padding: 30px;">
            <h2 style="color: #1f2937; margin-top: 0;">Proof Status Update</h2>
            
            <!-- Status Card -->
            <div style="background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px; margin: 20px 0;">
                <h3 style="margin-top: 0; color: #1f2937;">${data.proofTitle}</h3>
                <p style="margin: 8px 0;"><strong>Client:</strong> ${data.clientName}</p>
                <p style="margin: 8px 0;">
                    <strong>Status:</strong> 
                    <span style="background-color: ${statusColor}; color: white; padding: 6px 12px; border-radius: 4px; font-size: 14px; font-weight: bold;">
                        ${statusText}
                    </span>
                </p>
                <p style="margin: 8px 0;"><strong>Updated:</strong> ${data.timestamp}</p>
                
                <div style="margin-top: 20px;">
                    <a href="${data.proofUrl}" 
                       style="display: inline-block; background-color: #374151; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold;">
                        View Proof
                    </a>
                </div>
            </div>
            
            ${data.status === 'declined' ?
                '<p style="color: #dc2626; font-weight: bold; padding: 15px; background-color: #fef2f2; border-radius: 6px;">⚠️ Action Required: Client requested changes</p>' :
                '<p style="color: #059669; font-weight: bold; padding: 15px; background-color: #f0fdf4; border-radius: 6px;">✅ Approved! Ready for production</p>'
            }
        </div>
        
        <!-- Footer -->
        <div style="background-color: #f8fafc; padding: 20px; text-align: center; color: #6b7280; font-size: 12px;">
            <p style="margin: 0;"><strong>Cesar Graphics</strong> | Professional Printing Solutions</p>
            <p style="margin: 8px 0 0 0;">This is an automated notification from your proofing system.</p>
        </div>
    </div>
</body>
</html>`;
};

// Function 1: Send email when new proof is created
exports.onProofCreated = onDocumentCreated({
  document: 'proofs/{proofId}',
  secrets: [resendApiKey],
}, async (event) => {
  const snapshot = event.data;
  if (!snapshot) {
    console.log('No data in the document');
    return;
  }

  const proof = snapshot.data();
  const proofId = event.params.proofId;

  console.log('=== EMAIL DEBUG START ===');
  console.log('New proof created:', proofId, proof.title);
  console.log('FROM_EMAIL constant value:', FROM_EMAIL);
  console.log('ADMIN_EMAIL constant value:', ADMIN_EMAIL);
  console.log('FRONTEND_URL constant value:', FRONTEND_URL);

  try {
    // Get client information
    const clientDoc = await db.collection('users').doc(proof.clientId).get();
    if (!clientDoc.exists) {
      console.error('Client not found:', proof.clientId);
      return;
    }

    const client = clientDoc.data();
    console.log('Original client email:', client.email);

    // Initialize Resend
    const resend = new Resend(resendApiKey.value());

    // Prepare email data
    const emailData = {
      clientName: client.displayName || client.email.split('@')[0],
      proofTitle: proof.title,
      uploadDate: new Date().toLocaleDateString(),
      fileType: proof.fileType || 'PDF',
      proofUrl: `${FRONTEND_URL}/proof/${proofId}`,
    };

    console.log('Email data prepared:', emailData);

    // SMART EMAIL ROUTING: Handle M365 delivery issues
    const isGmailAddress = client.email.includes('gmail.com');
    const finalRecipient = isGmailAddress ? client.email : GMAIL_FALLBACK;
    const isRedirected = !isGmailAddress;
    
    // Subject line adjustment for redirected emails
    const subjectPrefix = isRedirected ? `[FOR ${client.email}] ` : '';
    const subject = `${subjectPrefix}New Proof Ready: ${proof.title} - Cesar Graphics`;
    
    // Content adjustment for redirected emails
    let emailContent;
    if (isRedirected) {
      // Plain text for redirected emails to avoid further filtering
      emailContent = `
🔔 CLIENT NOTIFICATION (Redirected due to delivery issues)

ORIGINAL RECIPIENT: ${client.email}
PROJECT: ${proof.title}
UPLOADED: ${new Date().toLocaleDateString()}
FILE TYPE: ${proof.fileType || 'PDF'}

REVIEW LINK: ${FRONTEND_URL}/proof/${proofId}

This email was redirected to Gmail because ${client.email} appears to be filtering emails from s-proof.app. Please forward this notification to the client.

---
Cesar Graphics Professional Proofing System
      `.trim();
    } else {
      // Rich HTML template for Gmail addresses
      emailContent = getClientNotificationTemplate(emailData);
    }

    const emailObject = {
      from: FROM_EMAIL,
      to: finalRecipient,
      subject: subject,
      [isRedirected ? 'text' : 'html']: emailContent,
    };

    console.log('=== EMAIL OBJECT ABOUT TO BE SENT ===');
    console.log('FROM:', emailObject.from);
    console.log('TO:', emailObject.to);
    console.log('ORIGINAL CLIENT:', client.email);
    console.log('REDIRECTED:', isRedirected);
    console.log('SUBJECT:', emailObject.subject);
    console.log('===================================');

    // Send email
    const result = await resend.emails.send(emailObject);

    // Handle different response formats from Resend
    const emailId = result?.id || result?.data?.id || 'sent-successfully';
    console.log('Email sent successfully! ID:', emailId);
    console.log('=== FULL RESEND RESULT ===');
    console.log(JSON.stringify(result, null, 2));
    console.log('========================');

    // Log success
    await db.collection('emailLogs').add({
      type: 'proof_created',
      proofId: proofId,
      originalRecipient: client.email,
      actualRecipient: finalRecipient,
      redirected: isRedirected,
      sentAt: new Date(),
      emailId: emailId,
      emailStatus: 'sent',
      fromEmail: FROM_EMAIL,
      rawResult: result ? JSON.stringify(result) : 'no-result'
    });

    console.log('=== EMAIL DEBUG END ===');

  } catch (error) {
    console.error('=== EMAIL ERROR ===');
    console.error('Error sending email:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('=================');

    // Log error
    await db.collection('emailLogs').add({
      type: 'proof_created',
      proofId: proofId,
      error: error.message,
      sentAt: new Date(),
      emailStatus: 'failed',
      fromEmail: FROM_EMAIL,
    });
  }
});

// Function 2: Send email when proof status changes
exports.onProofStatusChanged = onDocumentUpdated({
  document: 'proofs/{proofId}',
  secrets: [resendApiKey],
}, async (event) => {
  const beforeData = event.data.before.data();
  const afterData = event.data.after.data();
  const proofId = event.params.proofId;

  console.log('=== STATUS CHANGE DEBUG START ===');
  console.log('Before status:', beforeData.status);
  console.log('After status:', afterData.status);
  console.log('ProofId:', proofId);

  // Only send email if status actually changed
  if (beforeData.status === afterData.status) {
    console.log('Status unchanged, skipping email');
    return;
  }

  // Only notify for approved/declined
  if (!['approved', 'declined'].includes(afterData.status)) {
    console.log('Status not approved/declined, skipping email. Status:', afterData.status);
    return;
  }

  console.log('Proof status changed:', proofId, 
              'from', beforeData.status, 'to', afterData.status);

  try {
    // Get client info
    const clientDoc = await db.collection('users').doc(afterData.clientId).get();
    if (!clientDoc.exists) {
      console.error('Client not found:', afterData.clientId);
      return;
    }

    const client = clientDoc.data();
    console.log('Sending admin notification for:', afterData.title);
    console.log('Client name:', client.displayName || client.email);

    // Initialize Resend
    const resend = new Resend(resendApiKey.value());

    // Prepare email data
    const emailData = {
      proofTitle: afterData.title,
      clientName: client.displayName || client.email.split('@')[0],
      status: afterData.status,
      timestamp: new Date().toLocaleString(),
      proofUrl: `${FRONTEND_URL}/proof/${proofId}`,
    };

    console.log('Email data prepared:', emailData);

    // ✅ Use proper admin template
    const emailObject = {
      from: FROM_EMAIL_TESTING,
      to: ADMIN_EMAIL,
      subject: `Proof ${afterData.status.toUpperCase()}: ${afterData.title} - Cesar Graphics`,
      html: getAdminNotificationTemplate(emailData),
    };

    console.log('=== ADMIN EMAIL ABOUT TO BE SENT ===');
    console.log('FROM:', emailObject.from);
    console.log('TO:', emailObject.to);
    console.log('SUBJECT:', emailObject.subject);
    console.log('=====================================');

    // Send email to admin
    const result = await resend.emails.send(emailObject);

    // Handle different response formats from Resend
    const emailId = result?.id || result?.data?.id || 'sent-successfully';
    console.log('Admin email sent! ID:', emailId);
    console.log('Full result:', JSON.stringify(result, null, 2));

    // Log success
    await db.collection('emailLogs').add({
      type: 'proof_status_changed',
      proofId: proofId,
      recipientEmail: ADMIN_EMAIL,
      proofStatus: afterData.status,
      sentAt: new Date(),
      emailId: emailId,
      emailStatus: 'sent',
      fromEmail: FROM_EMAIL_TESTING,
    });

    console.log('=== STATUS CHANGE DEBUG END ===');

  } catch (error) {
    console.error('=== ADMIN EMAIL ERROR ===');
    console.error('Error sending admin email:', error);
    console.error('Error details:', JSON.stringify(error, null, 2));
    console.error('========================');

    // Log error
    await db.collection('emailLogs').add({
      type: 'proof_status_changed',
      proofId: proofId,
      error: error.message,
      sentAt: new Date(),
      emailStatus: 'failed',
      recipientEmail: ADMIN_EMAIL,
    });
  }
});

// TEMPORARY: Test function for debugging
exports.testAdminEmail = onRequest({
  secrets: [resendApiKey],
}, async (req, res) => {
  console.log('=== TESTING ADMIN EMAIL ===');
  
  try {
    const resend = new Resend(resendApiKey.value());

    // Simple test email
    const result = await resend.emails.send({
      from: 'no-reply@s-proof.app',
      to: 'isaac@s-proof.app',
      subject: 'TEST: Admin Email Function',
      html: `
        <h1>Test Email</h1>
        <p>This is a simple test email to check if admin notifications work.</p>
        <p>Sent at: ${new Date().toLocaleString()}</p>
      `
    });

    console.log('Test email result:', result);
    
    res.json({ 
      success: true, 
      emailId: result?.data?.id || result?.id,
      message: 'Test email sent!'
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});