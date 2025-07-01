// src/components/AuthDebugger.jsx - TEMPORARY DEBUG COMPONENT
import React from 'react';
import { useAuth } from '../contexts/AuthContext';

export default function AuthDebugger() {
  const { 
    currentUser, 
    userProfile, 
    loading, 
    firestoreError, 
    isPrivateBrowsing 
  } = useAuth();

  // Only show in development
  if (process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed top-4 left-4 bg-black/80 text-white p-3 rounded text-xs font-mono z-50 max-w-xs">
      <div className="font-bold mb-2">Auth Debug Status:</div>
      <div>Loading: {loading ? '✅' : '❌'}</div>
      <div>Current User: {currentUser ? '✅' : '❌'}</div>
      <div>User Profile: {userProfile ? '✅' : '❌'}</div>
      <div>Firestore Error: {firestoreError ? '⚠️' : '✅'}</div>
      <div>Private Browsing: {isPrivateBrowsing ? '✅' : '❌'}</div>
      
      {currentUser && (
        <>
          <div className="mt-2 pt-2 border-t border-gray-500">
            <div>Email: {currentUser.email}</div>
            <div>UID: {currentUser.uid.slice(0, 8)}...</div>
          </div>
        </>
      )}
      
      {userProfile && (
        <>
          <div className="mt-2 pt-2 border-t border-gray-500">
            <div>Role: {userProfile.role}</div>
            <div>Name: {userProfile.displayName}</div>
            <div>Active: {userProfile.isActive ? '✅' : '❌'}</div>
          </div>
        </>
      )}
      
      <div className="mt-2 pt-2 border-t border-gray-500 text-xs">
        Path: {window.location.pathname}
      </div>
    </div>
  );
}