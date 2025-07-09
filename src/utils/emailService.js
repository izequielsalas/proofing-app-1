// Email Service Functions
// src/utils/emailService.js

import { getFunctions, httpsCallable } from 'firebase/functions';

const functions = getFunctions();

// Function to send invitation email
export const sendInvitationEmail = async (clientEmail, clientName, inviterEmail) => {
  try {
    const sendInvite = httpsCallable(functions, 'sendClientInvitation');
    const result = await sendInvite({
      clientEmail,
      clientName,
      inviterEmail,
      inviteUrl: `${window.location.origin}/accept-invitation?email=${encodeURIComponent(clientEmail)}`
    });
    
    console.log('Invitation sent:', result.data);
    return result.data;
  } catch (error) {
    console.error('Error sending invitation:', error);
    throw error;
  }
};

// Function to send proof ready notification
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