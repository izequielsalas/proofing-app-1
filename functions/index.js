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

// MODERN CLIENT EMAIL TEMPLATE - Sleek & Professional
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
                <p style="color: #A0AEC0; margin: 0; font-size: 16px; font-weight: 500;">
                    Professional Proofing System
                </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 50px 40px;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <div style="display: inline-block; background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); color: white; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 600; margin-bottom: 20px;">
                        NEW PROOF READY
                    </div>
                    <h2 style="color: #1A202C; font-size: 28px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.5px;">
                        Your Proof is Ready for Review
                    </h2>
                    <p style="color: #4A5568; font-size: 18px; line-height: 1.6; margin: 0;">
                        Hi ${data.clientName}, we've prepared your latest proof and it's ready for your review.
                    </p>
                </div>
                
                <!-- Proof Card -->
                <div style="background: linear-gradient(135deg, #F7FAFC 0%, #EDF2F7 100%); border: 1px solid #E2E8F0; border-radius: 12px; padding: 30px; margin: 30px 0; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 4px; background: linear-gradient(90deg, #4F46E5 0%, #7C3AED 50%, #EC4899 100%);"></div>
                    
                    <h3 style="color: #2D3748; font-size: 24px; font-weight: 700; margin: 0 0 20px 0; letter-spacing: -0.3px;">
                        ${data.proofTitle}
                    </h3>
                    
                    <div style="display: flex; flex-wrap: wrap; gap: 20px; margin-bottom: 30px;">
                        <div style="flex: 1; min-width: 140px;">
                            <div style="color: #718096; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                Upload Date
                            </div>
                            <div style="color: #2D3748; font-size: 16px; font-weight: 600;">
                                ${data.uploadDate}
                            </div>
                        </div>
                        <div style="flex: 1; min-width: 140px;">
                            <div style="color: #718096; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                File Type
                            </div>
                            <div style="color: #2D3748; font-size: 16px; font-weight: 600;">
                                ${data.fileType.toUpperCase()}
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${data.proofUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #DC2626 0%, #EF4444 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 4px 20px rgba(220, 38, 38, 0.3); transition: all 0.3s ease;">
                            Review Proof →
                        </a>
                    </div>
                </div>
                
                <!-- Instructions -->
                <div style="background: #F0FFF4; border: 1px solid #9AE6B4; border-radius: 12px; padding: 24px; margin: 30px 0;">
                    <h4 style="color: #22543D; font-size: 18px; font-weight: 700; margin: 0 0 12px 0;">
                        Next Steps
                    </h4>
                    <p style="color: #2F855A; font-size: 16px; line-height: 1.6; margin: 0;">
                        Please review your proof carefully and either approve it for production or request any necessary changes. Your feedback helps us ensure the final product meets your exact specifications.
                    </p>
                </div>
                
                <div style="text-align: center; margin-top: 40px;">
                    <p style="color: #4A5568; font-size: 16px; line-height: 1.6; margin: 0;">
                        Questions? Simply reply to this email.<br>
                        <strong style="color: #2D3748;">The Cesar Graphics Team</strong>
                    </p>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #F7FAFC; padding: 30px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="color: #2D3748; font-size: 16px; font-weight: 700; margin: 0 0 8px 0;">
                    Cesar Graphics
                </p>
                <p style="color: #718096; font-size: 14px; margin: 0;">
                    Professional Printing Solutions • Automated Proofing System
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// MODERN ADMIN EMAIL TEMPLATE - Sleek Dashboard Style
const getAdminNotificationTemplate = (data) => {
  const statusColor = data.status === 'approved' ? '#10B981' : '#EF4444';
  const statusBg = data.status === 'approved' ? '#ECFDF5' : '#FEF2F2';
  const statusText = data.status.charAt(0).toUpperCase() + data.status.slice(1);
  const statusIcon = data.status === 'approved' ? '✓' : '⚠';

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Proof ${statusText} - Admin Alert</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #1E293B 0%, #0F172A 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
    <div style="min-height: 100vh; padding: 40px 20px;">
        <div style="max-width: 600px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.15);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #DC2626 0%, #B91C1C 100%); padding: 40px 40px 60px 40px; text-align: center; position: relative;">
                <div style="position: absolute; top: 0; left: 0; right: 0; height: 4px; background: linear-gradient(90deg, #FBBF24 0%, #F59E0B 50%, #DC2626 100%);"></div>
                <div style="display: inline-block; background: rgba(255,255,255,0.2); padding: 12px; border-radius: 12px; margin-bottom: 16px;">
                    <div style="width: 40px; height: 40px; background: #ffffff; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 20px;">
                        🚨
                    </div>
                </div>
                <h1 style="color: #ffffff; font-size: 28px; font-weight: 700; margin: 0 0 8px 0; letter-spacing: -0.5px;">
                    Admin Alert
                </h1>
                <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 16px; font-weight: 500;">
                    Cesar Graphics Dashboard
                </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 50px 40px;">
                <div style="text-align: center; margin-bottom: 40px;">
                    <div style="display: inline-block; background: ${statusBg}; color: ${statusColor}; padding: 8px 20px; border-radius: 20px; font-size: 14px; font-weight: 700; margin-bottom: 20px;">
                        ${statusIcon} PROOF ${statusText.toUpperCase()}
                    </div>
                    <h2 style="color: #1A202C; font-size: 28px; font-weight: 700; margin: 0 0 16px 0; letter-spacing: -0.5px;">
                        Client Response Received
                    </h2>
                    <p style="color: #4A5568; font-size: 18px; line-height: 1.6; margin: 0;">
                        A client has responded to their proof. Here are the details:
                    </p>
                </div>
                
                <!-- Status Card -->
                <div style="background: linear-gradient(135deg, #F8FAFC 0%, #F1F5F9 100%); border: 2px solid #E2E8F0; border-radius: 16px; padding: 32px; margin: 30px 0; position: relative; overflow: hidden;">
                    <div style="position: absolute; top: 0; left: 0; width: 100%; height: 6px; background: ${statusColor};"></div>
                    
                    <div style="display: flex; align-items: center; margin-bottom: 24px;">
                        <div style="flex: 1;">
                            <h3 style="color: #1A202C; font-size: 24px; font-weight: 700; margin: 0; letter-spacing: -0.3px;">
                                ${data.proofTitle}
                            </h3>
                        </div>
                        <div style="background: ${statusColor}; color: #ffffff; padding: 8px 16px; border-radius: 20px; font-size: 14px; font-weight: 700;">
                            ${statusText}
                        </div>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-bottom: 28px;">
                        <div>
                            <div style="color: #64748B; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                Client
                            </div>
                            <div style="color: #1A202C; font-size: 16px; font-weight: 600;">
                                ${data.clientName}
                            </div>
                        </div>
                        <div>
                            <div style="color: #64748B; font-size: 14px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px; margin-bottom: 4px;">
                                Response Time
                            </div>
                            <div style="color: #1A202C; font-size: 16px; font-weight: 600;">
                                ${data.timestamp}
                            </div>
                        </div>
                    </div>
                    
                    <div style="text-align: center;">
                        <a href="${data.proofUrl}" 
                           style="display: inline-block; background: linear-gradient(135deg, #374151 0%, #1F2937 100%); color: #ffffff; padding: 16px 32px; text-decoration: none; border-radius: 8px; font-weight: 700; font-size: 16px; letter-spacing: 0.3px; box-shadow: 0 4px 20px rgba(55, 65, 81, 0.3);">
                            View Proof Details →
                        </a>
                    </div>
                </div>
                
                <!-- Action Required/Success Message -->
                ${data.status === 'declined' ? `
                <div style="background: linear-gradient(135deg, #FEF2F2 0%, #FECACA 100%); border: 2px solid #F87171; border-radius: 12px; padding: 24px; margin: 30px 0;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                        <div style="width: 24px; height: 24px; background: #EF4444; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 14px; color: white; font-weight: bold;">
                            !
                        </div>
                        <h4 style="color: #B91C1C; font-size: 18px; font-weight: 700; margin: 0;">
                            Action Required
                        </h4>
                    </div>
                    <p style="color: #DC2626; font-size: 16px; line-height: 1.6; margin: 0;">
                        The client has requested changes to this proof. Please review their feedback and prepare a revised version for approval.
                    </p>
                </div>
                ` : `
                <div style="background: linear-gradient(135deg, #F0FDF4 0%, #DCFCE7 100%); border: 2px solid #86EFAC; border-radius: 12px; padding: 24px; margin: 30px 0;">
                    <div style="display: flex; align-items: center; margin-bottom: 12px;">
                        <div style="width: 24px; height: 24px; background: #10B981; border-radius: 50%; display: flex; align-items: center; justify-content: center; margin-right: 12px; font-size: 14px; color: white; font-weight: bold;">
                            ✓
                        </div>
                        <h4 style="color: #059669; font-size: 18px; font-weight: 700; margin: 0;">
                            Ready for Production
                        </h4>
                    </div>
                    <p style="color: #047857; font-size: 16px; line-height: 1.6; margin: 0;">
                        Excellent! The client has approved this proof and it's ready to move forward to production. You can begin the printing process.
                    </p>
                </div>
                `}
            </div>
            
            <!-- Footer -->
            <div style="background: #F8FAFC; padding: 30px 40px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="color: #374151; font-size: 16px; font-weight: 700; margin: 0 0 8px 0;">
                    Cesar Graphics Admin Dashboard
                </p>
                <p style="color: #6B7280; font-size: 14px; margin: 0;">
                    Automated notification from your proofing system
                </p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// MODERN PLAIN TEXT TEMPLATE for redirected M365 emails
const getRedirectedEmailTemplate = (client, proof, proofId, frontendUrl) => {
  return `
🎨 CESAR GRAPHICS - CLIENT NOTIFICATION
═══════════════════════════════════════

📧 REDIRECTED FOR: ${client.email}
📁 PROJECT: ${proof.title}
📅 UPLOADED: ${new Date().toLocaleDateString()}
📄 FILE TYPE: ${proof.fileType || 'PDF'}

🔗 REVIEW LINK: ${frontendUrl}/proof/${proofId}

───────────────────────────────────────

ℹ️  EMAIL DELIVERY NOTICE:
This notification was redirected to Gmail because 
${client.email} has strict email filtering. Please 
forward this proof notification to your client.

📨 Client should receive future notifications once 
our domain reputation improves with their email provider.

───────────────────────────────────────

CESAR GRAPHICS PROFESSIONAL PROOFING SYSTEM
Automated notification • s-proof.app
  `.trim();
};

// UPDATED TEST EMAIL TEMPLATE - Modern Design
const getTestEmailTemplate = () => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>System Test - Cesar Graphics</title>
</head>
<body style="margin: 0; padding: 0; background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, sans-serif;">
    <div style="min-height: 100vh; padding: 40px 20px;">
        <div style="max-width: 500px; margin: 0 auto; background: #ffffff; border-radius: 16px; overflow: hidden; box-shadow: 0 20px 40px rgba(0,0,0,0.1);">
            
            <!-- Header -->
            <div style="background: linear-gradient(135deg, #4F46E5 0%, #7C3AED 100%); padding: 40px; text-align: center;">
                <div style="width: 60px; height: 60px; background: rgba(255,255,255,0.2); border-radius: 12px; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 16px; font-size: 24px;">
                    🧪
                </div>
                <h1 style="color: #ffffff; font-size: 24px; font-weight: 700; margin: 0 0 8px 0;">
                    System Test
                </h1>
                <p style="color: rgba(255,255,255,0.8); margin: 0; font-size: 14px;">
                    Email Delivery Verification
                </p>
            </div>
            
            <!-- Content -->
            <div style="padding: 40px;">
                <div style="text-align: center;">
                    <div style="width: 80px; height: 80px; background: linear-gradient(135deg, #10B981 0%, #059669 100%); border-radius: 50%; display: inline-flex; align-items: center; justify-content: center; margin-bottom: 24px; font-size: 32px;">
                        ✓
                    </div>
                    <h2 style="color: #1A202C; font-size: 22px; font-weight: 700; margin: 0 0 16px 0;">
                        Test Successful!
                    </h2>
                    <p style="color: #4A5568; font-size: 16px; line-height: 1.6; margin: 0 0 24px 0;">
                        Your email system is working perfectly. All notifications will be delivered successfully.
                    </p>
                    <div style="background: #F7FAFC; border-radius: 8px; padding: 20px; text-align: left;">
                        <div style="color: #2D3748; font-size: 14px; font-weight: 600; margin-bottom: 8px;">
                            TEST DETAILS:
                        </div>
                        <div style="color: #4A5568; font-size: 14px; line-height: 1.5;">
                            <strong>Timestamp:</strong> ${new Date().toLocaleString()}<br>
                            <strong>System:</strong> Cesar Graphics Proofing<br>
                            <strong>Status:</strong> All systems operational
                        </div>
                    </div>
                </div>
            </div>
            
            <!-- Footer -->
            <div style="background: #F7FAFC; padding: 20px; text-align: center; border-top: 1px solid #E2E8F0;">
                <p style="color: #6B7280; font-size: 12px; margin: 0;">
                    Cesar Graphics • Automated Testing System
                </p>
            </div>
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
      // Modern plain text for redirected emails
      emailContent = getRedirectedEmailTemplate(client, proof, proofId, FRONTEND_URL);
    } else {
      // Modern HTML template for Gmail addresses
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

    // Use modern admin template
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

// MODERN TEST FUNCTION - Updated with sleek design
exports.testAdminEmail = onRequest({
  secrets: [resendApiKey],
}, async (req, res) => {
  console.log('=== TESTING MODERN EMAIL SYSTEM ===');
  
  try {
    const resend = new Resend(resendApiKey.value());

    // Modern test email
    const result = await resend.emails.send({
      from: 'no-reply@s-proof.app',
      to: 'isaac@s-proof.app',
      subject: 'System Test - Modern Email Templates',
      html: getTestEmailTemplate()
    });

    console.log('Modern test email result:', result);
    
    res.json({ 
      success: true, 
      emailId: result?.data?.id || result?.id,
      message: 'Modern email template test sent successfully!',
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error('Test email error:', error);
    res.status(500).json({ 
      success: false, 
      error: error.message 
    });
  }
});