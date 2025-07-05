const {onDocumentCreated, onDocumentUpdated} = require('firebase-functions/v2/firestore');
const {initializeApp} = require('firebase-admin/app');
const {getFirestore} = require('firebase-admin/firestore');
const {defineSecret} = require('firebase-functions/params');
const {Resend} = require('resend');

// Initialize Firebase Admin
initializeApp();
const db = getFirestore();

// Define secrets for secure API key storage
const resendApiKey = defineSecret('RESEND_API_KEY');

// ⚠️ UPDATE THESE SETTINGS FOR YOUR SETUP
const ADMIN_EMAIL = 'isaac@s-proof.app'; 
const FRONTEND_URL = 'https://proofingapp1.web.app';
const FROM_EMAIL_TESTING = 'isaac@s-proof.app'; // Force change with new variable name
const FROM_EMAIL = FROM_EMAIL_TESTING; // ✅ ADD THIS LINE - Define FROM_EMAIL

// Email template for clients (same as before)
const getClientNotificationTemplate = (data) => {
  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>New Proof Ready - Cesar Graphics</title>
    <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 0; 
          background-color: #f5f5f5; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: white; 
        }
        .header { 
          background: linear-gradient(135deg, #1f2937 0%, #374151 100%); 
          padding: 30px 20px; 
          text-align: center; 
        }
        .logo { 
          color: white; 
          font-size: 28px; 
          font-weight: bold; 
          margin: 0; 
        }
        .tagline { 
          color: #9ca3af; 
          margin: 8px 0 0 0; 
          font-size: 14px; 
        }
        .content { 
          padding: 40px 30px; 
        }
        .proof-card { 
          background: #f8fafc; 
          border: 1px solid #e2e8f0; 
          border-radius: 8px; 
          padding: 25px; 
          margin: 25px 0; 
        }
        .proof-title { 
          color: #1f2937; 
          font-size: 20px; 
          font-weight: bold; 
          margin: 0 0 15px 0; 
        }
        .proof-meta { 
          color: #64748b; 
          margin: 8px 0; 
        }
        .cta-button { 
            display: inline-block; 
            background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%); 
            color: white; 
            padding: 14px 28px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold; 
            margin: 20px 0;
            box-shadow: 0 4px 6px rgba(59, 130, 246, 0.1);
        }
        .footer { 
          background: #1f2937; 
          padding: 25px; 
          text-align: center; 
          color: #9ca3af; 
          font-size: 12px; 
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo">Cesar Graphics</h1>
            <p class="tagline">Professional Proofing System</p>
        </div>
        
        <div class="content">
            <h2 style="color: #1f2937; margin-bottom: 10px;">
              New Proof Ready for Review
            </h2>
            
            <p style="color: #4b5563; font-size: 16px;">
                Hi ${data.clientName},
            </p>
            
            <p style="color: #4b5563; font-size: 16px;">
                A new proof is ready for your review:
            </p>
            
            <div class="proof-card">
                <h3 class="proof-title">${data.proofTitle}</h3>
                <div class="proof-meta">
                  <strong>Uploaded:</strong> ${data.uploadDate}
                </div>
                <div class="proof-meta">
                  <strong>File Type:</strong> ${data.fileType}
                </div>
                
                <a href="${data.proofUrl}" class="cta-button">
                    Review Proof →
                </a>
            </div>
            
            <p style="color: #4b5563; font-size: 16px;">
                Please review and approve or request changes as needed.
            </p>
            
            <p style="color: #4b5563; font-size: 16px; margin-top: 30px;">
                Best regards,<br>
                <strong>The Cesar Graphics Team</strong>
            </p>
        </div>
        
        <div class="footer">
            <p><strong>Cesar Graphics</strong> | Professional Printing Solutions</p>
            <p style="margin-top: 15px;">
              This is an automated message from our proofing system.
            </p>
        </div>
    </div>
</body>
</html>`;
};

// Email template for admin notifications (same as before)
const getAdminNotificationTemplate = (data) => {
  const statusColor = data.status === 'approved' ? '#10b981' : '#ef4444';
  const statusText = data.status.charAt(0).toUpperCase() + data.status.slice(1);

  return `
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <title>Proof ${statusText} - Admin Alert</title>
    <style>
        body { 
          font-family: Arial, sans-serif; 
          margin: 0; 
          padding: 0; 
          background-color: #f5f5f5; 
        }
        .container { 
          max-width: 600px; 
          margin: 0 auto; 
          background-color: white; 
        }
        .header { 
          background: #dc2626; 
          padding: 25px 20px; 
          text-align: center; 
        }
        .logo { 
          color: white; 
          font-size: 24px; 
          font-weight: bold; 
          margin: 0; 
        }
        .content { 
          padding: 30px; 
        }
        .status-card { 
          background: #f8fafc; 
          border: 1px solid #e2e8f0; 
          border-radius: 8px; 
          padding: 20px; 
          margin: 20px 0; 
        }
        .status-badge { 
            display: inline-block; 
            background: ${statusColor}; 
            color: white; 
            padding: 6px 12px; 
            border-radius: 4px; 
            font-size: 14px; 
            font-weight: bold; 
        }
        .cta-button { 
            display: inline-block; 
            background: #374151; 
            color: white; 
            padding: 12px 24px; 
            text-decoration: none; 
            border-radius: 6px; 
            font-weight: bold; 
            margin: 15px 0;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1 class="logo">Admin Alert - Cesar Graphics</h1>
        </div>
        
        <div class="content">
            <h2 style="color: #1f2937;">Proof Status Update</h2>
            
            <div class="status-card">
                <h3 style="margin-top: 0;">${data.proofTitle}</h3>
                <p><strong>Client:</strong> ${data.clientName}</p>
                <p><strong>Status:</strong> 
                  <span class="status-badge">${statusText}</span>
                </p>
                <p><strong>Updated:</strong> ${data.timestamp}</p>
                
                <a href="${data.proofUrl}" class="cta-button">
                    View Proof →
                </a>
            </div>
            
            ${data.status === 'declined' ?
    '<p style="color: #dc2626; font-weight: bold;">⚠️ Action Required: Client requested changes</p>' :
    '<p style="color: #059669; font-weight: bold;">✅ Approved! Ready for production</p>'
}
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
    console.log('Sending email to client:', client.email);

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

    // Create the email object
    const emailObject = {
      from: FROM_EMAIL,
      to: client.email,
      subject: `New Proof Ready: ${proof.title} - Cesar Graphics`,
      html: getClientNotificationTemplate(emailData),
    };

    console.log('=== EMAIL OBJECT ABOUT TO BE SENT ===');
    console.log('FROM:', emailObject.from);
    console.log('TO:', emailObject.to);
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

    // Log success (handle undefined emailId)
    await db.collection('emailLogs').add({
      type: 'proof_created',
      proofId: proofId,
      recipientEmail: client.email,
      sentAt: new Date(),
      emailId: emailId,
      emailStatus: 'sent',
      fromEmail: FROM_EMAIL, // Log what FROM_EMAIL we used
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
      fromEmail: FROM_EMAIL, // Log what FROM_EMAIL we tried to use
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

  // Only send email if status actually changed
  if (beforeData.status === afterData.status) {
    console.log('Status unchanged, skipping email');
    return;
  }

  // Only notify for approved/declined
  if (!['approved', 'declined'].includes(afterData.status)) {
    console.log('Status not approved/declined, skipping email');
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

    // Send email to admin
    const result = await resend.emails.send({
      from: FROM_EMAIL_TESTING,
      to: 'isaac@isaacezequielsalas.com', // ✅ FIXED - Removed duplicate 'to' line
      subject: `Proof ${afterData.status.toUpperCase()}: ${afterData.title} - Cesar Graphics`,
      html: getAdminNotificationTemplate(emailData),
    });

    // Handle different response formats from Resend
    const emailId = result?.id || result?.data?.id || 'sent-successfully';
    console.log('Admin email sent! ID:', emailId);

    // Log success
    await db.collection('emailLogs').add({
      type: 'proof_status_changed',
      proofId: proofId,
      recipientEmail: 'isaac@isaacezequielsalas.com', // ✅ Use actual email for logging
      proofStatus: afterData.status,
      sentAt: new Date(),
      emailId: emailId,
      emailStatus: 'sent',
    });
  } catch (error) {
    console.error('Error sending admin email:', error);

    // Log error
    await db.collection('emailLogs').add({
      type: 'proof_status_changed',
      proofId: proofId,
      error: error.message,
      sentAt: new Date(),
      emailStatus: 'failed',
    });
  }
});