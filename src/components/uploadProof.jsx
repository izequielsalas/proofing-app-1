// 1. Enhanced Upload Component with Client Invitation
// src/components/uploadProof.jsx (modifications)

import { useState, useEffect } from 'react';
import { collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { sendInvitationEmail } from '../utils/emailService';

export default function UploadProof({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clientName, setClientName] = useState('');
  const [clientEmail, setClientEmail] = useState('');
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [clients, setClients] = useState([]);
  const [showInviteForm, setShowInviteForm] = useState(false);
  const [invitingClient, setInvitingClient] = useState(false);

  // Fetch existing clients
  useEffect(() => {
    const fetchClients = async () => {
      try {
        const q = query(collection(db, 'users'), where('role', '==', 'client'));
        const snapshot = await getDocs(q);
        const clientList = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }));
        setClients(clientList);
      } catch (error) {
        console.error('Error fetching clients:', error);
      }
    };

    fetchClients();
  }, []);

  // Create and invite a new client
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

  const uploadFiles = async () => {
    if (files.length === 0) return alert('Please select at least one file');
    if (!projectTitle.trim()) return alert('Please enter a project title');
    
    // Enhanced validation for client assignment
    if (!selectedClientId) {
      return alert('Please select a client or invite a new one');
    }

    setUploading(true);
    const user = auth.currentUser;

    try {
      const selectedClient = clients.find(c => c.id === selectedClientId);
      
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        
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
          createdAt: new Date(),
          assignedAt: new Date()
        });
      }

      // If client is invited, send them a notification about the new proof
      if (selectedClient?.status === 'invited') {
        await sendProofReadyEmail(selectedClient.email, selectedClient.displayName, projectTitle);
      }

      // Reset form
      setFiles([]);
      setProjectTitle('');
      setSelectedClientId('');
      setNotes('');
      
      alert('Proofs uploaded successfully!');
      onUploadComplete?.();
      
    } catch (error) {
      console.error('Upload error:', error);
      alert('Upload failed. Please try again.');
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

      {/* Client Assignment */}
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

        {/* Invite New Client Form */}
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

      {/* File Upload Area */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Upload Files *
        </label>
        <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center">
          <input
            type="file"
            multiple
            accept=".pdf,.jpg,.jpeg,.png"
            onChange={(e) => setFiles(Array.from(e.target.files))}
            className="hidden"
            id="file-upload"
            disabled={uploading}
          />
          <label htmlFor="file-upload" className="cursor-pointer">
            <div className="text-gray-600">
              <svg className="mx-auto h-12 w-12 text-gray-400" stroke="currentColor" fill="none" viewBox="0 0 48 48">
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m-12 4h.02" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              </svg>
              <p className="mt-2 text-sm text-gray-600">
                <span className="font-medium text-blue-600 hover:text-blue-500">
                  Click to upload
                </span> or drag and drop
              </p>
              <p className="text-xs text-gray-500">PDF, PNG, JPG up to 10MB</p>
            </div>
          </label>
        </div>
        
        {files.length > 0 && (
          <div className="mt-3">
            <p className="text-sm text-gray-600 mb-2">Selected files:</p>
            <ul className="space-y-1">
              {files.map((file, index) => (
                <li key={index} className="text-sm text-gray-800 bg-gray-50 p-2 rounded">
                  {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* Notes */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          Notes (Optional)
        </label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Add any special instructions or notes for the client"
          rows={3}
          className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
          disabled={uploading}
        />
      </div>

      {/* Upload Button */}
      <button
        onClick={uploadFiles}
        disabled={uploading || files.length === 0 || !projectTitle.trim() || !selectedClientId}
        className="w-full bg-blue-600 text-white py-3 px-4 rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-medium"
      >
        {uploading ? 'Uploading...' : 'Upload Proofs'}
      </button>
    </div>
  );
}