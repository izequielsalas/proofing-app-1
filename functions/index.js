const { onCall, onRequest } = require("firebase-functions/v2/https");
const { onDocumentCreated, onDocumentUpdated } = require("firebase-functions/v2/firestore");
const { onObjectFinalized } = require("firebase-functions/v2/storage");
const { onSchedule } = require("firebase-functions/v2/scheduler");
const { initializeApp } = require("firebase-admin/app");
const { getFirestore, FieldValue, Timestamp } = require("firebase-admin/firestore");
const { getStorage } = require("firebase-admin/storage");
const { getAuth } = require("firebase-admin/auth");
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

const REMINDER_1_HOURS = 24;  // First reminder after 24 hours
const REMINDER_2_HOURS = 72;  // Second reminder after 72 hours

// =============================================================================
// EMAIL TEMPLATES
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
    <div style="text-align:center; margin-bottom:30px;">
      <h1 style="color:#1a1a1a; font-size:24px; margin:0;">Cesar Graphics</h1>
      <p style="color:#666666; font-size:14px; margin:10px 0 0 0;">Your Local Print Shop</p>
    </div>
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
    <div style="margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; text-align:center; color:#999999; font-size:12px;">
      <p style="margin:5px 0;">You're receiving this because you've been invited to collaborate on a project.</p>
    </div>
  </div>
</body>
</html>`;
};

const getSimpleProofNotificationTemplate = (data) => {
  const { clientName, title, loginUrl } = data;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial,sans-serif; background-color:#f5f5f5;">
  <div style="max-width:600px; margin:20px auto; background-color:#ffffff; padding:30px; border-radius:8px;">
    <div style="text-align:center; margin-bottom:30px;">
      <h1 style="color:#1a1a1a; font-size:24px; margin:0;">Cesar Graphics</h1>
    </div>
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
    <div style="margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; text-align:center; color:#999999; font-size:12px;">
      <p style="margin:5px 0;">You're receiving this because you have an active project with Cesar Graphics.</p>
    </div>
  </div>
</body>
</html>`;
};

const getSimpleProductionStatusTemplate = (data) => {
  const { clientName, title, status, loginUrl } = data;

  const statusMessages = {
    in_production: {
      heading: 'Your Order is Now in Production',
      message: 'Great news! We\'ve started working on your order.'
    },
    completed: {
      heading: 'Your Order is Ready!',
      message: 'Your order has been completed and is ready for pickup or delivery.'
    },
  };

  const config = statusMessages[status] || statusMessages.completed;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial,sans-serif; background-color:#f5f5f5;">
  <div style="max-width:600px; margin:20px auto; background-color:#ffffff; padding:30px; border-radius:8px;">
    <div style="text-align:center; margin-bottom:30px;">
      <h1 style="color:#1a1a1a; font-size:24px; margin:0;">Cesar Graphics</h1>
    </div>
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
    <div style="margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; text-align:center; color:#999999; font-size:12px;">
      <p style="margin:5px 0;">You're receiving this because you have an active project with Cesar Graphics.</p>
    </div>
  </div>
</body>
</html>`;
};

const getProofReminderTemplate = (data) => {
  const { clientName, title, loginUrl, reminderNumber } = data;

  const isSecondReminder = reminderNumber === 2;

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
</head>
<body style="margin:0; padding:0; font-family:Arial,sans-serif; background-color:#f5f5f5;">
  <div style="max-width:600px; margin:20px auto; background-color:#ffffff; padding:30px; border-radius:8px;">
    <div style="text-align:center; margin-bottom:30px;">
      <h1 style="color:#1a1a1a; font-size:24px; margin:0;">Cesar Graphics</h1>
      <p style="color:#666666; font-size:14px; margin:10px 0 0 0;">Your Local Print Shop</p>
    </div>
    <div style="color:#333333; font-size:16px; line-height:1.6;">
      <p>Hi ${clientName || 'there'},</p>
      <p>${isSecondReminder
        ? 'We wanted to follow up — your proof is still waiting for your review.'
        : 'Just a friendly reminder that your proof is ready and waiting for your approval.'
      }</p>
      <p><strong>Proof:</strong> ${title}</p>
      <p>Please take a moment to review it and let us know if it looks good or if any changes are needed. Your approval helps us keep your order on schedule.</p>
      <p><strong>Review your proof here:</strong><br>
      <a href="${loginUrl}" style="color:#0066cc; text-decoration:none;">${loginUrl}</a></p>
      <p style="margin-top:30px;">Questions? Just reply to this email.</p>
      <p style="margin-top:20px;">Best regards,<br>
      <strong>The Cesar Graphics Team</strong></p>
    </div>
    <div style="margin-top:40px; padding-top:20px; border-top:1px solid #e5e5e5; text-align:center; color:#999999; font-size:12px;">
      <p style="margin:5px 0;">You're receiving this because you have a proof awaiting your review at Cesar Graphics.</p>
    </div>
  </div>
</body>
</html>`;
};

// =============================================================================
// CALLABLE FUNCTIONS
// =============================================================================

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

      const pendingProofsQuery = await db.collection('proofs')
        .where('clientEmail', '==', clientEmail.toLowerCase())
        .where('status', '==', 'pending')
        .get();

      const pendingProofs = pendingProofsQuery.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

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

      return {
        success: true,
        message: `Invitation sent successfully`,
        emailId: result.data?.id
      };

    } catch (error) {
      console.error('❌ Error sending invitation:', error);
      throw new Error(`Failed to send invitation: ${error.message}`);
    }
  }
);

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

exports.transferProofOwnership = onCall(async (request) => {
  const { invitationId, userId } = request.data;

  if (!invitationId || !userId) {
    throw new Error('Missing invitationId or userId');
  }

  try {
    const proofsQuery = await db.collection('proofs')
      .where('clientId', '==', invitationId)
      .get();

    if (proofsQuery.empty) {
      return { success: true, message: 'No proofs to transfer', transferredCount: 0 };
    }

    const batch = db.batch();
    proofsQuery.docs.forEach(doc => {
      batch.update(doc.ref, { clientId: userId });
    });
    await batch.commit();

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

exports.deleteUserCompletely = onCall(async (request) => {
  const { userId } = request.data;

  if (!userId) throw new Error('Missing userId');

  try {
    await db.collection('users').doc(userId).delete();

    const proofsQuery = await db.collection('proofs')
      .where('clientId', '==', userId)
      .get();

    const batch = db.batch();
    proofsQuery.docs.forEach(doc => batch.delete(doc.ref));
    await batch.commit();

    try {
      await getAuth().deleteUser(userId);
    } catch (authErr) {
      console.warn('⚠️ Could not delete Auth account:', authErr.message);
    }

    return {
      success: true,
      message: `User and ${proofsQuery.size} proof(s) deleted successfully`
    };

  } catch (error) {
    console.error('❌ Error deleting user:', error);
    throw new Error(`Failed to delete user: ${error.message}`);
  }
});

exports.createStaffUser = onCall(async (request) => {
  if (!request.auth) {
    throw new Error('unauthenticated: Must be logged in.');
  }

  const callerDoc = await db.collection('users').doc(request.auth.uid).get();
  if (!callerDoc.exists || callerDoc.data().role !== 'admin') {
    throw new Error('permission-denied: Only admins can create staff accounts.');
  }

  const { displayName, email, password, role, department } = request.data;

  if (!displayName || !email || !password || !role) {
    throw new Error('invalid-argument: displayName, email, password, and role are required.');
  }
  if (!['admin', 'designer', 'production'].includes(role)) {
    throw new Error('invalid-argument: Role must be admin, designer, or production.');
  }
  if (password.length < 8) {
    throw new Error('invalid-argument: Password must be at least 8 characters.');
  }

  const ROLE_PERMISSIONS = {
    admin: { canViewAllProofs: true, canUploadProofs: true, canApproveProofs: true, canManageUsers: true },
    designer: { canViewAllProofs: false, canUploadProofs: true, canApproveProofs: false, canManageUsers: false },
    production: { canViewAllProofs: false, canUploadProofs: false, canApproveProofs: false, canManageUsers: false }
  };

  try {
    const userRecord = await getAuth().createUser({
      email: email.trim().toLowerCase(),
      password,
      displayName: displayName.trim(),
    });

    await db.collection('users').doc(userRecord.uid).set({
      uid: userRecord.uid,
      email: email.trim().toLowerCase(),
      displayName: displayName.trim(),
      role,
      ...(role === 'production' && department ? { department: department.trim() } : {}),
      status: 'active',
      isActive: true,
      permissions: ROLE_PERMISSIONS[role],
      createdAt: FieldValue.serverTimestamp(),
      updatedAt: FieldValue.serverTimestamp(),
      createdBy: request.auth.uid,
    });

    return { success: true, uid: userRecord.uid };

  } catch (err) {
    console.error('createStaffUser error:', err);
    if (err.code === 'auth/email-already-exists') {
      throw new Error('already-exists: An account with this email already exists.');
    }
    if (err.code === 'auth/invalid-email') {
      throw new Error('invalid-argument: Invalid email address.');
    }
    throw new Error(err.message || 'Failed to create account.');
  }
});

// =============================================================================
// FIRESTORE TRIGGERS
// =============================================================================

exports.handleNewProof = onDocumentCreated(
  { document: 'proofs/{proofId}', secrets: [resendApiKey] },
  async (event) => {
    const proof = event.data.data();
    const proofId = event.params.proofId;

    console.log('🆕 New proof created:', proofId, proof.title);

    try {
      const resend = new Resend(resendApiKey.value());

      await resend.emails.send({
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
      });
      console.log('✅ Admin notification sent');

      if (!proof.clientId) return;

      let clientData = null;
      let clientDoc = await db.collection('users').doc(proof.clientId).get();

      if (clientDoc.exists) {
        clientData = clientDoc.data();
      } else {
        clientDoc = await db.collection('invitations').doc(proof.clientId).get();
        if (clientDoc.exists) clientData = clientDoc.data();
      }

      if (!clientData) return;

      if (clientData.status === 'active') {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: proof.clientEmail,
          subject: `New Proof Ready for Review: ${proof.title}`,
          html: getSimpleProofNotificationTemplate({
            clientName: proof.clientName || 'there',
            title: proof.title,
            loginUrl: FRONTEND_URL + '/auth',
          }),
          text: `Hi ${proof.clientName || 'there'}! Your proof "${proof.title}" is ready for review. Visit: ${FRONTEND_URL}/auth`
        });
        console.log('✅ Client notification sent');
      }

    } catch (error) {
      console.error('❌ Error in handleNewProof:', error);
    }
  }
);

// Handle proof status changes
// Email rules:
//   Admin:  approved + completed only
//   Client: in_production (designer/admin only) + completed
exports.handleProofStatusChange = onDocumentUpdated(
  { document: 'proofs/{proofId}', secrets: [resendApiKey] },
  async (event) => {
    const beforeData = event.data.before.data();
    const afterData = event.data.after.data();

    if (beforeData.status === afterData.status) return;

    const { status, updatedByRole } = afterData;
    console.log(`📊 Proof status changed: ${beforeData.status} → ${status} (by ${updatedByRole})`);

    try {
      const resend = new Resend(resendApiKey.value());

      // ── Admin: approved + completed only ─────────────────────
      if (status === 'approved' || status === 'completed') {
        await resend.emails.send({
          from: FROM_EMAIL,
          to: ADMIN_EMAIL,
          subject: `Proof Status Update: ${afterData.title}`,
          html: `
            <h2>Proof Status Changed</h2>
            <p><strong>Proof:</strong> ${afterData.title}</p>
            <p><strong>Client:</strong> ${afterData.clientName || 'N/A'}</p>
            <p><strong>Status:</strong> ${beforeData.status} → ${status}</p>
            ${afterData.comments ? `<p><strong>Comments:</strong> ${afterData.comments}</p>` : ''}
            <p><strong>View:</strong> <a href="${FRONTEND_URL}">Open Dashboard</a></p>
          `,
          text: `Proof "${afterData.title}" status changed to ${status}. View at ${FRONTEND_URL}`
        });
        console.log('✅ Admin status notification sent');
      }

      // ── Client notifications ──────────────────────────────────
      const shouldNotifyClient = (() => {
        if (status === 'in_production') {
          return updatedByRole === 'designer' || updatedByRole === 'admin';
        }
        if (status === 'completed') return true;
        return false;
      })();

      if (shouldNotifyClient && afterData.clientEmail) {
        const statusLabel = { in_production: 'In Production', completed: 'Completed' };
        await resend.emails.send({
          from: FROM_EMAIL,
          to: afterData.clientEmail,
          subject: `${statusLabel[status]}: ${afterData.title}`,
          html: getSimpleProductionStatusTemplate({
            clientName: afterData.clientName || 'there',
            title: afterData.title,
            status,
            loginUrl: FRONTEND_URL + '/auth',
          }),
          text: `Hi ${afterData.clientName || 'there'}! Your order "${afterData.title}" is now: ${statusLabel[status]}. View at ${FRONTEND_URL}/auth`
        });
        console.log(`✅ Client notified of ${status} status`);
      }

    } catch (error) {
      console.error('❌ Error in handleProofStatusChange:', error);
    }
  }
);

// =============================================================================
// PENDING PROOF REMINDER — runs every 24 hours
// Sends reminder #1 at 24h, reminder #2 at 72h, then stops
// =============================================================================

exports.sendPendingProofReminders = onSchedule(
  {
    schedule: 'every 24 hours',
    secrets: [resendApiKey],
  },
  async () => {
    console.log('⏰ Running pending proof reminder job...');

    const now = Date.now();
    const hour = 60 * 60 * 1000;

    try {
      const resend = new Resend(resendApiKey.value());

      // Fetch all pending proofs that have a client email
      const snapshot = await db.collection('proofs')
        .where('status', '==', 'pending')
        .where('clientEmail', '!=', '')
        .get();

      if (snapshot.empty) {
        console.log('ℹ️ No pending proofs found.');
        return;
      }

      console.log(`📋 Found ${snapshot.size} pending proofs to check.`);

      let sent = 0;
      let skipped = 0;

      for (const docSnap of snapshot.docs) {
        const proof = docSnap.data();
        const proofId = docSnap.id;

        // Skip if no createdAt
        if (!proof.createdAt) { skipped++; continue; }

        const createdAt = proof.createdAt.toDate
          ? proof.createdAt.toDate().getTime()
          : new Date(proof.createdAt).getTime();

        const ageHours = (now - createdAt) / hour;
        const reminderCount = proof.reminderCount || 0;
        const lastReminderSentAt = proof.lastReminderSentAt
          ? (proof.lastReminderSentAt.toDate
              ? proof.lastReminderSentAt.toDate().getTime()
              : new Date(proof.lastReminderSentAt).getTime())
          : null;

        // Already sent max reminders — skip
        if (reminderCount >= 2) { skipped++; continue; }

        // Determine if we should send a reminder
        let shouldSend = false;
        let nextReminderNumber = reminderCount + 1;

        if (reminderCount === 0 && ageHours >= REMINDER_1_HOURS) {
          // Never sent a reminder and proof is 24+ hours old
          shouldSend = true;
        } else if (reminderCount === 1 && ageHours >= REMINDER_2_HOURS) {
          // Sent one reminder already, proof is 72+ hours old
          // Also make sure at least 24 hours have passed since last reminder
          const hoursSinceLastReminder = lastReminderSentAt ? (now - lastReminderSentAt) / hour : 999;
          shouldSend = hoursSinceLastReminder >= 24;
        }

        if (!shouldSend) { skipped++; continue; }

        // Skip proofs assigned to invited (not yet active) clients
        if (proof.clientStatus === 'invited') { skipped++; continue; }

        try {
          await resend.emails.send({
            from: FROM_EMAIL,
            to: proof.clientEmail,
            subject: nextReminderNumber === 1
              ? `Reminder: Your proof is waiting for review — ${proof.title}`
              : `Final reminder: Your proof still needs your approval — ${proof.title}`,
            html: getProofReminderTemplate({
              clientName: proof.clientName || 'there',
              title: proof.title,
              loginUrl: FRONTEND_URL + '/auth',
              reminderNumber: nextReminderNumber,
            }),
            text: `Hi ${proof.clientName || 'there'}! Your proof "${proof.title}" is still waiting for your review. Visit: ${FRONTEND_URL}/auth`,
          });

          // Update proof doc with reminder tracking
          await docSnap.ref.update({
            reminderCount: nextReminderNumber,
            lastReminderSentAt: FieldValue.serverTimestamp(),
          });

          console.log(`✅ Reminder #${nextReminderNumber} sent for proof ${proofId} (${proof.title})`);
          sent++;

        } catch (emailErr) {
          console.error(`❌ Failed to send reminder for proof ${proofId}:`, emailErr.message);
        }
      }

      console.log(`📊 Reminder job complete — sent: ${sent}, skipped: ${skipped}`);

    } catch (error) {
      console.error('❌ Error in sendPendingProofReminders:', error);
    }
  }
);

// =============================================================================
// PDF THUMBNAIL GENERATION
// =============================================================================

exports.generatePdfThumbnail = onObjectFinalized(
  { memory: "1GiB", timeoutSeconds: 120, region: "us-west1" },
  async (event) => {
    const filePath = event.data.name;
    const contentType = event.data.contentType;

    if (!filePath.startsWith("proofFiles/") || contentType !== "application/pdf") {
      console.log("⏭️ Skipping non-PDF or wrong folder:", filePath);
      return;
    }

    console.log("🖼️ Generating thumbnail for:", filePath);

    try {
      const { createCanvas, DOMMatrix, Image, ImageData, Path2D } = require("@napi-rs/canvas");

      global.DOMMatrix = DOMMatrix;
      global.Image = Image;
      global.ImageData = ImageData;
      global.Path2D = Path2D;

      global.document = {
        createElement: (tag) => createCanvas(1, 1),
        createElementNS: (_ns, tag) => createCanvas(1, 1),
      };

      const pdfjsLib = require("pdfjs-dist/legacy/build/pdf.mjs");

      const bucket = getStorage().bucket();
      const [pdfBuffer] = await bucket.file(filePath).download();

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

      const loadingTask = pdfjsLib.getDocument({
        data: new Uint8Array(pdfBuffer),
        canvasFactory: NodeCanvasFactory,
      });
      const pdfDoc = await loadingTask.promise;
      const page = await pdfDoc.getPage(1);

      const scale = 1.5;
      const viewport = page.getViewport({ scale });
      const canvasAndContext = NodeCanvasFactory.create(viewport.width, viewport.height);

      await page.render({
        canvasContext: canvasAndContext.context,
        viewport,
        canvasFactory: NodeCanvasFactory,
      }).promise;

      const thumbnailBuffer = canvasAndContext.canvas.toBuffer("image/png");

      const fileName = filePath.split("/").pop().replace(".pdf", "");
      const thumbnailPath = `thumbnailFiles/${fileName}.png`;
      await bucket.file(thumbnailPath).save(thumbnailBuffer, {
        metadata: { contentType: "image/png" },
      });

      await bucket.file(thumbnailPath).makePublic();
      const thumbnailUrl = `https://storage.googleapis.com/${bucket.name}/${thumbnailPath}`;

      const storageFileName = filePath.split("/").pop();
      const proofsQuery = await db.collection("proofs")
        .where("fileName", "==", storageFileName)
        .limit(1)
        .get();

      if (!proofsQuery.empty) {
        await proofsQuery.docs[0].ref.update({ thumbnailUrl });
        console.log("✅ Proof doc updated with thumbnailUrl:", proofsQuery.docs[0].id);
      } else {
        console.log("⚠️ No proof found with fileName:", storageFileName);
      }

    } catch (error) {
      console.error("❌ Error generating thumbnail:", error);
    }
  }
);

// =============================================================================
// HEALTH CHECK
// =============================================================================

exports.healthCheck = onRequest(async (req, res) => {
  res.json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    functions: [
      'sendClientInvitation',
      'sendProofNotification',
      'transferProofOwnership',
      'deleteUserCompletely',
      'createStaffUser',
      'handleNewProof',
      'handleProofStatusChange',
      'sendPendingProofReminders',
      'generatePdfThumbnail',
      'healthCheck'
    ]
  });
});