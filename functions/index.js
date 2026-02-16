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
// UPDATED: Smart Invitation Template with Cesar Graphics Branding
// ✨ FIXED: Smart Invitation Template with Proper HTML Structure
// ✨ CORRECTED: Smart Invitation Template with True Brand Colors
// ✨ UPDATED: Smart Invitation Template with Navy Gradients
const getSmartInvitationTemplate = (data) => {
  const { clientName, inviterEmail, inviteUrl, hasPendingProofs, proofCount, proofs, totalProofs } = data;
  
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>Welcome to Cesar Graphics</title>
    <!--[if mso]>
    <noscript>
        <xml>
            <o:OfficeDocumentSettings>
                <o:AllowPNG/>
                <o:PixelsPerInch>96</o:PixelsPerInch>
            </o:OfficeDocumentSettings>
        </xml>
    </noscript>
    <![endif]-->
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { box-sizing: border-box; }
        
        body {
            margin: 0 !important;
            padding: 0 !important;
            background: linear-gradient(135deg, #002856 0%, #003d73 100%) !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        
        table {
            border-collapse: collapse;
            mso-table-lspace: 0pt;
            mso-table-rspace: 0pt;
        }
        
        img {
            border: 0;
            height: auto;
            line-height: 100%;
            outline: none;
            text-decoration: none;
            -ms-interpolation-mode: bicubic;
        }
        
        .cesar-container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 40, 86, 0.25);
        }
        
        .cesar-header {
            background: linear-gradient(135deg, #002856 0%, #003d73 100%);
            padding: 40px 40px 60px 40px;
            text-align: center;
            position: relative;
        }
        
        .cesar-brand-stripe {
            height: 4px;
            background: linear-gradient(90deg, #002856 0%, #00A7E1 50%, #BBBBBB 100%);
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
        }
        
        .cesar-logo {
            color: #ffffff;
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
        }
        
        .cesar-tagline {
            color: #ffffff;
            opacity: 0.9;
            font-size: 18px;
            margin: 0;
            font-weight: 400;
        }
        
        .cesar-content {
            padding: 40px;
            background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
        }
        
        .cesar-greeting {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .cesar-greeting h2 {
            color: #002856;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 16px 0;
        }
        
        .cesar-greeting p {
            color: #333333;
            font-size: 16px;
            line-height: 1.6;
            margin: 0;
        }
        
        .cesar-proofs-section {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid #e9ecef;
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
        }
        
        .cesar-proofs-title {
            color: #002856;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 16px 0;
            text-align: center;
        }
        
        .cesar-proof-item {
            background: linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%);
            border-radius: 8px;
            padding: 16px;
            margin-bottom: 12px;
            border-left: 4px solid #BBBBBB;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
        }
        
        .cesar-proof-title {
            font-weight: 600;
            color: #002856;
            margin-bottom: 4px;
        }
        
        .cesar-proof-date {
            color: #666666;
            font-size: 14px;
        }
        
        .cesar-cta {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .cesar-button {
            display: inline-block;
            background: linear-gradient(135deg, #002856 0%, #003d73 100%);
            color: #ffffff !important;
            padding: 16px 32px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            box-shadow: 0 6px 16px rgba(0, 40, 86, 0.3);
            transition: all 0.3s ease;
        }
        
        .cesar-button:hover {
            background: linear-gradient(135deg, #003d73 0%, #004a8a 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 40, 86, 0.4);
        }
        
        .cesar-features {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
        }
        
        .cesar-features h3 {
            color: #002856;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 20px 0;
            text-align: center;
        }
        
        .cesar-features-grid {
            display: table;
            width: 100%;
        }
        
        .cesar-feature-row {
            display: table-row;
        }
        
        .cesar-feature-item {
            display: table-cell;
            text-align: center;
            padding: 0 8px;
            vertical-align: top;
            width: 50%;
        }
        
        .cesar-feature-icon {
            background: linear-gradient(135deg, #00A7E1 0%, #0088c7 100%);
            color: white;
            width: 40px;
            height: 40px;
            border-radius: 50%;
            display: inline-flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 8px;
            font-size: 20px;
            box-shadow: 0 4px 8px rgba(0, 167, 225, 0.3);
        }
        
        .cesar-feature-icon.grey {
            background: linear-gradient(135deg, #BBBBBB 0%, #999999 100%);
            box-shadow: 0 4px 8px rgba(187, 187, 187, 0.3);
        }
        
        .cesar-feature-title {
            font-weight: 600;
            color: #002856;
            margin-bottom: 4px;
        }
        
        .cesar-feature-desc {
            color: #666666;
            font-size: 14px;
        }
        
        .cesar-support {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
        }
        
        .cesar-footer {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .cesar-footer p {
            color: #666666;
            font-size: 12px;
            margin: 0;
        }
        
        /* Mobile Styles */
        @media screen and (max-width: 600px) {
            .cesar-container {
                margin: 10px;
                border-radius: 8px;
            }
            
            .cesar-header {
                padding: 30px 20px 40px 20px;
            }
            
            .cesar-content {
                padding: 30px 20px;
            }
            
            .cesar-logo {
                font-size: 28px;
            }
            
            .cesar-features-grid {
                display: block;
            }
            
            .cesar-feature-item {
                display: block;
                margin-bottom: 20px;
                width: 100%;
            }
        }
    </style>
</head>
<body>
    <div style="min-height: 100vh; padding: 40px 20px; background: linear-gradient(135deg, #002856 0%, #003d73 100%);">
        <div class="cesar-container">
            <!-- Header -->
            <div class="cesar-header">
                <div class="cesar-brand-stripe"></div>
                <h1 class="cesar-logo">CESAR GRAPHICS</h1>
                <p class="cesar-tagline">${hasPendingProofs ? 'Welcome & Proofs Ready!' : 'Proofing Portal Invitation'}</p>
            </div>

            <!-- Content -->
            <div class="cesar-content">
                <div class="cesar-greeting">
                    <h2>Hi ${clientName}! ${hasPendingProofs ? '🎨' : '👋'}</h2>
                    <p>${hasPendingProofs 
                      ? `Welcome to our professional proofing portal! You have <strong>${proofCount} proof${proofCount > 1 ? 's' : ''}</strong> ready for your review.`
                      : `You've been invited by <strong>${inviterEmail}</strong> to access our professional proofing portal.`
                    }</p>
                </div>

                ${hasPendingProofs ? `
                <!-- Pending Proofs Section -->
                <div class="cesar-proofs-section">
                    <h3 class="cesar-proofs-title">🎯 Proofs Awaiting Your Review</h3>
                    ${proofs.slice(0, 3).map(proof => `
                        <div class="cesar-proof-item">
                            <div class="cesar-proof-title">${proof.title || 'Untitled Proof'}</div>
                            <div class="cesar-proof-date">
                                Uploaded: ${new Date(proof.createdAt.seconds * 1000).toLocaleDateString()}
                            </div>
                        </div>
                    `).join('')}
                    ${totalProofs > 3 ? `
                        <div style="text-align: center; color: #666666; font-style: italic; margin-top: 16px;">
                            And ${totalProofs - 3} more proof${totalProofs - 3 > 1 ? 's' : ''} waiting for you...
                        </div>
                    ` : ''}
                </div>
                ` : ''}

                <!-- CTA Button -->
                <div class="cesar-cta">
                    <a href="${inviteUrl}" class="cesar-button">
                        ${hasPendingProofs ? '🚀 Review My Proofs' : '🎨 Access Proofing Portal'}
                    </a>
                </div>

                <!-- Features Section -->
                <div class="cesar-features">
                    <h3>What You Can Do</h3>
                    <div class="cesar-features-grid">
                        <div class="cesar-feature-row">
                            <div class="cesar-feature-item">
                                <div class="cesar-feature-icon">✓</div>
                                <div class="cesar-feature-title">Quick Approval</div>
                                <div class="cesar-feature-desc">Approve designs instantly</div>
                            </div>
                            <div class="cesar-feature-item">
                                <div class="cesar-feature-icon grey">💬</div>
                                <div class="cesar-feature-title">Easy Feedback</div>
                                <div class="cesar-feature-desc">Request changes clearly</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Support Information -->
                <div class="cesar-support">
                    <p style="color: #666666; font-size: 14px; margin: 0 0 12px 0;">
                        Need help? Just reply to this email!
                    </p>
                    <p style="color: #002856; font-size: 16px; font-weight: 600; margin: 0;">
                        Welcome to the team! 🎉
                    </p>
                    <p style="color: #666666; font-size: 14px; margin: 8px 0 0 0;">
                        <strong>The Cesar Graphics Team</strong>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="cesar-footer">
                <p>This invitation will expire in 7 days. If you need a new invitation, please contact us.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};


// OLD: Basic Invitation Email Template (kept for backwards compatibility)
// UPDATED: Basic Client Invitation Template with Cesar Graphics Branding
// ✨ CORRECTED: Basic Client Invitation Template
// ✨ UPDATED: Basic Client Invitation Template with Navy Gradients
const getClientInvitationTemplate = (clientName, inviterEmail, inviteUrl) => {
  return `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Welcome to Cesar Graphics Proofing Portal</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            background: linear-gradient(135deg, #002856 0%, #003d73 100%);
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 40, 86, 0.25);
        }
        
        .header {
            background: linear-gradient(135deg, #002856 0%, #003d73 100%);
            padding: 40px 40px 60px 40px;
            text-align: center;
            position: relative;
        }
        
        .brand-stripe {
            height: 4px;
            background: linear-gradient(90deg, #002856 0%, #00A7E1 50%, #BBBBBB 100%);
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
        }
        
        .logo {
            color: #ffffff;
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
        }
        
        .tagline {
            color: #ffffff;
            opacity: 0.9;
            font-size: 18px;
            margin: 0;
            font-weight: 400;
        }
        
        .content {
            padding: 40px;
            background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
        }
        
        .greeting h2 {
            color: #002856;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 16px 0;
            text-align: center;
        }
        
        .greeting p {
            color: #333333;
            font-size: 16px;
            line-height: 1.6;
            margin: 0 0 32px 0;
            text-align: center;
        }
        
        .cta {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .button {
            display: inline-block;
            background: linear-gradient(135deg, #002856 0%, #003d73 100%);
            color: #ffffff !important;
            padding: 18px 36px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 18px;
            box-shadow: 0 6px 16px rgba(0, 40, 86, 0.4);
            transition: all 0.3s ease;
        }
        
        .button:hover {
            background: linear-gradient(135deg, #003d73 0%, #004a8a 100%);
            transform: translateY(-2px);
            box-shadow: 0 8px 20px rgba(0, 40, 86, 0.5);
        }
        
        .features {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 30px;
            margin-bottom: 32px;
        }
        
        .features h3 {
            color: #002856;
            font-size: 18px;
            font-weight: 600;
            margin: 0 0 24px 0;
            text-align: center;
        }
        
        .features-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 24px;
        }
        
        .feature-item {
            text-align: center;
        }
        
        .feature-icon {
            width: 50px;
            height: 50px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 12px;
            font-size: 24px;
            color: white;
        }
        
        .feature-icon.blue { 
            background: linear-gradient(135deg, #00A7E1 0%, #0088c7 100%); 
            box-shadow: 0 4px 8px rgba(0, 167, 225, 0.3); 
        }
        .feature-icon.grey { 
            background: linear-gradient(135deg, #BBBBBB 0%, #999999 100%); 
            box-shadow: 0 4px 8px rgba(187, 187, 187, 0.3); 
        }
        .feature-icon.navy { 
            background: linear-gradient(135deg, #002856 0%, #003d73 100%); 
            box-shadow: 0 4px 8px rgba(0, 40, 86, 0.3); 
        }
        .feature-icon.teal { 
            background: linear-gradient(135deg, #00A7E1 0%, #0088c7 100%); 
            box-shadow: 0 4px 8px rgba(0, 167, 225, 0.3); 
        }
        
        .feature-title {
            font-weight: 600;
            color: #002856;
            margin-bottom: 6px;
        }
        
        .feature-desc {
            color: #666666;
            font-size: 14px;
        }
        
        .support {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
        }
        
        .footer {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer p {
            color: #666666;
            font-size: 12px;
            margin: 0;
        }
        
        @media screen and (max-width: 600px) {
            .features-grid {
                grid-template-columns: 1fr;
                gap: 20px;
            }
        }
    </style>
</head>
<body>
    <div style="min-height: 100vh; padding: 40px 20px; background: linear-gradient(135deg, #002856 0%, #003d73 100%);">
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="brand-stripe"></div>
                <h1 class="logo">CESAR GRAPHICS</h1>
                <p class="tagline">Proofing Portal Invitation</p>
            </div>

            <!-- Content -->
            <div class="content">
                <div class="greeting">
                    <h2>Hi ${clientName}! 👋</h2>
                    <p>You've been invited by <strong>${inviterEmail}</strong> to access our professional proofing portal.
                    Review designs, provide feedback, and approve projects all in one place.</p>
                </div>

                <!-- CTA Button -->
                <div class="cta">
                    <a href="${inviteUrl}" class="button">
                        🚀 Get Started Now
                    </a>
                </div>

                <!-- Features Grid -->
                <div class="features">
                    <h3>What You'll Love About Our Portal</h3>
                    <div class="features-grid">
                        <div class="feature-item">
                            <div class="feature-icon blue">⚡</div>
                            <div class="feature-title">Lightning Fast</div>
                            <div class="feature-desc">Approve designs in seconds</div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon grey">💬</div>
                            <div class="feature-title">Easy Communication</div>
                            <div class="feature-desc">Clear feedback tools</div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon teal">📱</div>
                            <div class="feature-title">Mobile Friendly</div>
                            <div class="feature-desc">Works on any device</div>
                        </div>
                        <div class="feature-item">
                            <div class="feature-icon navy">🔒</div>
                            <div class="feature-title">Secure & Private</div>
                            <div class="feature-desc">Your projects stay confidential</div>
                        </div>
                    </div>
                </div>

                <!-- Support Information -->
                <div class="support">
                    <p style="color: #666666; font-size: 14px; margin: 0 0 12px 0;">
                        Need help getting started? We're here for you!
                    </p>
                    <p style="color: #002856; font-size: 16px; font-weight: 600; margin: 0;">
                        Welcome to the Cesar Graphics family! 🎉
                    </p>
                    <p style="color: #666666; font-size: 14px; margin: 8px 0 0 0;">
                        <strong>The Cesar Graphics Team</strong>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>This invitation will expire in 7 days. Questions? Just reply to this email.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};


// MODERN CLIENT EMAIL TEMPLATE - Sleek & Professional (EXISTING)
// UPDATED: Client Notification Template with Cesar Graphics Branding
// ✨ FIXED: Client Notification Template
// ✨ CORRECTED: Client Notification Template
// ✨ UPDATED: Client Notification Template with Navy Gradients
const getClientNotificationTemplate = (data) => {
  return `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <meta http-equiv="X-UA-Compatible" content="IE=edge">
    <meta name="x-apple-disable-message-reformatting">
    <title>New Proof Ready - Cesar Graphics</title>
    <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        
        * { box-sizing: border-box; }
        
        body {
            margin: 0 !important;
            padding: 0 !important;
            background: linear-gradient(135deg, #002856 0%, #003d73 100%) !important;
            font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
            -webkit-text-size-adjust: 100%;
            -ms-text-size-adjust: 100%;
        }
        
        .container {
            max-width: 600px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 16px;
            overflow: hidden;
            box-shadow: 0 20px 40px rgba(0, 40, 86, 0.25);
        }
        
        .header {
            background: linear-gradient(135deg, #002856 0%, #003d73 100%);
            padding: 40px 40px 60px 40px;
            text-align: center;
            position: relative;
        }
        
        .brand-stripe {
            height: 4px;
            background: linear-gradient(90deg, #002856 0%, #00A7E1 50%, #BBBBBB 100%);
            position: absolute;
            top: 0;
            left: 0;
            right: 0;
        }
        
        .logo {
            color: #ffffff;
            font-size: 32px;
            font-weight: 700;
            margin: 0 0 8px 0;
            letter-spacing: -0.5px;
        }
        
        .tagline {
            color: #ffffff;
            opacity: 0.9;
            font-size: 18px;
            margin: 0;
            font-weight: 400;
        }
        
        .content {
            padding: 40px;
            background: linear-gradient(to bottom, #ffffff 0%, #f8f9fa 100%);
        }
        
        .greeting {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .greeting h2 {
            color: #002856;
            font-size: 24px;
            font-weight: 600;
            margin: 0 0 16px 0;
        }
        
        .greeting p {
            color: #333333;
            font-size: 16px;
            line-height: 1.6;
            margin: 0;
        }
        
        .proof-card {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border: 2px solid #e9ecef;
            border-radius: 16px;
            padding: 32px;
            text-align: center;
            margin-bottom: 32px;
        }
        
        .proof-icon {
            background: linear-gradient(135deg, #002856 0%, #003d73 100%);
            color: white;
            width: 80px;
            height: 80px;
            border-radius: 50%;
            display: flex;
            align-items: center;
            justify-content: center;
            margin: 0 auto 20px;
            font-size: 36px;
            box-shadow: 0 8px 16px rgba(0, 40, 86, 0.3);
        }
        
        .proof-title {
            color: #002856;
            font-size: 20px;
            font-weight: 600;
            margin: 0 0 12px 0;
        }
        
        .proof-desc {
            color: #666666;
            font-size: 16px;
            margin: 0;
        }
        
        .actions {
            text-align: center;
            margin-bottom: 32px;
        }
        
        .button {
            display: inline-block;
            padding: 16px 32px;
            border-radius: 12px;
            text-decoration: none;
            font-weight: 600;
            font-size: 16px;
            margin: 0 8px 12px 8px;
            color: #ffffff !important;
            transition: all 0.3s ease;
        }
        
        .button-approve {
            background: linear-gradient(135deg, #00A7E1 0%, #0088c7 100%);
            box-shadow: 0 4px 12px rgba(0, 167, 225, 0.3);
        }
        
        .button-approve:hover {
            background: linear-gradient(135deg, #0088c7 0%, #006da3 100%);
            transform: translateY(-1px);
        }
        
        .button-review {
            background: linear-gradient(135deg, #002856 0%, #003d73 100%);
            box-shadow: 0 4px 12px rgba(0, 40, 86, 0.3);
        }
        
        .button-review:hover {
            background: linear-gradient(135deg, #003d73 0%, #004a8a 100%);
            transform: translateY(-1px);
        }
        
        .features {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 24px;
            margin-bottom: 32px;
        }
        
        .features-grid {
            display: table;
            width: 100%;
        }
        
        .feature-row {
            display: table-row;
        }
        
        .feature-item {
            display: table-cell;
            text-align: center;
            padding: 0 10px;
            vertical-align: top;
            width: 50%;
        }
        
        .feature-icon {
            font-size: 24px;
            margin-bottom: 8px;
        }
        
        .feature-icon.blue { color: #00A7E1; }
        .feature-icon.grey { color: #BBBBBB; }
        
        .feature-title {
            font-weight: 600;
            color: #002856;
            margin-bottom: 4px;
        }
        
        .feature-desc {
            color: #666666;
            font-size: 14px;
        }
        
        .support {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            border-radius: 12px;
            padding: 24px;
            text-align: center;
        }
        
        .footer {
            background: linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%);
            padding: 20px;
            text-align: center;
            border-top: 1px solid #e9ecef;
        }
        
        .footer p {
            color: #666666;
            font-size: 12px;
            margin: 0;
        }
    </style>
</head>
<body>
    <div style="min-height: 100vh; padding: 40px 20px; background: linear-gradient(135deg, #002856 0%, #003d73 100%);">
        <div class="container">
            <!-- Header -->
            <div class="header">
                <div class="brand-stripe"></div>
                <h1 class="logo">CESAR GRAPHICS</h1>
                <p class="tagline">Proof Ready for Review</p>
            </div>

            <!-- Content -->
            <div class="content">
                <div class="greeting">
                    <h2>Hi ${data.clientName}! 🎨</h2>
                    <p>Your proof for <strong>"${data.title}"</strong> is ready for review!</p>
                </div>

                <!-- Proof Preview Card -->
                <div class="proof-card">
                    <div class="proof-icon">🎯</div>
                    <h3 class="proof-title">"${data.title}"</h3>
                    <p class="proof-desc">Your design is ready for approval or feedback</p>
                </div>

                <!-- Action Buttons -->
                <div class="actions">
                    <a href="${data.loginUrl || 'https://proofingapp1.web.app/auth'}" class="button button-review">👁️ View & Review</a>
                </div>

                <!-- Features -->
                <div class="features">
                    <div class="features-grid">
                        <div class="feature-row">
                            <div class="feature-item">
                                <div class="feature-icon blue">⚡</div>
                                <div class="feature-title">Fast Review</div>
                                <div class="feature-desc">One-click approval process</div>
                            </div>
                            <div class="feature-item">
                                <div class="feature-icon grey">💬</div>
                                <div class="feature-title">Clear Feedback</div>
                                <div class="feature-desc">Request specific changes</div>
                            </div>
                        </div>
                    </div>
                </div>

                <!-- Support -->
                <div class="support">
                    <p style="color: #666666; font-size: 14px; margin: 0 0 12px 0;">
                        Questions about your proof? Just reply to this email!
                    </p>
                    <p style="color: #002856; font-size: 16px; font-weight: 600; margin: 0;">
                        Thanks for choosing Cesar Graphics! 🙏
                    </p>
                    <p style="color: #666666; font-size: 14px; margin: 8px 0 0 0;">
                        <strong>Your Design Team</strong>
                    </p>
                </div>
            </div>

            <!-- Footer -->
            <div class="footer">
                <p>You're receiving this because you have an active project with Cesar Graphics.</p>
            </div>
        </div>
    </div>
</body>
</html>`;
};

// ✨ ENHANCED: Resend Email Function with Better Configuration
const sendEmailWithResend = async (resend, emailData) => {
  try {
    // Enhanced email data with proper headers for HTML rendering
    const enhancedEmailData = {
      ...emailData,
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      },
      // Add text fallback for better delivery
      text: `
Hi ${emailData.clientName || 'there'}!

${emailData.subject.includes('Welcome') ? 
  'Welcome to Cesar Graphics! You\'ve been invited to our proofing portal.' :
  'Your proof is ready for review!'
}

Please visit: ${emailData.inviteUrl || 'your account'}

If you need help, just reply to this email.

Best regards,
The Cesar Graphics Team
      `.trim()
    };

    const result = await resend.emails.send(enhancedEmailData);
    return result;
  } catch (error) {
    console.error('Resend delivery failed:', error);
    throw error;
  }
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
      html: getSmartInvitationTemplate(templateData),
      // ADD THESE LINES FOR BETTER HTML SUPPORT:
      headers: {
        'X-Priority': '1',
        'X-MSMail-Priority': 'High',
        'Importance': 'high'
      },
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
      html: getClientNotificationTemplate({ ...templateData, loginUrl: FRONTEND_URL + '/auth' })
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
exports.handleNewProof = onDocumentCreated({
  document: 'proofs/{proofId}',
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
    
    // Check client status before sending proof notification
    let clientDoc = await db.collection('users').doc(proof.clientId).get();
    
    // If not found in users, check invitations collection (pre-signup clients)
    if (!clientDoc.exists) {
      const invDoc = await db.collection('invitations').doc(proof.clientId).get();
      if (invDoc.exists) {
        clientDoc = invDoc;
        console.log('📨 Client found in invitations collection (pending signup)');
      } else {
        console.log('⚠️ Client document not found in users or invitations, skipping client notification');
      }
    }

    // Send client notification based on status
    if (clientDoc.exists) {
      const clientData = clientDoc.data();
      console.log(`📋 Client status: ${clientData.status} for ${clientData.email}`);

      if (clientData.status === 'active') {
        // Active client — send proof notification
        const emailData = {
          from: FROM_EMAIL,
          to: proof.clientEmail,
          subject: `🎨 New Proof Ready: ${proof.title}`,
          html: getClientNotificationTemplate({ ...proof, loginUrl: FRONTEND_URL + '/auth' })
        };

        try {
          const result = await resend.emails.send(emailData);
          console.log('✅ Client notification sent via Resend:', result.data?.id);
          
          await event.data.ref.update({
            emailSent: true,
            emailSentAt: new Date(),
            emailProvider: 'resend',
            resendId: result.data?.id
          });
        } catch (resendError) {
          console.error('❌ Resend failed:', resendError);
        }

      } else if (clientData.status === 'invited' || clientData.status === 'pending') {
        // Invited/pending client — proof info is included in invitation email
        console.log('🎯 Client is invited/pending - proof notification included in invitation email');
        
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
        ${clientDoc.exists && (clientDoc.data().status === 'invited' || clientDoc.data().status === 'pending') ? 
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
exports.handleProofStatusChange = onDocumentUpdated({
  document: 'proofs/{proofId}',
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