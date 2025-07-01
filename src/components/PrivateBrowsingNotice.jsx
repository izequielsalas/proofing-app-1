// src/components/PrivateBrowsingNotice.jsx
import React, { useState } from 'react';
import { AlertTriangle, RefreshCw, X } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export default function PrivateBrowsingNotice() {
  const { isPrivateBrowsing, firestoreError, refreshUserProfile } = useAuth();
  const [dismissed, setDismissed] = useState(false);

  if (!isPrivateBrowsing && !firestoreError) return null;
  if (dismissed) return null;

  return (
    <div className="fixed top-4 right-4 max-w-sm bg-yellow-50 border border-yellow-200 rounded-lg shadow-lg p-4 z-50">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-yellow-600 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-yellow-800">
            {isPrivateBrowsing ? 'Private Browsing Mode' : 'Connection Issue'}
          </h3>
          <p className="text-xs text-yellow-700 mt-1">
            {isPrivateBrowsing 
              ? 'Some features may be limited due to storage restrictions. User roles may not update in real-time.'
              : 'Having trouble connecting to the database. Some features may not work properly.'
            }
          </p>
          
          {firestoreError && (
            <button
              onClick={() => {
                refreshUserProfile();
              }}
              className="inline-flex items-center gap-1 mt-2 px-2 py-1 text-xs bg-yellow-100 hover:bg-yellow-200 text-yellow-800 rounded border border-yellow-300 transition-colors"
            >
              <RefreshCw className="w-3 h-3" />
              Retry Connection
            </button>
          )}
        </div>
        
        <button
          onClick={() => setDismissed(true)}
          className="text-yellow-600 hover:text-yellow-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}