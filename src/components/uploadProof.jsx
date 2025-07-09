// src/components/uploadProof.jsx
import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { sendInvitationEmail, sendProofReadyEmail } from '../utils/emailService'; // ⭐ ADDED IMPORT
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadProof({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState(''); // ⭐ ADDED
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clients, setClients] = useState([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
  const [showInviteForm, setShowInviteForm] = useState(false); // ⭐ ADDED
  const [invitingClient, setInvitingClient] = useState(false); // ⭐ ADDED
  const fileInputRef = useRef();
  
  const { userProfile, isAdmin, isDesigner, canAssignProofs } = useAuth();

  // Fetch client list for admins and designers
  useEffect(() => {
    if (canAssignProofs()) {
      const fetchClients = async () => {
        try {
          const q = query(collection(db, 'users'), where('role', '==', 'client'));
          const querySnapshot = await getDocs(q);
          const clientsList = [];
          querySnapshot.forEach((doc) => {
            clientsList.push({ id: doc.id, ...doc.data() });
          });
          setClients(clientsList);
        } catch (error) {
          console.error('Error fetching clients:', error);
        }
      };
      fetchClients();
    }
  }, [canAssignProofs]);

  // ⭐ NEW: Create and invite a new client
  const handleInviteClient = async () => {
    if (!clientEmail.trim() || !clientName.trim()) {
      alert('Please enter both client name and email');
      return;
    }

    // Check if client already exists
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

    try {
      // Create client record with invited status
      const clientData = {
        email: clientEmail.trim().toLowerCase(),
        displayName: clientName.trim(),
        role: 'client',
        status: 'invited',
        invitedAt: new Date(),
        invitedBy: auth.currentUser?.uid,
        inviterEmail: auth.currentUser?.email
      };

      const clientRef = await addDoc(collection(db, 'users'), clientData);
      
      // Send invitation email
      await sendInvitationEmail(clientEmail, clientName, auth.currentUser?.email);

      // Update local state
      const newClient = { id: clientRef.id, ...clientData };
      setClients(prev => [...prev, newClient]);
      setSelectedClientId(clientRef.id);
      
      // Clear form
      setClientEmail('');
      setClientName('');
      setShowInviteForm(false);
      
      alert(`Invitation sent to ${clientName}!`);

    } catch (error) {
      console.error('Error inviting client:', error);
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
    
    // Check file types (PDF or images only)
    const validFiles = selectedFiles.filter(file => {
      const isValid = file.type === 'application/pdf' || file.type.startsWith('image/');
      if (!isValid) {
        alert(`${file.name} is not a valid file type. Please upload PDF or image files only.`);
      }
      return isValid;
    });

    // Check file sizes (max 10MB)
    const validSizedFiles = validFiles.filter(file => {
      const isValidSize = file.size <= 10 * 1024 * 1024; // 10MB
      if (!isValidSize) {
        alert(`${file.name} is too large. Please upload files smaller than 10MB.`);
      }
      return isValidSize;
    });

    setFiles(prev => [...prev, ...validSizedFiles]);
  };

  const uploadFiles = async () => {
    if (files.length === 0) return alert('Please select at least one file');
    if (!projectTitle.trim()) return alert('Please enter a project title');
    
    // Enhanced validation for client assignment
    if (canAssignProofs() && !selectedClientId) {
      return alert('Please select a client or invite a new one');
    }

    setUploading(true);
    const user = auth.currentUser;

    try {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({
          ...prev,
          [i]: { status: 'uploading', progress: 0 }
        }));
        
        // Upload file to storage
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const fileRef = ref(storage, `proofFiles/${fileName}`);
        
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        // Create proof document
        await addDoc(collection(db, 'proofs'), {
          title: projectTitle.trim(),
          clientName: selectedClient?.displayName || selectedClient?.email,
          clientId: selectedClientId,
          clientEmail: selectedClient?.email,
          clientStatus: selectedClient?.status || 'active', // Track if client is invited
          fileUrl: downloadURL,
          fileName: file.name,
          fileType: file.type === 'application/pdf' ? 'pdf' : 'image',
          fileSize: file.size,
          status: 'pending',
          notes: notes.trim(),
          uploadedBy: user?.uid,
          uploaderEmail: user?.email,
          createdAt: serverTimestamp(),
          assignedAt: new Date()
        });

        setUploadProgress(prev => ({
          ...prev,
          [i]: { status: 'complete', progress: 100 }
        }));
      }

      // ⭐ NEW: If client is invited, send them a notification about the new proof
      if (selectedClient?.status === 'invited') {
        try {
          await sendProofReadyEmail(selectedClient.email, selectedClient.displayName, projectTitle);
          console.log('Proof ready notification sent to invited client');
        } catch (emailError) {
          console.error('Failed to send proof notification:', emailError);
          // Don't fail the upload if email fails
        }
      }

      // Reset form
      setFiles([]);
      setProjectTitle('');
      setSelectedClientId('');
      setNotes('');
      setUploadProgress({});
      fileInputRef.current.value = '';
      
      alert('Proofs uploaded successfully!');
      onUploadComplete?.();
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
      
      // Mark failed uploads
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
      <div className="border-b border-gray-200 pb-4">
        <h3 className="text-lg font-medium text-gray-900">Upload New Proof</h3>
        <p className="text-sm text-gray-600 mt-1">
          Upload files for client review and approval
        </p>
      </div>

      {/* Project Title */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Project Title *
        </label>
        <input
          type="text"
          value={projectTitle}
          onChange={(e) => setProjectTitle(e.target.value)}
          placeholder="Enter project or job title"
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={uploading}
        />
      </div>

      {/* Client Assignment - Only for admins and designers */}
      {canAssignProofs() && (
        <div>
          <div className="flex items-center justify-between mb-2">
            <label className="block text-sm font-medium text-gray-700">
              Assign to Client *
            </label>
            <button
              type="button"
              onClick={() => setShowInviteForm(!showInviteForm)}
              className="text-sm text-blue-600 hover:text-blue-800 font-medium"
              disabled={uploading}
            >
              + Invite New Client
            </button>
          </div>
          
          {/* Existing Clients Dropdown */}
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={uploading}
          >
            <option value="">Select a client...</option>
            {clients.map(client => (
              <option key={client.id} value={client.id}>
                {client.displayName || client.email}
                {client.status === 'invited' && ' (Invited)'}
              </option>
            ))}
          </select>

          {/* ⭐ NEW: Invite New Client Form */}
          {showInviteForm && (
            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <h4 className="text-sm font-medium text-blue-900 mb-3">Invite New Client</h4>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                <input
                  type="text"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Client name"
                  className="p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                  disabled={invitingClient}
                />
                <input
                  type="email"
                  value={clientEmail}
                  onChange={(e) => setClientEmail(e.target.value)}
                  placeholder="Client email"
                  className="p-2 border border-blue-300 rounded focus:ring-2 focus:ring-blue-500"
                  disabled={invitingClient}
                />
              </div>
              
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleInviteClient}
                  disabled={invitingClient}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm"
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
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Any special instructions or notes for this proof..."
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
          disabled={uploading}
        />
      </div>

      {/* File Upload Area */}
      <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-blue-400 transition-colors">
        <input
          type="file"
          accept="application/pdf,image/*"
          multiple
          ref={fileInputRef}
          onChange={handleFileSelect}
          className="hidden"
          disabled={uploading}
        />
        
        <Upload className="mx-auto h-12 w-12 text-gray-400 mb-4" />
        <p className="text-lg font-medium text-gray-900 mb-2">
          Drop files here or click to browse
        </p>
        <p className="text-sm text-gray-600 mb-4">
          Supports PDF and image files up to 10MB each
        </p>
        
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={uploading}
          className="px-6 py-2 bg-neutral-600 hover:bg-neutral-700 text-white rounded-lg transition-colors disabled:opacity-50"
        >
          Select Files
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
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                        <span className="text-xs text-gray-600">Uploading...</span>
                      </div>
                    )}
                    {progress?.status === 'complete' && (
                      <CheckCircle className="h-5 w-5 text-green-600" />
                    )}
                    {progress?.status === 'error' && (
                      <AlertCircle className="h-5 w-5 text-red-600" />
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
            disabled={uploading || !projectTitle.trim() || 
              (canAssignProofs() && !selectedClientId)
            }
            className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {uploading ? 'Uploading...' : `Upload ${files.length} File${files.length > 1 ? 's' : ''}`}
          </button>
        </div>
      )}
    </div>
  );
}