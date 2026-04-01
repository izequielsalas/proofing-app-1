// src/components/uploadProof.jsx - UPDATED: Revision mode support + invitations collection
import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, updateDoc, doc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { sendInvitationEmail, sendProofReadyEmail } from '../utils/emailService';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadProof({ onUploadComplete, revisionMode = false, parentProof = null }) {
  const [files, setFiles] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clients, setClients] = useState([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [invitingClient, setInvitingClient] = useState(false);
  const [debugLog, setDebugLog] = useState([]);
  const fileInputRef = useRef();
  
  const { userProfile, isAdmin, isDesigner, canAssignProofs } = useAuth();

  const addDebugLog = (message, type = 'info') => {
    const timestamp = new Date().toLocaleTimeString();
    const logEntry = `[${timestamp}] ${message}`;
    console.log('🔍 UPLOAD DEBUG:', logEntry);
    setDebugLog(prev => [...prev, { message: logEntry, type }]);
  };

  // Pre-fill title from parent proof in revision mode
  useEffect(() => {
    if (revisionMode && parentProof) {
      setProjectTitle(parentProof.title || '');
      addDebugLog(`🔄 Revision mode active — chain: ${parentProof.revisionChainId || parentProof.id}`);
    }
  }, [revisionMode, parentProof]);

  // ⭐ Fetch clients from BOTH users and invitations collections (only in normal mode)
  useEffect(() => {
    if (!revisionMode && canAssignProofs()) {
      const fetchClients = async () => {
        try {
          addDebugLog('Fetching client list from users + invitations...');

          // Fetch active users (already signed up)
          const usersQuery = query(
            collection(db, 'users'),
            where('role', '==', 'client')
          );
          const usersSnapshot = await getDocs(usersQuery);
          const activeClients = usersSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data()
          }));

          // Fetch pending invitations (not yet signed up)
          const invitationsQuery = query(
            collection(db, 'invitations'),
            where('status', '==', 'pending')
          );
          const invitationsSnapshot = await getDocs(invitationsQuery);
          const pendingClients = invitationsSnapshot.docs.map(doc => ({
            id: doc.id,
            ...doc.data(),
            status: 'invited',
            _isInvitation: true
          }));

          // Combine and deduplicate by email
          const allClients = [...activeClients];
          pendingClients.forEach(inv => {
            const alreadyActive = activeClients.find(
              c => c.email?.toLowerCase() === inv.email?.toLowerCase()
            );
            if (!alreadyActive) {
              allClients.push(inv);
            }
          });

          setClients(allClients);
          addDebugLog(`Found ${activeClients.length} active + ${pendingClients.length} pending = ${allClients.length} total clients`);
        } catch (error) {
          console.error('Error fetching clients:', error);
          addDebugLog(`Error fetching clients: ${error.message}`, 'error');
        }
      };
      fetchClients();
    }
  }, [revisionMode, canAssignProofs]);

  // ⭐ Invite to 'invitations' collection instead of 'users'
  const handleInviteClient = async () => {
    if (!clientEmail.trim() || !clientName.trim()) {
      alert('Please enter both client name and email');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(clientEmail)) {
      alert('Please enter a valid email');
      return;
    }

    const existingClient = clients.find(c => 
      c.email?.toLowerCase() === clientEmail.toLowerCase()
    );
    
    if (existingClient) {
      alert('A client with this email already exists');
      setSelectedClientId(existingClient.id);
      setClientEmail('');
      setClientName('');
      setShowInviteForm(false);
      return;
    }

    setInvitingClient(true);
    addDebugLog(`Starting invitation process for ${clientEmail}`);

    try {
      const invitationData = {
        email: clientEmail.trim().toLowerCase(),
        displayName: clientName.trim(),
        type: 'client_invitation',
        status: 'pending',
        invitedAt: new Date(),
        invitedBy: auth.currentUser?.uid,
        inviterEmail: auth.currentUser?.email
      };

      addDebugLog('Creating invitation in Firestore (invitations collection)...');
      const invitationRef = await addDoc(collection(db, 'invitations'), invitationData);
      addDebugLog(`✅ Invitation created with ID: ${invitationRef.id}`);
      
      addDebugLog('🔄 Sending invitation email...');
      try {
        await sendInvitationEmail(clientEmail, clientName, auth.currentUser?.email);
        addDebugLog(`✅ Invitation email sent!`);
      } catch (emailError) {
        addDebugLog(`❌ Invitation email failed: ${emailError.message}`, 'error');
      }

      const newClient = { 
        id: invitationRef.id,
        ...invitationData,
        status: 'invited',
        _isInvitation: true
      };
      setClients(prev => [...prev, newClient]);
      setSelectedClientId(invitationRef.id);
      
      setClientEmail('');
      setClientName('');
      setShowInviteForm(false);
      
      addDebugLog(`🎉 Client invitation complete for ${clientName}`);
      alert(`Invitation sent to ${clientName}!`);

    } catch (error) {
      console.error('Error inviting client:', error);
      addDebugLog(`❌ Error: ${error.message}`, 'error');
      alert('Failed to invite client. Please try again.');
    } finally {
      setInvitingClient(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleFileSelect = (e) => {
    const selectedFiles = Array.from(e.target.files);
    
    const validFiles = selectedFiles.filter(file => {
      const isValid = file.type === 'application/pdf' || file.type.startsWith('image/');
      if (!isValid) {
        alert(`${file.name} is not a valid file type. Please upload PDF or image files only.`);
      }
      return isValid;
    });

    const validSizedFiles = validFiles.filter(file => {
      const isValidSize = file.size <= 10 * 1024 * 1024;
      if (!isValidSize) {
        alert(`${file.name} is too large. Please upload files smaller than 10MB.`);
      }
      return isValidSize;
    });

    // In revision mode, only allow one file
    if (revisionMode) {
      setFiles([validSizedFiles[0]].filter(Boolean));
    } else {
      setFiles(prev => [...prev, ...validSizedFiles]);
    }
  };

  const uploadFiles = async () => {
    if (files.length === 0) return alert('Please select at least one file');
    if (!projectTitle.trim()) return alert('Please enter a project title');
    
    if (!revisionMode && canAssignProofs() && !selectedClientId) {
      return alert('Please select a client or invite a new one');
    }

    setUploading(true);
    setDebugLog([]);
    addDebugLog(revisionMode ? '🔄 Starting revision upload...' : '🚀 Starting proof upload process...');
    
    const user = auth.currentUser;

    try {
      const selectedClient = revisionMode
        ? null
        : clients.find(c => c.id === selectedClientId);

      if (!revisionMode) {
        addDebugLog(`Selected client: ${selectedClient?.displayName} (${selectedClient?.email})`);
        addDebugLog(`Client status: ${selectedClient?.status}${selectedClient?._isInvitation ? ' [from invitations collection]' : ''}`);
      }

      // ── Revision chain setup ──
      let chainId = null;
      let nextRevisionNumber = 1;

      if (revisionMode && parentProof) {
        chainId = parentProof.revisionChainId || parentProof.id;

        // Query the full chain to get the actual max revision number
        const chainSnapshot = await getDocs(
          query(collection(db, 'proofs'), where('revisionChainId', '==', chainId))
        );
        const maxRevision = chainSnapshot.docs.reduce((max, d) => {
          return Math.max(max, d.data().revisionNumber || 1);
        }, 1);
        nextRevisionNumber = maxRevision + 1;
        addDebugLog(`📎 Chain: ${chainId} | Next version: v${nextRevisionNumber}`);
      }

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        addDebugLog(`📁 Uploading file ${i + 1}/${files.length}: ${file.name}`);
        
        setUploadProgress(prev => ({
          ...prev,
          [i]: { status: 'uploading', progress: 0 }
        }));
        
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const fileRef = ref(storage, `proofFiles/${fileName}`);
        
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);
        addDebugLog(`✅ File uploaded to storage: ${fileName}`);

        const proofData = revisionMode ? {
          // ── Revision proof — inherits all client info from parent ──
          title: parentProof.title,
          clientName: parentProof.clientName,
          clientId: parentProof.clientId,
          clientEmail: parentProof.clientEmail,
          clientStatus: parentProof.clientStatus || 'active',
          fileUrl: downloadURL,
          fileName: file.name,
          fileType: file.type === 'application/pdf' ? 'pdf' : 'image',
          fileSize: file.size,
          status: 'pending',
          notes: notes.trim(),
          uploadedBy: user?.uid,
          uploaderEmail: user?.email,
          createdAt: serverTimestamp(),
          assignedAt: new Date(),
          // ⭐ Revision-specific fields
          parentProofId: parentProof.id,
          revisionChainId: chainId,
          revisionNumber: nextRevisionNumber,
        } : {
          // ── New proof ──
          title: projectTitle.trim(),
          clientName: selectedClient?.displayName || selectedClient?.email,
          clientId: selectedClientId,
          clientEmail: selectedClient?.email,
          clientStatus: selectedClient?.status || 'active',
          fileUrl: downloadURL,
          fileName: file.name,
          fileType: file.type === 'application/pdf' ? 'pdf' : 'image',
          fileSize: file.size,
          status: 'pending',
          notes: notes.trim(),
          uploadedBy: user?.uid,
          uploaderEmail: user?.email,
          createdAt: serverTimestamp(),
          assignedAt: new Date(),
          // ⭐ Original proof fields (revisionChainId set after addDoc)
          parentProofId: null,
          revisionNumber: 1,
        };

        addDebugLog(`📝 Creating proof document in Firestore...`);
        const docRef = await addDoc(collection(db, 'proofs'), proofData);

        // For new proofs, set revisionChainId = its own doc ID
        if (!revisionMode) {
          await updateDoc(doc(db, 'proofs', docRef.id), { revisionChainId: docRef.id });
          addDebugLog(`✅ New proof created — chain ID: ${docRef.id}`);
        } else {
          addDebugLog(`✅ Revision v${nextRevisionNumber} created — doc ID: ${docRef.id}`);
        }

        setUploadProgress(prev => ({
          ...prev,
          [i]: { status: 'complete', progress: 100 }
        }));
      }

      // Email notifications (only for new proofs, not revisions)
      if (!revisionMode) {
        if (selectedClient?.status === 'invited' || selectedClient?._isInvitation) {
          addDebugLog('🔄 Client is invited - sending proof ready notification...');
          try {
            await sendProofReadyEmail(
              selectedClient.email, 
              selectedClient.displayName, 
              projectTitle
            );
            addDebugLog(`✅ Proof ready notification sent!`);
          } catch (emailError) {
            addDebugLog(`❌ Proof ready notification failed: ${emailError.message}`, 'error');
            console.error('Proof ready notification error:', emailError);
          }
        } else {
          addDebugLog('ℹ️ Client is active - automatic notification will be sent by Firebase Function');
        }
      }

      // Reset form
      setFiles([]);
      setProjectTitle('');
      setSelectedClientId('');
      setNotes('');
      setUploadProgress({});
      if (fileInputRef.current) fileInputRef.current.value = '';
      
      addDebugLog('🎉 Upload completed successfully!');
      onUploadComplete?.();
      
    } catch (error) {
      console.error('Upload error:', error);
      addDebugLog(`❌ Upload failed: ${error.message}`, 'error');
      alert('Upload failed. Please try again.');
      
      files.forEach((_, i) => {
        if (!uploadProgress[i] || uploadProgress[i].status === 'uploading') {
          setUploadProgress(prev => ({
            ...prev,
            [i]: { status: 'error', progress: 0 }
          }));
        }
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Debug Panel */}
      {debugLog.length > 0 && (
        <div className="bg-gray-100 border rounded-lg p-4">
          <h3 className="font-bold text-gray-900 mb-2">🔍 Debug Log:</h3>
          <div className="text-xs font-mono space-y-1 max-h-40 overflow-y-auto">
            {debugLog.map((log, index) => (
              <div 
                key={index} 
                className={`${log.type === 'error' ? 'text-red-700' : 'text-gray-700'}`}
              >
                {log.message}
              </div>
            ))}
          </div>
        </div>
      )}

      <div className="border-b border-gray-200 pb-4">
        {revisionMode ? (
          <>
            <h3 className="text-lg font-medium text-gray-900">Upload Revision</h3>
            <p className="text-sm text-gray-600 mt-1">
              Uploading a new version for: <span className="font-medium">{parentProof?.title}</span>
            </p>
          </>
        ) : (
          <>
            <h3 className="text-lg font-medium text-gray-900">Upload New Proof</h3>
            <p className="text-sm text-gray-600 mt-1">
              Upload files for client review and approval
            </p>
          </>
        )}
      </div>

      {/* Project Title — read-only in revision mode */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Title {!revisionMode && '*'}
        </label>
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          placeholder="Enter project or job title"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy disabled:bg-gray-50 disabled:text-gray-500"
          disabled={uploading || revisionMode}
        />
        {revisionMode && (
          <p className="text-xs text-gray-500 mt-1">Title is inherited from the original proof.</p>
        )}
      </div>

      {/* Client Assignment — only shown in normal mode */}
      {!revisionMode && canAssignProofs() && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Assign to Client *
            </label>
            <button
              type="button"
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="text-sm text-cesar-navy hover:text-[#003d73] font-medium"
              disabled={uploading}
            >
              + Invite New Client
            </button>
          </div>
          
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy"
            disabled={uploading}
          >
            <option value="">Select a client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.displayName || client.email}
                {(client.status === 'invited' || client._isInvitation) && ' (Invited)'}
              </option>
            ))}
          </select>

          {showInviteForm && (
            <div className="mt-4 p-4 bg-[#E0EAF5] border border-cesar-navy/20 rounded-lg">
              <h4 className="text-sm font-medium text-cesar-navy mb-3">Invite New Client</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client name"
                  className="p-2 border border-cesar-navy/30 rounded focus:ring-2 focus:ring-cesar-navy"
                  disabled={invitingClient}
                />
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Client email"
                  className="p-2 border border-cesar-navy/30 rounded focus:ring-2 focus:ring-cesar-navy"
                  disabled={invitingClient}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleInviteClient}
                  disabled={invitingClient}
                  className="px-4 py-2 bg-cesar-navy text-white rounded hover:bg-[#003d73] disabled:opacity-50 text-sm"
                >
                  {invitingClient ? 'Sending...' : 'Send Invitation'}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowInviteForm(false);
                    setClientName('');
                    setClientEmail('');
                  }}
                  disabled={invitingClient}
                  className="px-4 py-2 bg-gray-300 text-gray-700 rounded hover:bg-gray-400 text-sm"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {revisionMode ? 'Revision Notes (Optional)' : 'Notes (Optional)'}
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder={revisionMode
            ? "Describe what changed in this revision..."
            : "Any special instructions or notes for this proof..."
          }
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy resize-none"
          disabled={uploading}
        />
      </div>

      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-cesar-navy/40 transition-colors">
        <input
          type="file"
          accept="application/pdf,image/*"
          multiple={!revisionMode}
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          {revisionMode ? 'Upload revised file' : 'Drop files here or click to browse'}
        </p>
        <p className="text-sm text-gray-600 mb-4">
          {revisionMode
            ? 'Upload one PDF or image file (replaces previous version)'
            : 'Supports PDF and image files up to 10MB each'
          }
        </p>
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-6 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          Select {revisionMode ? 'File' : 'Files'}
        </button>
      </div>

      {/* Selected Files */}
      {files.length > 0 && (
        <div className="space-y-3">
          <h4 className="font-medium text-gray-900">Selected Files ({files.length})</h4>
          <div className="space-y-2">
            {files.map((file, index) => {
              const progress = uploadProgress[index];
              return (
                <div key={index} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                  <div className="flex items-center gap-3">
                    <File className="h-5 w-5 text-gray-400" />
                    <div>
                      <p className="text-sm font-medium text-gray-900">{file.name}</p>
                      <p className="text-xs text-gray-500">
                        {formatFileSize(file.size)} • {file.type === 'application/pdf' ? 'PDF' : 'Image'}
                      </p>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    {progress?.status === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-cesar-navy"></div>
                        <span className="text-xs text-gray-600">Uploading...</span>
                      </div>
                    )}
                    {progress?.status === 'complete' && (
                      <CheckCircle className="h-5 w-5 text-cesar-green" />
                    )}
                    {progress?.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-cesar-magenta" />
                    )}
                    {!progress && !uploading && (
                      <button
                        onClick={() => removeFile(index)}
                        className="p-1 hover:bg-gray-200 rounded transition-colors"
                      >
                        <X className="h-4 w-4 text-gray-500" />
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Upload Button */}
      {files.length > 0 && (
        <div className="flex justify-end">
          <button
            onClick={uploadFiles}
            disabled={
              uploading ||
              !projectTitle.trim() ||
              (!revisionMode && canAssignProofs() && !selectedClientId)
            }
            className="px-6 py-3 bg-cesar-green hover:bg-[#66c23a] text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading
              ? 'Uploading...'
              : revisionMode
                ? 'Upload Revision'
                : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`
            }
          </button>
        </div>
      )}
    </div>
  );
}