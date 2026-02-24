const { onCall, onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { defineSecret } = require("firebase-functions/params");
const Resend = require("resend").Resend;

initializeApp();
const db = getFirestore();

// Define secret for Resend API key
const resendApiKey = defineSecret("RESEND_API_KEY");

// Constants
const FROM_EMAIL = 'noreply@s-proof.app';
const ADMIN_EMAIL = 'isaac@s-proof.app';
const FRONTEND_URL = 'https://proofingapp1.web.app';

// =============================================================================
// GODADDY-SAFE EMAIL TEMPLATES
// Simplified HTML with minimal styling to pass GoDaddy's content filters
// =============================================================================

const getSimpleInvitationTemplate = (data) => {
  const {
    clientName,
    inviterEmail,
    inviteUrl,
    hasPendingProofs,
    proofCount,
    proofs = []
  } = data;

  const proofsList = hasPendingProofs && proofs.length > 0 
    ? proofs.map(proof => `• ${proof.title || 'Untitled Proof'}`).join('<br>') 
    : '';

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial,sans-serif; background-color:#f5f5f5;">
  <div style="max-width:600px; margin:20px auto; background-color:#ffffff; padding:30px; border-radius:8px;">
    
    <!-- Header -->
    <div style="text-align:center; margin-bottom:30px;">
      <h1 style="color:#1a1a1a; font-size:24px; margin:0;">Cesar Graphics</h1>
      <p style="color:#666666; font-size:14px; margin:10px 0 0 0;">Your Local Print Shop</p>
    </div>

    <!-- Main Content -->
    <div style="color:#333333; font-size:16px; line-height:1.6;">
      <p>Hi ${clientName},</p>
      
      <p>You've been invited to access Cesar Graphics' proofing portal${inviterEmail ? ` by ${inviterEmail}` : ''}.</p>
      
      ${hasPendingProofs ? `
      <p><strong>You have ${proofCount} proof${proofCount > 1 ? 's' : ''} waiting for your review:</strong></p>
      <div style="background-color:#f9f9f9; padding:15px; margin:15px 0; border-radius:4px;">
        ${proofsList}
      </div>
      ` : ''}
      
      <p><strong>Get started here:</strong><br>
      <a href="${inviteUrl}" style="color:#0066cc; text-decoration:none;">${inviteUrl}</a></p>
      
      <p style="margin-top:30px;">Questions? Just reply to this email.</p>
      
      <p style="margin-top:20px;">Best regards,<br>
      <strong>The Cesar Graphics Team</strong></p>
    </div>

    <!-- Footer -->
    <div style="margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; text-align:center; color:#999999; font-size:12px;">
      <p style="margin:5px 0;">You're receiving this because you've been invited to collaborate on a project.</p>
    </div>
  </div>
</body>
</html>`;
};

const getSimpleProofNotificationTemplate = (data) => {
  const {
    clientName,
    title,
    loginUrl
  } = data;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial,sans-serif; background-color:#f5f5f5;">
  <div style="max-width:600px; margin:20px auto; background-color:#ffffff; padding:30px; border-radius:8px;">
    
    <!-- Header -->
    <div style="text-align:center; margin-bottom:30px;">
      <h1 style="color:#1a1a1a; font-size:24px; margin:0;">Cesar Graphics</h1>
    </div>

    <!-- Main Content -->
    <div style="color:#333333; font-size:16px; line-height:1.6;">
      <p>Hi ${clientName || 'there'},</p>
      
      <p><strong>Your proof is ready for review!</strong></p>
      
      <p><strong>Proof:</strong> ${title}</p>
      
      <p>Please review and provide your feedback.</p>
      
      <p><strong>View your proof here:</strong><br>
      <a href="${loginUrl}" style="color:#0066cc; text-decoration:none;">${loginUrl}</a></p>
      
      <p style="margin-top:30px;">Questions? Just reply to this email.</p>
      
      <p style="margin-top:20px;">Best regards,<br>
      <strong>The Cesar Graphics Team</strong></p>
    </div>

    <!-- Footer -->
    <div style="margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; text-align:center; color:#999999; font-size:12px;">
      <p style="margin:5px 0;">You're receiving this because you have an active project with Cesar Graphics.</p>
    </div>
  </div>
</body>
</html>`;
};

const getSimpleProductionStatusTemplate = (data) => {
  const {
    clientName,
    title,
    status,
    loginUrl
  } = data;

  const statusMessages = {
    in_production: {
      heading: 'Your Order is Now in Production',
      message: 'Great news! We\'ve started working on your order.'
    },
    completed: {
      heading: 'Your Order is Ready!',
      message: 'Your order has been completed and is ready for pickup or delivery.'
    }
  };

  const config = statusMessages[status] || statusMessages.in_production;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial,sans-serif; background-color:#f5f5f5;">
  <div style="max-width:600px; margin:20px auto; background-color:#ffffff; padding:30px; border-radius:8px;">
    
    <!-- Header -->
    <div style="text-align:center; margin-bottom:30px;">
      <h1 style="color:#1a1a1a; font-size:24px; margin:0;">Cesar Graphics</h1>
    </div>

    <!-- Main Content -->
    <div style="color:#333333; font-size:16px; line-height:1.6;">
      <p>Hi ${clientName || 'there'},</p>
      
      <p><strong>${config.heading}</strong></p>
      
      <p>${config.message}</p>
      
      <p><strong>Order:</strong> ${title}</p>
      
      <p><strong>View your order status:</strong><br>
      <a href="${loginUrl}" style="color:#0066cc; text-decoration:none;">${loginUrl}</a></p>
      
      <p style="margin-top:30px;">Questions? Just reply to this email.</p>
      
      <p style="margin-top:20px;">Best regards,<br>
      <strong>The Cesar Graphics Team</strong></p>
    </div>

    <!-- Footer -->
    <div style="margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; text-align:center; color:#999999; font-size:12px;">
      <p style="margin:5px 0;">You're receiving this because you have an active project with Cesar Graphics.</p>
    </div>
  </div>
</body>
</html>`;
};

// =============================================================================
// CLOUD FUNCTIONS - CALLABLE (for Firebase SDK httpsCallable)
// =============================================================================

// Send client invitation email
exports.sendClientInvitation = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    const { clientEmail, clientName, inviterEmail, inviteUrl } = request.data;

    if (!clientEmail || !clientName || !inviteUrl) {
      throw new Error('Missing required fields');
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      throw new Error('Invalid email address format');
    }

    try {
      const resend = new Resend(resendApiKey.value());

      // Check for pending proofs for this email
      const pendingProofsQuery = await db.collection('proofs')
        .where('clientEmail', '==', clientEmail.toLowerCase())
        .where('status', '==', 'pending')
        .get();

      const pendingProofs = pendingProofsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      console.log(`📊 Found ${pendingProofs.length} pending proofs for ${clientEmail}`);

      const templateData = {
        clientName,
        inviterEmail: inviterEmail || 'Cesar Graphics',
        inviteUrl,
        hasPendingProofs: pendingProofs.length > 0,
        proofCount: pendingProofs.length,
        proofs: pendingProofs.slice(0, 3),
        totalProofs: pendingProofs.length
      };

      const emailData = {
        from: FROM_EMAIL,
        to: clientEmail,
        subject: pendingProofs.length > 0 
          ? `Welcome to Cesar Graphics - ${pendingProofs.length} Proof${pendingProofs.length > 1 ? 's' : ''} Ready!`
          : 'You\'re invited to Cesar Graphics Proofing Portal',
        html: getSimpleInvitationTemplate(templateData),
        text: `Hi ${clientName}! Welcome to Cesar Graphics. Please visit: ${inviteUrl}`
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
        message: `Invitation sent successfully${pendingProofs.length > 0 ? ` with ${pendingProofs.length} pending proof${pendingProofs.length > 1 ? 's' : ''}` : ''}`,
        emailId: result.data?.id
      };

    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      throw new Error(`Failed to send invitation: ${error.message}`);
    }
  }
);

// Send proof notification email
exports.sendProofNotification = onCall(
  { secrets: [resendApiKey] },
  async (request) => {
    const { clientEmail, clientName, proofTitle } = request.data;

    if (!clientEmail || !proofTitle) {
      throw new Error('Missing required fields');
    }

    try {
      const resend = new Resend(resendApiKey.value());

      const emailData = {
        from: FROM_EMAIL,
        to: clientEmail,
        subject: `New Proof Ready for Review: ${proofTitle}`,
        html: getSimpleProofNotificationTemplate({
          clientName: clientName || 'there',
          title: proofTitle,
          loginUrl: FRONTEND_URL + '/auth',
        }),
        text: `Hi ${clientName || 'there'}! Your proof "${proofTitle}" is ready for review. Visit: ${FRONTEND_URL}/auth`
      };

      const result = await resend.emails.send(emailData);

      console.log('✅ Proof notification sent:', {
        to: clientEmail,
        proofTitle,
        resendId: result.data?.id
      });

      return { 
        success: true, 
        message: 'Notification sent successfully',
        emailId: result.data?.id
      };

    } catch (error) {
      console.error('❌ Error sending proof notification:', error);
      throw new Error(`Failed to send notification: ${error.message}`);
    }
  }
);

// =============================================================================
// OTHER CLOUD FUNCTIONS
// =============================================================================

// Transfer proof ownership from invitation ID to user Auth UID
exports.transferProofOwnership = onCall(async (request) => {
  const { invitationId, userId } = request.data;

  if (!invitationId || !userId) {
    throw new Error('Missing invitationId or userId');
  }

  try {
    console.log(`🔄 Starting proof transfer: ${invitationId} → ${userId}`);

    const proofsQuery = await db.collection('proofs')
      .where('clientId', '==', invitationId)
      .get();

    if (proofsQuery.empty) {
      console.log('ℹ️ No proofs found for invitation ID:', invitationId);
      return { 
        success: true, 
        message: 'No proofs to transfer',
        transferredCount: 0 
      };
    }

    const batch = db.batch();
    proofsQuery.docs.forEach(doc => {
      batch.update(doc.ref, { clientId: userId });
    });

    await batch.commit();

    console.log(`✅ Transferred ${proofsQuery.size} proofs to user ${userId}`);

    return { 
      success: true, 
      message: `Successfully transferred ${proofsQuery.size} proof(s)`,
      transferredCount: proofsQuery.size
    };

  } catch (error) {
    console.error('❌ Error transferring proofs:', error);
    throw new Error(`Failed to transfer proofs: ${error.message}`);
  }
});

// Delete user and all associated data
exports.deleteUserCompletely = onCall(async (request) => {
  const { userId } = request.data;

  if (!userId) {
    throw new Error('Missing userId');
  }

  try {
    console.log(`🗑️ Starting complete deletion for user: ${userId}`);

    await db.collection('users').doc(userId).delete();
    console.log('✅ User document deleted');

    const proofsQuery = await db.collection('proofs')
      .where('clientId', '==', userId)
      .get();

    const batch = db.batch();
    proofsQuery.docs.forEach(doc => {
      batch.delete(doc.ref);
    });

    await batch.commit();
    console.log(`✅ Deleted ${proofsQuery.size} proofs`);

    return { 
      success: true, 
      message: `User and ${proofsQuery.size} proof(s) deleted successfully`
    };

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw new Error(`Failed to delete user: ${error.message}`);
  }
});

// Firestore trigger: Handle new proof uploads
exports.handleNewProof = onDocumentCreated(
  {
    document: 'proofs/{proofId}',
    secrets: [resendApiKey]
  },
  async (event) => {
    const proof = event.data.data();
    const proofId = event.params.proofId;

    console.log('🆕 New proof created:', proofId, proof.title);

    try {
      const resend = new Resend(resendApiKey.value());

      const adminEmailData = {
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `New Proof Uploaded: ${proof.title}`,
        html: `
          <h2>New Proof Uploaded</h2>
          <p><strong>Title:</strong> ${proof.title}</p>
          <p><strong>Client:</strong> ${proof.clientName || 'N/A'} (${proof.clientEmail || 'N/A'})</p>
          <p><strong>Uploaded by:</strong> ${proof.uploadedBy || 'Unknown'}</p>
          <p><strong>Status:</strong> ${proof.status}</p>
          <p><strong>View:</strong> <a href="${FRONTEND_URL}">Open Dashboard</a></p>
        `,
        text: `New proof uploaded: ${proof.title}. View at ${FRONTEND_URL}`
      };

      await resend.emails.send(adminEmailData);
      console.log('✅ Admin notification sent');

      if (!proof.clientId) {
        console.log('ℹ️ No clientId, skipping client notification');
        return;
      }

      let clientData = null;
      let clientDoc = await db.collection('users').doc(proof.clientId).get();

      if (clientDoc.exists) {
        clientData = clientDoc.data();
        console.log('📧 Client found in users collection');
      } else {
        clientDoc = await db.collection('invitations').doc(proof.clientId).get();
        if (clientDoc.exists) {
          clientData = clientDoc.data();
          console.log('📧 Client found in invitations collection (pending signup)');
        }
      }

      if (!clientData) {
        console.log('⚠️ Client not found in users or invitations');
        return;
      }

      if (clientData.status === 'active') {
        const clientEmailData = {
          from: FROM_EMAIL,
          to: proof.clientEmail,
          subject: `New Proof Ready for Review: ${proof.title}`,
          html: getSimpleProofNotificationTemplate({
            clientName: proof.clientName || 'there',
            title: proof.title,
            loginUrl: FRONTEND_URL + '/auth',
          }),
          text: `Hi ${proof.clientName || 'there'}! Your proof "${proof.title}" is ready for review. Visit: ${FRONTEND_URL}/auth`
        };

        await resend.emails.send(clientEmailData);
        console.log('✅ Client notification sent');
      } else if (clientData.status === 'invited' || clientData.status === 'pending') {
        console.log('ℹ️ Client is pending signup, skipping notification (invitation email already sent)');
      }

    } catch (error) {
      console.error('❌ Error in handleNewProof:', error);
    }
  }
);

// Firestore trigger: Handle proof status changes
exports.handleProofStatusChange = onDocumentUpdated(
  {
    document: 'proofs/{proofId}',
    secrets: [resendApiKey]
  },
  async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    if (beforeData.status === afterData.status) {
      return;
    }

    console.log(`📊 Proof status changed: ${beforeData.status} → ${afterData.status}`);

    const statusLabel = {
      pending: 'Pending Review',
      approved: 'Approved',
      declined: 'Changes Requested',
      in_production: 'In Production',
      in_quality_control: 'In Quality Control',
      completed: 'Completed'
    };

    try {
      const resend = new Resend(resendApiKey.value());

      const adminEmailData = {
        from: FROM_EMAIL,
        to: ADMIN_EMAIL,
        subject: `Proof Status Update: ${afterData.title}`,
        html: `
          <h2>Proof Status Changed</h2>
          <p><strong>Proof:</strong> ${afterData.title}</p>
          <p><strong>Client:</strong> ${afterData.clientName || 'N/A'}</p>
          <p><strong>Status:</strong> ${beforeData.status} → ${afterData.status}</p>
          ${afterData.comments ? `<p><strong>Comments:</strong> ${afterData.comments}</p>` : ''}
          <p><strong>View:</strong> <a href="${FRONTEND_URL}">Open Dashboard</a></p>
        `,
        text: `Proof "${afterData.title}" status changed: ${beforeData.status} → ${afterData.status}. View at ${FRONTEND_URL}`
      };

      await resend.emails.send(adminEmailData);
      console.log('✅ Admin status notification sent');

      const clientNotifyStatuses = ['in_production', 'completed'];

      if (clientNotifyStatuses.includes(afterData.status) && afterData.clientEmail) {
        const clientEmailData = {
          from: FROM_EMAIL,
          to: afterData.clientEmail,
          subject: `${statusLabel[afterData.status]}: ${afterData.title}`,
          html: getSimpleProductionStatusTemplate({
            clientName: afterData.clientName || 'there',
            title: afterData.title,
            status: afterData.status,
            loginUrl: FRONTEND_URL + '/auth',
          }),
          text: `Hi ${afterData.clientName || 'there'}! Your order "${afterData.title}" status: ${statusLabel[afterData.status]}. View at ${FRONTEND_URL}/auth`
        };

        await resend.emails.send(clientEmailData);
        console.log(`✅ Client notified of ${afterData.status} status`);
      } else if (afterData.status === 'in_quality_control') {
        console.log('ℹ️ Skipping client email for in_quality_control (internal step)');
      }

    } catch (error) {
      console.error('❌ Error in handleProofStatusChange:', error);
    }
  }
);

// =============================================================================
// PDF THUMBNAIL GENERATION
// Triggers when a file is uploaded to Firebase Storage
// =============================================================================

// =============================================================================
// PDF THUMBNAIL GENERATION
// Triggers when a file is uploaded to Firebase Storage
// =============================================================================

exports.generatePdfThumbnail = onObjectFinalized(
  { memory: "1GiB", timeoutSeconds: 120, region: "us-west1" },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    // Only process PDFs in the proofFiles folder
    if (!filePath.startsWith("proofFiles/") || contentType !== "application/pdf") {
      console.log("⏭️ Skipping non-PDF or wrong folder:", filePath);
      return;
    }

    console.log("🖼️ Generating thumbnail for:", filePath);

    try {
      // Use @napi-rs/canvas — required for pdfjs-dist v5+
      // (the old 'canvas' package is NOT compatible with pdfjs v5)
      const { createCanvas, DOMMatrix, Image, ImageData, Path2D } = require("@napi-rs/canvas");

      // Polyfill browser globals for pdfjs-dist in Node.js environment
      global.DOMMatrix = DOMMatrix;
      global.Image = Image;
      global.ImageData = ImageData;
      global.Path2D = Path2D;

      // Polyfill document.createElement for pdfjs internal canvas creation
      global.document = {
        createElement: (tag) => createCanvas(1, 1),
        createElementNS: (_ns, tag) => createCanvas(1, 1),
      };

      const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");

      // Download PDF from Storage into a buffer
      const bucket = getStorage().bucket();
      const [pdfBuffer] = await bucket.file(filePath).download();

      // Custom canvas factory so pdfjs uses @napi-rs/canvas
      const NodeCanvasFactory = {
        create(width, height) {
          const canvas = createCanvas(width, height);
          const context = canvas.getContext("2d");
          return { canvas, context };
        },
        reset(canvasAndContext, width, height) {
          canvasAndContext.canvas.width = width;
          canvasAndContext.canvas.height = height;
        },
        destroy(canvasAndContext) {
          canvasAndContext.canvas.width = 0;
          canvasAndContext.canvas.height = 0;
          canvasAndContext.canvas = null;
          canvasAndContext.context = null;
        },
      };

      // Load PDF with pdfjs
      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBuffer),
        canvasFactory: NodeCanvasFactory,
      });
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);

      // Set up canvas
      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvasAndContext = NodeCanvasFactory.create(viewport.width, viewport.height);

      // Render page to canvas
      await page.render({
        canvasContext: canvasAndContext.context,
        viewport,
        canvasFactory: NodeCanvasFactory,
      }).promise;

      // Convert canvas to PNG buffer
      const thumbnailBuffer = canvasAndContext.canvas.toBuffer("image/png");

      // Save thumbnail to Storage
      const fileName = filePath.split("/").pop().replace(".pdf", "");
      const thumbnailPath = `thumbnailFiles/${fileName}.png`;
      await bucket.file(thumbnailPath).save(thumbnailBuffer, {
        metadata: { contentType: "image/png" },
      });

      // Make thumbnail publicly accessible
      await bucket.file(thumbnailPath).makePublic();
      const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbnailPath}`;

      console.log("✅ Thumbnail saved:", thumbnailUrl);

      // Find the matching proof doc in Firestore and update it
      // fileUrl contains the full Storage URL with the filename embedded,
      // so we search using the original filePath which is part of the URL
      const encodedPath = encodeURIComponent(filePath);
      const proofsQuery = await db.collection("proofs")
        .where("fileUrl", ">=", encodedPath)
        .where("fileUrl", "<=", encodedPath + "\uf8ff")
        .get();

      if (!proofsQuery.empty) {
        const proofDoc = proofsQuery.docs[0];
        await proofDoc.ref.update({ thumbnailUrl });
        console.log("✅ Proof doc updated with thumbnailUrl:", proofDoc.id);
      } else {
        // Fallback: try matching by filename substring against all recent proofs
        console.log("⚠️ Range query missed, trying fallback match for:", fileName);
        const recentProofs = await db.collection("proofs")
          .orderBy("createdAt", "desc")
          .limit(20)
          .get();

        const match = recentProofs.docs.find(doc => {
          const url = doc.data().fileUrl || "";
          return url.includes(fileName);
        });

        if (match) {
          await match.ref.update({ thumbnailUrl });
          console.log("✅ Proof doc updated via fallback match:", match.id);
        } else {
          console.log("⚠️ No matching proof doc found for:", fileName);
        }
      }

    } catch (error) {
      console.error("❌ Error generating thumbnail:", error);
    }
  }
);
// Health check endpoint
exports.healthCheck = onRequest(async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    functions: [
      'sendClientInvitation',
      'sendProofNotification',
      'transferProofOwnership',
      'deleteUserCompletely',
      'handleNewProof',
      'handleProofStatusChange',
      'generatePdfThumbnail',
      'healthCheck'
    ]
  });
});