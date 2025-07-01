// src/components/uploadProof.jsx
import React, { useState, useRef, useEffect } from 'react';
import { collection, addDoc, serverTimestamp, query, where, getDocs } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage, auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { Upload, File, X, CheckCircle, AlertCircle } from 'lucide-react';

export default function UploadProof({ onUploadComplete }) {
  const [files, setFiles] = useState([]);
  const [projectTitle, setProjectTitle] = useState('');
  const [clientName, setClientName] = useState('');
  const [selectedClientId, setSelectedClientId] = useState('');
  const [clients, setClients] = useState([]);
  const [notes, setNotes] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState({});
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

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
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

  const removeFile = (index) => {
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const uploadFiles = async () => {
    if (files.length === 0) return alert('Please select at least one file');
    if (!projectTitle.trim()) return alert('Please enter a project title');
    
    // Validation for client assignment - both admins and designers need to assign
    if (canAssignProofs() && !selectedClientId && !clientName.trim()) {
      return alert('Please select a client or enter a client name');
    }

    setUploading(true);
    const user = auth.currentUser;

    try {
      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setUploadProgress(prev => ({
          ...prev,
          [i]: { status: 'uploading', progress: 0 }
        }));

        // Create unique filename
        const timestamp = Date.now();
        const fileName = `${timestamp}_${file.name}`;
        const fileRef = ref(storage, `proofFiles/${fileName}`);

        // Upload file
        await uploadBytes(fileRef, file);
        const downloadURL = await getDownloadURL(fileRef);

        // Determine client assignment
        let finalClientId = selectedClientId;
        let finalClientName = clientName.trim();
        
        if (selectedClientId) {
          const selectedClient = clients.find(c => c.id === selectedClientId);
          finalClientName = selectedClient?.displayName || selectedClient?.name || selectedClient?.email || finalClientName;
        } else if (!finalClientId && canAssignProofs()) {
          // If no client selected but client name provided, use the client name
          finalClientId = 'unassigned';
        } else if (!canAssignProofs()) {
          // For clients uploading their own proofs (shouldn't happen with current permissions, but safety check)
          finalClientId = userProfile?.clientId || userProfile?.uid;
          finalClientName = userProfile?.displayName || userProfile?.name || user?.email;
        }

        // Add to Firestore
        await addDoc(collection(db, 'proofs'), {
          title: projectTitle.trim(),
          clientName: finalClientName,
          clientId: finalClientId,
          fileUrl: downloadURL,
          fileName: file.name,
          fileType: file.type === 'application/pdf' ? 'pdf' : 'image',
          fileSize: file.size,
          status: 'pending',
          notes: notes.trim(),
          uploadedBy: user?.uid,
          uploaderEmail: user?.email || 'unknown',
          assignedTo: selectedClientId ? [selectedClientId] : [],
          createdAt: serverTimestamp(),
        });

        setUploadProgress(prev => ({
          ...prev,
          [i]: { status: 'complete', progress: 100 }
        }));
      }

      // Reset form
      setFiles([]);
      setProjectTitle('');
      setClientName('');
      setSelectedClientId('');
      setNotes('');
      setUploadProgress({});
      fileInputRef.current.value = '';
      
      alert('All files uploaded successfully!');
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
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Assign to Client *
          </label>
          
          {/* Client Selection Dropdown */}
          {clients.length > 0 && (
            <div className="mb-3">
              <select
                value={selectedClientId}
                onChange={(e) => {
                  setSelectedClientId(e.target.value);
                  if (e.target.value) {
                    setClientName(''); // Clear manual entry when selecting from dropdown
                  }
                }}
                className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                disabled={uploading}
              >
                <option value="">Select existing client...</option>
                {clients.map(client => (
                  <option key={client.id} value={client.id}>
                    {client.displayName || client.name || client.email}
                  </option>
                ))}
              </select>
            </div>
          )}
          
          {/* Manual Client Name Entry */}
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {clients.length > 0 && !selectedClientId 
              ? 'Or enter new client name:' 
              : '(or select from list above)'}
          </label>
          <input
            type="text"
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder="Client or company name"
            className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            disabled={uploading}
          />
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
              (canAssignProofs() && !selectedClientId && !clientName.trim())
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