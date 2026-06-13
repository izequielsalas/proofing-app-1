// src/components/Modal.jsx - With Revision System + Notes + Tags + QC Acknowledge
import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, orderBy, arrayUnion } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import { X, Download, Check, AlertCircle, GitBranch, Upload, ChevronDown, ChevronUp, Factory, FlaskConical, PackageCheck, MessageSquare, Send, Tag } from "lucide-react";
import UploadProof from "./uploadProof";
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

export default function Modal({ project, onClose }) {
  const stopPropagation = (e) => e.stopPropagation();
  const isPDF = project.fileUrl?.toLowerCase().includes('.pdf');
  const { hasPermission, userProfile, isAdmin, isDesigner, isProduction } = useAuth();
  
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [notes, setNotes] = useState("");
  const [declineError, setDeclineError] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [showUploadRevision, setShowUploadRevision] = useState(false);
  const [revisionHistory, setRevisionHistory] = useState([]);
  const [loadingHistory, setLoadingHistory] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [historyError, setHistoryError] = useState(null);

  // ── Notes state ───────────────────────────────────────────────
  const [proofNotes, setProofNotes] = useState(project.notes_list || []);
  const [newNote, setNewNote] = useState('');
  const [savingNote, setSavingNote] = useState(false);

  const revisionChainId = project.revisionChainId || project.id;
  const isRevision = project.parentProofId != null;
  const currentRevisionNumber = project.revisionNumber || 1;

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, []);

  // Load revision history + auto-acknowledge QC on modal open
  useEffect(() => {
    loadRevisionHistory();

    // Auto-acknowledge QC when admin opens the modal
    if (
      project.status === 'in_quality_control' &&
      project.qcAcknowledged === false &&
      isAdmin()
    ) {
      updateDoc(doc(db, 'proofs', project.id), {
        qcAcknowledged: true,
        updatedAt: serverTimestamp(),
      }).catch(err => console.error('Error acknowledging QC:', err));
    }
  }, []);

  const loadRevisionHistory = async () => {
    setLoadingHistory(true);
    setHistoryError(null);
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
      setHistoryError(error.message);
    } finally {
      setLoadingHistory(false);
    }
  };

  // ── Add note ──────────────────────────────────────────────────
  const handleAddNote = async () => {
    const trimmed = newNote.trim();
    if (!trimmed || savingNote) return;

    setSavingNote(true);
    try {
      const noteEntry = {
        text: trimmed,
        authorName: userProfile?.displayName || userProfile?.email || 'Unknown',
        authorRole: userProfile?.role || 'unknown',
        createdAt: new Date().toISOString(),
      };

      await updateDoc(doc(db, 'proofs', project.id), {
        notes_list: arrayUnion(noteEntry),
        updatedAt: serverTimestamp(),
      });

      setProofNotes(prev => [...prev, noteEntry]);
      setNewNote('');
    } catch (err) {
      console.error('Error saving note:', err);
      alert('Failed to save note. Please try again.');
    } finally {
      setSavingNote(false);
    }
  };

  const handleNoteKeyDown = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) {
      handleAddNote();
    }
  };

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "proofs", project.id), {
        status: "approved",
        updatedAt: serverTimestamp(),
        updatedByRole: userProfile?.role || 'unknown',
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
    if (!showCommentBox) {
      setShowCommentBox(true);
      return;
    }
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
        updatedByRole: userProfile?.role || 'unknown',
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

  const handleAdvanceStatus = async (newStatus) => {
    setIsLoading(true);
    try {
      const updateData = {
        status: newStatus,
        updatedAt: serverTimestamp(),
        updatedByRole: userProfile?.role || 'unknown',
      };

      // Moving to QC — add tracking fields
      if (newStatus === 'in_quality_control') {
        updateData.qcAddedAt = serverTimestamp();
        updateData.qcAcknowledged = false;
      }

      // Returning to production from QC — clear QC fields and reset column
      if (newStatus === 'in_production') {
        updateData.productionColumn = null;
        updateData.qcAddedAt = null;
        updateData.qcAcknowledged = null;
      }

      await updateDoc(doc(db, "proofs", project.id), updateData);
      onClose();
    } catch (err) {
      console.error(`Error advancing proof to ${newStatus}:`, err);
      alert(`Error updating proof status. Please try again.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleNotesChange = (e) => {
    setNotes(e.target.value);
    if (declineError) setDeclineError("");
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-[#2D7A0F] bg-[#E6F9DD] border-cesar-green';
      case 'declined': return 'text-[#A8005A] bg-[#FCE4EC] border-cesar-magenta';
      case 'in_production': return 'text-[#B34D00] bg-[#FFF0E0] border-cesar-orange';
      case 'in_quality_control': return 'text-[#5A3695] bg-[#EDE7F6] border-cesar-purple';
      case 'completed': return 'text-cesar-navy bg-[#E0EAF5] border-cesar-navy';
      default: return 'text-[#92690B] bg-[#FEF3CD] border-cesar-yellow';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'in_production': return 'In Production';
      case 'in_quality_control': return 'In Quality Control';
      default: return status?.charAt(0).toUpperCase() + status?.slice(1);
    }
  };

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin': return 'bg-[#EDE7F6] text-[#5A3695]';
      case 'designer': return 'bg-[#E0EAF5] text-cesar-navy';
      case 'production': return 'bg-[#FFF3E0] text-[#E65100]';
      case 'client': return 'bg-[#E6F9DD] text-[#2D7A0F]';
      default: return 'bg-gray-100 text-gray-600';
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

  const formatNoteDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const hasRevisionHistory = revisionHistory.length > 0;
  const showRevisionSection = hasRevisionHistory || isRevision || loadingHistory;

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden"
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
        {/* Header */}
        <div className="bg-white border-b border-gray-200 p-6 flex justify-between items-center rounded-t-xl flex-shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <h2 className="text-2xl font-bold text-gray-900">
              {project.title || `Proof #${project.id?.slice(-6)}`}
            </h2>
            {isRevision && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#E0EAF5] text-cesar-navy border border-cesar-navy/30 flex items-center gap-1">
                <GitBranch className="w-4 h-4" />
                Revision {currentRevisionNumber}
              </span>
            )}
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}>
              {getStatusLabel(project.status)}
            </span>
            {/* QC unacknowledged indicator in header */}
            {project.status === 'in_quality_control' && project.qcAcknowledged === false && (
              <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#5A3695] text-white flex items-center gap-1">
                <FlaskConical className="w-4 h-4" />
                New in QC
              </span>
            )}
          </div>
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0"
            onClick={onClose}
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Scrollable content */}
        <div className="flex-1 overflow-y-auto p-6">

          {/* Revision History */}
          {showRevisionSection && (
            <div className="mb-6">
              <button
                onClick={() => setShowHistory(!showHistory)}
                className="flex items-center gap-2 text-sm font-medium text-cesar-navy hover:text-[#003d73] transition-colors"
              >
                <GitBranch className="w-4 h-4" />
                {showHistory ? 'Hide' : 'Show'} Revision History
                {hasRevisionHistory && (
                  <span className="px-1.5 py-0.5 bg-cesar-navy text-white text-xs rounded-full">
                    {revisionHistory.length}
                  </span>
                )}
                {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
              </button>

              {showHistory && (
                <div className="mt-4 space-y-2">
                  {loadingHistory ? (
                    <div className="text-sm text-gray-500 p-3">Loading history...</div>
                  ) : historyError ? (
                    <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg">
                      Could not load revision history: {historyError}
                    </div>
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
                            <p className="text-sm text-gray-600">{formatDate(revision.createdAt)}</p>
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
                src={`https://docs.google.com/viewer?url=${encodeURIComponent(project.fileUrl)}&embedded=true`}
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

            {/* Tags */}
            {project.tags?.length > 0 && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 flex-wrap">
                  <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  {project.tags.map(tag => (
                    <span
                      key={tag}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cesar-navy/10 text-cesar-navy"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Comments Section (approve/decline flow) */}
          {(showCommentBox || project.comments) && (
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
                    className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy resize-none ${
                      declineError ? 'border-cesar-magenta bg-[#FCE4EC]' : 'border-gray-300'
                    }`}
                    rows={4}
                    autoFocus={showCommentBox}
                  />
                  {declineError && (
                    <p className="mt-2 text-sm text-[#A8005A] flex items-center gap-1">
                      <AlertCircle className="w-4 h-4 flex-shrink-0" />
                      {declineError}
                    </p>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-900">
                    {project.comments || 'No comments provided'}
                  </p>
                </div>
              )}
            </div>
          )}

          {/* ── Notes Panel ─────────────────────────────────────── */}
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <MessageSquare className="w-4 h-4 text-gray-500" />
              <h3 className="text-sm font-semibold text-gray-700">
                Notes
                {proofNotes.length > 0 && (
                  <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">
                    {proofNotes.length}
                  </span>
                )}
              </h3>
            </div>

            {proofNotes.length > 0 ? (
              <div className="space-y-3 mb-4">
                {proofNotes.map((note, index) => (
                  <div key={index} className="flex gap-3">
                    <div className="w-7 h-7 rounded-full bg-cesar-navy/10 flex items-center justify-center text-cesar-navy font-semibold text-xs flex-shrink-0 mt-0.5">
                      {(note.authorName || '?')[0].toUpperCase()}
                    </div>
                    <div className="flex-1 bg-gray-50 rounded-lg p-3">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <span className="text-sm font-medium text-gray-900">{note.authorName}</span>
                        <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${getRoleColor(note.authorRole)}`}>
                          {note.authorRole}
                        </span>
                        <span className="text-xs text-gray-400">{formatNoteDate(note.createdAt)}</span>
                      </div>
                      <p className="text-sm text-gray-700 whitespace-pre-wrap">{note.text}</p>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-gray-400 mb-4">No notes yet.</p>
            )}

            <div className="flex gap-2 items-start">
              <div className="w-7 h-7 rounded-full bg-cesar-navy/10 flex items-center justify-center text-cesar-navy font-semibold text-xs flex-shrink-0 mt-1">
                {(userProfile?.displayName || userProfile?.email || '?')[0].toUpperCase()}
              </div>
              <div className="flex-1">
                <textarea
                  value={newNote}
                  onChange={e => setNewNote(e.target.value)}
                  onKeyDown={handleNoteKeyDown}
                  placeholder="Add a note... (Cmd+Enter to submit)"
                  rows={2}
                  disabled={savingNote}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy text-sm resize-none disabled:opacity-50"
                />
              </div>
              <button
                onClick={handleAddNote}
                disabled={!newNote.trim() || savingNote}
                className="p-2 bg-cesar-navy hover:bg-[#003070] text-white rounded-lg transition-colors disabled:opacity-40 mt-1"
                title="Add note"
              >
                {savingNote
                  ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                  : <Send size={16} />
                }
              </button>
            </div>
          </div>

          {/* Production Status Banner */}
          {['in_production', 'in_quality_control', 'completed'].includes(project.status) && (
            <div className={`mb-6 p-4 rounded-lg border ${
              project.status === 'completed'
                ? 'bg-[#E0EAF5] border-cesar-navy/20'
                : project.status === 'in_quality_control'
                ? 'bg-[#EDE7F6] border-cesar-purple/20'
                : 'bg-[#FFF0E0] border-cesar-orange/20'
            }`}>
              <div className="flex items-center gap-3">
                {project.status === 'in_production' && <Factory className="w-5 h-5 text-cesar-orange" />}
                {project.status === 'in_quality_control' && <FlaskConical className="w-5 h-5 text-cesar-purple" />}
                {project.status === 'completed' && <PackageCheck className="w-5 h-5 text-cesar-navy" />}
                <div>
                  <p className={`font-medium text-sm ${
                    project.status === 'completed' ? 'text-cesar-navy'
                    : project.status === 'in_quality_control' ? 'text-[#5A3695]'
                    : 'text-[#B34D00]'
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
              <div className="p-4 bg-[#FEF3CD] border border-cesar-yellow/30 rounded-lg mb-4">
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <h4 className="font-medium text-[#92690B] flex items-center gap-2">
                      <AlertCircle className="w-5 h-5" />
                      This proof was declined
                    </h4>
                    <p className="text-sm text-[#92690B] mt-1">
                      Upload a revised version to continue the approval process
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => setShowUploadRevision(!showUploadRevision)}
                  className="flex items-center gap-2 px-4 py-2 bg-cesar-navy hover:bg-[#003d73] text-white rounded-lg transition-colors text-sm font-medium"
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

        {/* Actions */}
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

          {/* Approve / Decline — pending proofs, admin/designer only */}
          {project.status === 'pending' && hasPermission('canUploadProofs') && (
            <>
              <button
                onClick={handleApprove}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-cesar-green hover:bg-[#66c23a] text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <Check size={16} />
                {isLoading ? 'Approving...' : 'Approve'}
              </button>
              <button
                onClick={handleDecline}
                disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-cesar-magenta hover:bg-[#c9006a] text-white rounded-lg transition-colors disabled:opacity-50"
              >
                <AlertCircle size={16} />
                {isLoading ? 'Processing...' : (showCommentBox ? 'Submit Decline' : 'Decline')}
              </button>
            </>
          )}

          {/* Send to Production — admin/designer only, approved proofs */}
          {project.status === 'approved' && hasPermission('canUploadProofs') && (
            <button
              onClick={() => handleAdvanceStatus('in_production')}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-cesar-orange hover:bg-[#e55d00] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Factory size={16} />
              {isLoading ? 'Updating...' : 'Send to Production'}
            </button>
          )}

          {/* Move to QC — admin, designer, AND production */}
          {project.status === 'in_production' && (isAdmin() || isDesigner() || isProduction()) && (
            <button
              onClick={() => handleAdvanceStatus('in_quality_control')}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-cesar-purple hover:bg-[#6a45a8] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <FlaskConical size={16} />
              {isLoading ? 'Updating...' : 'Move to QC'}
            </button>
          )}

          {/* Mark Completed — admin/designer only */}
          {project.status === 'in_quality_control' && hasPermission('canUploadProofs') && (
            <button
              onClick={() => handleAdvanceStatus('completed')}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-cesar-navy hover:bg-[#003d73] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <PackageCheck size={16} />
              {isLoading ? 'Updating...' : 'Mark Completed'}
            </button>
          )}

          {/* Return to Production — admin/designer only, QC failures */}
          {project.status === 'in_quality_control' && (isAdmin() || isDesigner()) && (
            <button
              onClick={() => handleAdvanceStatus('in_production')}
              disabled={isLoading}
              className="flex items-center gap-2 px-6 py-2 bg-cesar-orange hover:bg-[#e55d00] text-white rounded-lg transition-colors disabled:opacity-50"
            >
              <Factory size={16} />
              {isLoading ? 'Updating...' : 'Return to Production'}
            </button>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
}