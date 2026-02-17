// src/components/Modal.jsx - With Revision System
import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, orderBy } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { X, Download, Check, AlertCircle, GitBranch, Upload, ChevronDown, ChevronUp, Factory, FlaskConical, PackageCheck } from "lucide-react";
import UploadProof from "./uploadProof";

export default function Modal({ project, onClose }) {
  const stopPropagation = (e) => e.stopPropagation();
  const isPDF = project.fileUrl?.endsWith(".pdf");
  const { hasPermission } = useAuth();
  
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [notes, setNotes] = useState("");
  const [declineError, setDeclineError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadRevision, setShowUploadRevision] = useState(false);
  const [revisionHistory, setRevisionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);

  // Determine the revision chain ID (for fetching all related versions)
  const revisionChainId = project.revisionChainId || project.id;
  const isRevision = project.parentProofId != null;
  const currentRevisionNumber = project.revisionNumber || 1;

  // Load revision history when modal opens or when history is toggled
  useEffect(() => {
    if (showHistory && !loadingHistory && revisionHistory.length === 0) {
      loadRevisionHistory();
    }
  }, [showHistory]);

  const loadRevisionHistory = async () => {
    setLoadingHistory(true);
    try {
      const q = query(
        collection(db, "proofs"),
        where("revisionChainId", "==", revisionChainId),
        orderBy("revisionNumber", "desc")
      );
      
      const snapshot = await getDocs(q);
      const history = snapshot.docs
        .map(doc => ({ id: doc.id, ...doc.data() }))
        .filter(proof => proof.id !== project.id);
      
      setRevisionHistory(history);
    } catch (error) {
      console.error("Error loading revision history:", error);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "proofs", project.id), {
        status: "approved",
        updatedAt: serverTimestamp(),
        comments: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error("Error approving proof:", err);
      alert("Error approving proof. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const handleDecline = async () => {
    // Step 1: show the comment box if not already visible
    if (!showCommentBox) {
      setShowCommentBox(true);
      return;
    }

    // Step 2: enforce that a comment was actually entered
    if (notes.trim() === "") {
      setDeclineError("Please explain why you're declining before submitting.");
      return;
    }

    setDeclineError("");
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "proofs", project.id), {
        status: "declined",
        updatedAt: serverTimestamp(),
        comments: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error("Error declining proof:", err);
      alert("Error declining proof. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  // Production status advance handlers
  const handleAdvanceStatus = async (newStatus) => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "proofs", project.id), {
        status: newStatus,
        updatedAt: serverTimestamp(),
      });
      onClose();
    } catch (err) {
      console.error(`Error advancing proof to ${newStatus}:`, err);
      alert(`Error updating proof status. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  // Clear error when user starts typing
  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    if (declineError) setDeclineError("");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'declined': return 'text-red-600 bg-red-50 border-red-200';
      case 'in_production': return 'text-blue-600 bg-blue-50 border-blue-200';
      case 'in_quality_control': return 'text-purple-600 bg-purple-50 border-purple-200';
      case 'completed': return 'text-emerald-600 bg-emerald-50 border-emerald-200';
      default: return 'text-amber-600 bg-amber-50 border-amber-200';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'in_production': return 'In Production';
      case 'in_quality_control': return 'In Quality Control';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1);
    }
  };

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
      return date.toLocaleDateString('en-US', { 
        month: 'short', 
        day: 'numeric',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'Unknown';
    }
  };

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <motion.div
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] flex flex-col"
        onClick={stopPropagation}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header — fixed, never scrolls */}
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">
              {project.title || `Proof #${project.id?.slice(-6)}`}
            </h2>
            
            {/* Revision Badge */}
            {isRevision && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800 border border-blue-200 flex items-center gap-1">
                <GitBranch className="w-4 h-4" />
                Revision {currentRevisionNumber}
              </span>
            )}
            
            {/* Status Badge */}
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}>
              {getStatusLabel(project.status)}
            </span>
          </div>
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            onClick={onClose}
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable content area */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Revision History Toggle */}
          {(isRevision || revisionHistory.length > 0 || loadingHistory) && (
            <div className="mb-6">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-800 transition-colors"
              >
                <GitBranch className="w-4 h-4" />
                {showHistory ? 'Hide' : 'Show'} Revision History
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showHistory && (
                <div className="mt-4 space-y-2">
                  {loadingHistory ? (
                    <div className="text-sm text-gray-500 p-3">Loading history...</div>
                  ) : revisionHistory.length === 0 ? (
                    <div className="text-sm text-gray-500 p-3">No previous revisions</div>
                  ) : (
                    <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                      {revisionHistory.map((revision) => (
                        <div key={revision.id} className="flex items-start justify-between p-3 bg-white rounded border border-gray-200">
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-medium text-gray-900">
                                Revision {revision.revisionNumber || 1}
                              </span>
                              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(revision.status)}`}>
                                {revision.status}
                              </span>
                            </div>
                            <p className="text-sm text-gray-600">
                              {formatDate(revision.createdAt)}
                            </p>
                            {revision.comments && (
                              <p className="text-sm text-gray-700 mt-2 italic">"{revision.comments}"</p>
                            )}
                          </div>
                          <a
                            href={revision.fileUrl}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="ml-4 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                            onClick={(e) => e.stopPropagation()}
                          >
                            View
                          </a>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* File Display */}
          <div className="mb-6">
            {isPDF ? (
              <iframe
                src={project.fileUrl}
                className="w-full h-[500px] rounded-lg border shadow-sm"
                title={`proof-${project.id}`}
              />
            ) : (
              <img
                src={project.fileUrl}
                alt={project.title || "Proof"}
                className="w-full max-h-[500px] object-contain rounded-lg border shadow-sm"
              />
            )}
          </div>

          {/* Proof Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Created:</span>
                <p className="text-gray-900">{formatDate(project.createdAt)}</p>
              </div>
              <div>
                <span className="font-medium text-gray-600">Type:</span>
                <p className="text-gray-900">{isPDF ? 'PDF Document' : 'Image'}</p>
              </div>
              {project.clientName && (
                <div>
                  <span className="font-medium text-gray-600">Client:</span>
                  <p className="text-gray-900">{project.clientName}</p>
                </div>
              )}
              {(project.updatedAt || project.responseAt) && (
                <div>
                  <span className="font-medium text-gray-600">Response Date:</span>
                  <p className="text-gray-900">
                    {formatDate(project.updatedAt || project.responseAt)}
                  </p>
                </div>
              )}
              {isRevision && (
                <div>
                  <span className="font-medium text-gray-600">Revision:</span>
                  <p className="text-gray-900">Version {currentRevisionNumber}</p>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          {(showCommentBox || project.comments || project.notes) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {showCommentBox && project.status === 'pending'
                  ? 'Reason for declining (required)'
                  : 'Comments'}
              </label>
              {project.status === 'pending' ? (
                <div>
                  <textarea
                    value={notes}
                    onChange={handleNotesChange}
                    placeholder="Describe what needs to be changed..."
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none ${
                      declineError ? 'border-red-400 bg-red-50' : 'border-gray-300'
                    }`}
                    rows={4}
                    autoFocus={showCommentBox}
                  />
                  {declineError && (
                    <p className="mt-2 text-sm text-red-600 flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {declineError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-900">
                    {project.comments || project.notes || 'No comments provided'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Production Status Banner — shown for in_production, in_quality_control, completed */}
          {['in_production', 'in_quality_control', 'completed'].includes(project.status) && (
            <div className={`mb-6 p-4 rounded-lg border ${
              project.status === 'completed'
                ? 'bg-emerald-50 border-emerald-200'
                : project.status === 'in_quality_control'
                ? 'bg-purple-50 border-purple-200'
                : 'bg-blue-50 border-blue-200'
            }`}>
              <div className="flex items-center gap-3">
                {project.status === 'in_production' && <Factory className="w-5 h-5 text-blue-600" />}
                {project.status === 'in_quality_control' && <FlaskConical className="w-5 h-5 text-purple-600" />}
                {project.status === 'completed' && <PackageCheck className="w-5 h-5 text-emerald-600" />}
                <div>
                  <p className={`font-medium text-sm ${
                    project.status === 'completed' ? 'text-emerald-900'
                    : project.status === 'in_quality_control' ? 'text-purple-900'
                    : 'text-blue-900'
                  }`}>
                    {project.status === 'in_production' && 'This proof is currently in production'}
                    {project.status === 'in_quality_control' && 'This proof is in quality control'}
                    {project.status === 'completed' && 'This proof has been completed'}
                  </p>
                  {project.updatedAt && (
                    <p className="text-xs text-gray-500 mt-0.5">
                      Updated {formatDate(project.updatedAt)}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Upload Revision Section */}
          {project.status === 'declined' && hasPermission('canUploadProofs') && (
            <div className="mb-6">
              <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-amber-900 flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      This proof was declined
                    </h4>
                    <p className="text-sm text-amber-800 mt-1">
                      Upload a revised version to continue the approval process
                    </p>
                  </div>
                </div>
                
                <button
                  onClick={() => setShowUploadRevision(!showUploadRevision)}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors text-sm font-medium"
                >
                  <Upload className="w-4 h-4" />
                  {showUploadRevision ? 'Cancel Upload' : 'Upload Revision'}
                </button>
              </div>

              {showUploadRevision && (
                <div className="border-t border-gray-200 pt-6">
                  <UploadProof 
                    revisionMode={true} 
                    parentProof={project}
                    onUploadComplete={() => {
                      setShowUploadRevision(false);
                      onClose();
                    }}
                  />
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions — fixed at bottom, never scrolls */}
        <div className="border-t border-gray-200 p-6 flex gap-3 rounded-b-xl bg-white flex-shrink-0 flex-wrap">
          <a
            href={project.fileUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
          >
            <Download size={16} />
            Download
          </a>
          
          {project.status === 'pending' && (
            <>
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Check size={16} />
                {isLoading ? 'Approving...' : 'Approve'}
              </button>
              
              <button
                onClick={handleDecline}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <AlertCircle size={16} />
                {isLoading ? 'Processing...' : (showCommentBox ? 'Submit Decline' : 'Decline')}
              </button>
            </>
          )}

          {/* Production workflow buttons — admin and designer only */}
          {hasPermission('canUploadProofs') && (
            <>
              {project.status === 'approved' && (
                <button
                  onClick={() => handleAdvanceStatus('in_production')}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <Factory size={16} />
                  {isLoading ? 'Updating...' : 'Send to Production'}
                </button>
              )}

              {project.status === 'in_production' && (
                <button
                  onClick={() => handleAdvanceStatus('in_quality_control')}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <FlaskConical size={16} />
                  {isLoading ? 'Updating...' : 'Move to QC'}
                </button>
              )}

              {project.status === 'in_quality_control' && (
                <button
                  onClick={() => handleAdvanceStatus('completed')}
                  disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  <PackageCheck size={16} />
                  {isLoading ? 'Updating...' : 'Mark Completed'}
                </button>
              )}
            </>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}