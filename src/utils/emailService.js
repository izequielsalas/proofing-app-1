// Email Service Functions
// src/utils/emailService.js

import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// ✨ Updated function to send smart invitation email
export const sendInvitationEmail = async (clientEmail, clientName, inviterEmail) => {
  try {
    const sendInvite = httpsCallable(functions, 'sendClientInvitation');
    const result = await sendInvite({
      clientEmail,
      clientName,
      inviterEmail,
      inviteUrl: `${window.location.origin}/accept-invitation?email=${encodeURIComponent(clientEmail)}`
    });
    
    // Enhanced logging for smart invitation results
    console.log('Smart invitation sent:', result.data);
    
    if (result.data.proofCount > 0) {
      console.log(`📊 Invitation included ${result.data.proofCount} pending proof(s) - no separate notifications needed`);
    } else {
      console.log('📧 Standard invitation sent - no pending proofs found');
    }
    
    return result.data;
  } catch (error) {
    console.error('Error sending smart invitation:', error);
    throw error;
  }
};

// Function to send proof ready notification (for active clients only)
// Note: This is now primarily used for manual notifications since 
// automatic notifications are handled by the smart invitation system
export const sendProofReadyEmail = async (clientEmail, clientName, projectTitle) => {
  try {
    const sendNotification = httpsCallable(functions, 'sendProofNotification');
    const result = await sendNotification({
      clientEmail,
      clientName,
      projectTitle,
      loginUrl: `${window.location.origin}/auth`
    });
    
    console.log('Proof notification sent:', result.data);
    return result.data;
  } catch (error) {
    console.error('Error sending proof notification:', error);
    throw error;
  }
};

// ✨ New helper function to check if a client should receive immediate proof notifications
export const shouldSendProofNotification = async (clientId) => {
  try {
    // This could be called from the frontend before manual proof notifications
    const checkStatus = httpsCallable(functions, 'checkClientStatus');
    const result = await checkStatus({ clientId });
    
    return result.data.status === 'active';
  } catch (error) {
    console.error('Error checking client status:', error);
    return false; // Default to not sending if we can't determine status
  }
};

// ✨ New function to get invitation preview (for UI feedback)
export const getInvitationPreview = (clientEmail, clientName, proofCount = 0) => {
  return {
    subject: proofCount > 0 
      ? `🎨 Welcome to Cesar Graphics - ${proofCount} Proof${proofCount > 1 ? 's' : ''} Ready!`
      : '🎨 You\'re invited to Cesar Graphics Proofing Portal',
    hasProofs: proofCount > 0,
    proofCount: proofCount,
    previewText: proofCount > 0 
      ? `${clientName} will receive a welcome email with ${proofCount} proof${proofCount > 1 ? 's' : ''} ready for review.`
      : `${clientName} will receive a standard invitation to join the proofing portal.`
  };
};