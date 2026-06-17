// src/components/Modal.jsx - Revision System + Notes + Tags + QC + Print Specs + Fulfillment + Progress Bar
import { motion, AnimatePresence } from "framer-motion";
import React, { useState, useEffect } from "react";
import { doc, updateDoc, serverTimestamp, collection, query, where, getDocs, orderBy, arrayUnion, getDoc } from "firebase/firestore";
import { db } from "../firebase";
import { useAuth } from "../contexts/AuthContext";
import {
  X, Download, Check, AlertCircle, GitBranch, Upload, ChevronDown, ChevronUp,
  Factory, FlaskConical, PackageCheck, MessageSquare, Send, Tag, Edit2,
  ClipboardList, Store, Truck, FileCheck, CheckCircle2
} from "lucide-react";
import UploadProof from "./uploadProof";
import { pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';

pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  'pdfjs-dist/build/pdf.worker.min.mjs',
  import.meta.url,
).toString();

const FINISH_OPTIONS = ['None', 'Gloss', 'Matte', 'Satin', 'Laminate', 'Other'];
const COLOR_OPTIONS = ['Full Color', 'Spot Color', 'Black & White', 'Other'];

// ── Progress bar stage definitions ──────────────────────────────
function getProgressStages(fulfillment) {
  const fulfillmentStage = fulfillment === 'delivery'
    ? { key: 'out_for_delivery', label: 'Out for Delivery', icon: Truck }
    : fulfillment === 'pickup'
    ? { key: 'ready_for_pickup', label: 'Ready for Pickup', icon: Store }
    : { key: 'ready', label: 'Ready', icon: Store };

  return [
    { key: 'pending', label: 'Proof Uploaded', icon: FileCheck },
    { key: 'approved', label: 'Approved', icon: Check },
    { key: 'in_production', label: 'In Production', icon: Factory },
    { key: 'in_quality_control', label: 'Quality Control', icon: FlaskConical },
    fulfillmentStage,
    { key: 'completed', label: 'Completed', icon: CheckCircle2 },
  ];
}

function getStageIndex(status, stages) {
  // Map actual status to stage index
  const statusToStageKey = {
    pending: 'pending',
    declined: 'pending', // declined sits at the same point as pending visually
    approved: 'approved',
    in_production: 'in_production',
    in_quality_control: 'in_quality_control',
    ready_for_pickup: 'ready_for_pickup',
    out_for_delivery: 'out_for_delivery',
    completed: 'completed',
  };
  const key = statusToStageKey[status] || 'pending';
  const idx = stages.findIndex(s => s.key === key);
  return idx === -1 ? 0 : idx;
}

function ProgressBar({ status, fulfillment }) {
  const stages = getProgressStages(fulfillment);
  const currentIndex = getStageIndex(status, stages);
  const isDeclined = status === 'declined';

  return (
    <div className="mb-6 px-2">
      <div className="flex items-center">
        {stages.map((stage, idx) => {
          const isComplete = idx < currentIndex;
          const isActive = idx === currentIndex && !isDeclined;
          const Icon = stage.icon;

          return (
            <React.Fragment key={stage.key}>
              <div className="flex flex-col items-center flex-shrink-0" style={{ width: 'fit-content' }}>
                <div
                  className={`w-9 h-9 rounded-full flex items-center justify-center border-2 transition-colors ${
                    isComplete
                      ? 'bg-cesar-green border-cesar-green text-white'
                      : isActive
                      ? 'bg-cesar-navy border-cesar-navy text-white'
                      : 'bg-white border-gray-300 text-gray-300'
                  }`}
                >
                  <Icon size={16} />
                </div>
                <span
                  className={`text-[10px] mt-1.5 text-center leading-tight max-w-[64px] font-medium ${
                    isComplete ? 'text-cesar-green' : isActive ? 'text-cesar-navy' : 'text-gray-400'
                  }`}
                >
                  {stage.label}
                </span>
              </div>
              {idx < stages.length - 1 && (
                <div
                  className={`flex-1 h-0.5 mx-1 mb-5 transition-colors ${
                    idx < currentIndex ? 'bg-cesar-green' : 'bg-gray-200'
                  }`}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>
      {isDeclined && (
        <p className="text-xs text-[#A8005A] text-center mt-2 font-medium">
          Changes were requested on this proof — awaiting a revised version.
        </p>
      )}
    </div>
  );
}

export default function Modal({ project, onClose }) {
  const stopPropagation = (e) => e.stopPropagation();
  const isPDF = project.fileUrl?.toLowerCase().includes('.pdf');
  const { hasPermission, userProfile, isAdmin, isDesigner, isProduction, isClient } = useAuth();
  
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

  // ── Tag editor state ──────────────────────────────────────────
  const [currentTags, setCurrentTags] = useState(project.tags || []);
  const [availableTags, setAvailableTags] = useState([]);
  const [editingTags, setEditingTags] = useState(false);
  const [savingTag, setSavingTag] = useState(false);

  // ── Invoice number state ──────────────────────────────────────
  const [invoiceNumber, setInvoiceNumber] = useState(project.invoiceNumber || '');
  const [editingInvoice, setEditingInvoice] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);

  // ── Print specs + fulfillment + est. completion panel state ──
  const [showSpecsPanel, setShowSpecsPanel] = useState(false);
  const [specs, setSpecs] = useState({
    size: '',
    quantity: '',
    material: '',
    finish: 'None',
    colors: 'Full Color',
    dueDate: '',
    specialInstructions: '',
    ...project.printSpecs,
  });
  const [fulfillment, setFulfillment] = useState(project.fulfillment || '');
  const [estimatedCompletionDate, setEstimatedCompletionDate] = useState(project.estimatedCompletionDate || '');
  const [savingSpecs, setSavingSpecs] = useState(false);
  const [specsSaved, setSpecsSaved] = useState(false);

  const revisionChainId = project.revisionChainId || project.id;
  const isRevision = project.parentProofId != null;
  const currentRevisionNumber = project.revisionNumber || 1;
  const canEdit = isAdmin() || isDesigner();

  // Lock body scroll when modal is open
  useEffect(() => {
    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = originalOverflow; };
  }, []);

  // Load revision history + auto-acknowledge QC + fetch available tags
  useEffect(() => {
    loadRevisionHistory();

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

    const fetchTags = async () => {
      try {
        const tagDoc = await getDoc(doc(db, 'settings', 'tags'));
        if (tagDoc.exists()) setAvailableTags(tagDoc.data().list || []);
      } catch (err) {
        console.error('Error fetching tags:', err);
      }
    };
    fetchTags();
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

  // ── Tag toggle ────────────────────────────────────────────────
  const handleToggleTag = async (tag) => {
    if (savingTag) return;
    setSavingTag(true);
    const newTags = currentTags.includes(tag)
      ? currentTags.filter(t => t !== tag)
      : [...currentTags, tag];
    try {
      await updateDoc(doc(db, 'proofs', project.id), { tags: newTags, updatedAt: serverTimestamp() });
      setCurrentTags(newTags);
    } catch (err) {
      console.error('Error updating tags:', err);
      alert('Failed to update tags. Please try again.');
    } finally {
      setSavingTag(false);
    }
  };

  // ── Invoice number ────────────────────────────────────────────
  const handleSaveInvoice = async () => {
    setSavingInvoice(true);
    try {
      await updateDoc(doc(db, 'proofs', project.id), {
        invoiceNumber: invoiceNumber.trim() || null,
        updatedAt: serverTimestamp(),
      });
      setEditingInvoice(false);
    } catch (err) {
      console.error('Error saving invoice number:', err);
      alert('Failed to save invoice number. Please try again.');
    } finally {
      setSavingInvoice(false);
    }
  };

  // ── Print specs + fulfillment + est. completion (single save) ─
  const handleSaveSpecs = async () => {
    setSavingSpecs(true);
    try {
      await updateDoc(doc(db, 'proofs', project.id), {
        printSpecs: specs,
        fulfillment: fulfillment || null,
        estimatedCompletionDate: estimatedCompletionDate || null,
        updatedAt: serverTimestamp(),
      });
      setSpecsSaved(true);
      setTimeout(() => setSpecsSaved(false), 2000);
    } catch (err) {
      console.error('Error saving specs:', err);
      alert('Failed to save details. Please try again.');
    } finally {
      setSavingSpecs(false);
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
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleAddNote();
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
    if (!showCommentBox) { setShowCommentBox(true); return; }
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
      if (newStatus === 'in_quality_control') {
        updateData.qcAddedAt = serverTimestamp();
        updateData.qcAcknowledged = false;
      }
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
      case 'ready_for_pickup': return 'text-[#0A6B6B] bg-[#DFF7F5] border-[#0A6B6B]';
      case 'out_for_delivery': return 'text-[#0A6B6B] bg-[#DFF7F5] border-[#0A6B6B]';
      case 'completed': return 'text-cesar-navy bg-[#E0EAF5] border-cesar-navy';
      default: return 'text-[#92690B] bg-[#FEF3CD] border-cesar-yellow';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'in_production': return 'In Production';
      case 'in_quality_control': return 'In Quality Control';
      case 'ready_for_pickup': return 'Ready for Pickup';
      case 'out_for_delivery': return 'Out for Delivery';
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
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return 'Unknown'; }
  };

  const formatNoteDate = (isoString) => {
    if (!isoString) return '';
    try {
      const date = new Date(isoString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    } catch { return ''; }
  };

  const formatShortDate = (dateStr) => {
    if (!dateStr) return null;
    try {
      return new Date(dateStr + 'T00:00:00').toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    } catch { return null; }
  };

  const hasRevisionHistory = revisionHistory.length > 0;
  const showRevisionSection = hasRevisionHistory || isRevision || loadingHistory;
  const hasSpecs = project.printSpecs && Object.values(project.printSpecs).some(v => v && v !== 'None' && v !== 'Full Color');
  const showProgressBar = !['declined'].includes(project.status) || true; // always show; declined gets special note

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4 overflow-hidden"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="flex items-center justify-center w-full h-full" onClick={stopPropagation}>

        {/* Main Modal */}
        <motion.div
          className="bg-white rounded-xl shadow-2xl w-full max-w-4xl max-h-[90vh] flex flex-col"
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
              {project.status === 'in_quality_control' && project.qcAcknowledged === false && (
                <span className="px-3 py-1 rounded-full text-sm font-medium bg-[#5A3695] text-white flex items-center gap-1">
                  <FlaskConical className="w-4 h-4" />
                  New in QC
                </span>
              )}
            </div>
            <button className="p-2 hover:bg-gray-100 rounded-full transition-colors flex-shrink-0" onClick={onClose}>
              <X size={24} className="text-gray-500" />
            </button>
          </div>

          {/* Scrollable content */}
          <div className="flex-1 overflow-y-auto p-6">

            {/* Progress Bar */}
            <ProgressBar status={project.status} fulfillment={project.fulfillment} />
            {project.estimatedCompletionDate && (
              <p className="text-center text-xs text-gray-500 mb-4 -mt-2">
                Estimated completion: <span className="font-medium text-gray-700">{formatShortDate(project.estimatedCompletionDate)}</span>
              </p>
            )}

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
                    <span className="px-1.5 py-0.5 bg-cesar-navy text-white text-xs rounded-full">{revisionHistory.length}</span>
                  )}
                  {showHistory ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                </button>
                {showHistory && (
                  <div className="mt-4 space-y-2">
                    {loadingHistory ? (
                      <div className="text-sm text-gray-500 p-3">Loading history...</div>
                    ) : historyError ? (
                      <div className="text-sm text-red-600 p-3 bg-red-50 rounded-lg">Could not load revision history: {historyError}</div>
                    ) : revisionHistory.length === 0 ? (
                      <div className="text-sm text-gray-500 p-3">No previous revisions</div>
                    ) : (
                      <div className="bg-gray-50 rounded-lg p-4 space-y-3">
                        {revisionHistory.map((revision) => (
                          <div key={revision.id} className="flex items-start justify-between p-3 bg-white rounded border border-gray-200">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <span className="font-medium text-gray-900">Revision {revision.revisionNumber || 1}</span>
                                <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${getStatusColor(revision.status)}`}>{revision.status}</span>
                              </div>
                              <p className="text-sm text-gray-600">{formatDate(revision.createdAt)}</p>
                              {revision.comments && <p className="text-sm text-gray-700 mt-2 italic">"{revision.comments}"</p>}
                            </div>
                            <a href={revision.fileUrl} target="_blank" rel="noopener noreferrer"
                              className="ml-4 px-3 py-1 text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 rounded transition-colors"
                              onClick={(e) => e.stopPropagation()}>View</a>
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
                <img src={project.fileUrl} alt={project.title || "Proof"} className="w-full max-h-[500px] object-contain rounded-lg border shadow-sm" />
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
                    <p className="text-gray-900">{formatDate(project.updatedAt || project.responseAt)}</p>
                  </div>
                )}
                {isRevision && (
                  <div>
                    <span className="font-medium text-gray-600">Revision:</span>
                    <p className="text-gray-900">Version {currentRevisionNumber}</p>
                  </div>
                )}

                {/* Invoice Number */}
                <div className="col-span-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-gray-600">Invoice #:</span>
                    {canEdit && !editingInvoice && (
                      <button onClick={() => setEditingInvoice(true)} className="text-gray-400 hover:text-cesar-navy transition-colors" title="Edit invoice number">
                        <Edit2 size={12} />
                      </button>
                    )}
                  </div>
                  {editingInvoice ? (
                    <div className="flex items-center gap-2 mt-1">
                      <input
                        type="text"
                        value={invoiceNumber}
                        onChange={e => setInvoiceNumber(e.target.value)}
                        onKeyDown={e => { if (e.key === 'Enter') handleSaveInvoice(); if (e.key === 'Escape') setEditingInvoice(false); }}
                        placeholder="e.g. 303241"
                        autoFocus
                        className="flex-1 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy"
                      />
                      <button onClick={handleSaveInvoice} disabled={savingInvoice} className="p-1.5 bg-cesar-navy text-white rounded-lg hover:bg-[#003070] disabled:opacity-50">
                        {savingInvoice ? <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" /> : <Check size={13} />}
                      </button>
                      <button onClick={() => setEditingInvoice(false)} className="p-1.5 text-gray-400 hover:text-gray-600"><X size={13} /></button>
                    </div>
                  ) : (
                    <p className="text-gray-900 mt-0.5">{invoiceNumber || <span className="text-gray-400 italic">Not set</span>}</p>
                  )}
                </div>
              </div>

              {/* Tags */}
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 mb-2">
                  <Tag className="w-4 h-4 text-gray-400 flex-shrink-0" />
                  <span className="text-sm font-medium text-gray-600">Tags</span>
                  {canEdit && availableTags.length > 0 && (
                    <button
                      onClick={() => setEditingTags(!editingTags)}
                      className={`ml-auto flex items-center gap-1 text-xs px-2 py-0.5 rounded-full transition-colors ${
                        editingTags ? 'bg-cesar-navy text-white' : 'text-gray-400 hover:text-cesar-navy hover:bg-gray-100'
                      }`}
                    >
                      <Edit2 size={11} />
                      {editingTags ? 'Done' : 'Edit'}
                    </button>
                  )}
                </div>
                {editingTags && canEdit ? (
                  <div className="flex flex-wrap gap-2">
                    {availableTags.map(tag => {
                      const isSelected = currentTags.includes(tag);
                      return (
                        <button
                          key={tag}
                          type="button"
                          onClick={() => handleToggleTag(tag)}
                          disabled={savingTag}
                          className={`px-3 py-1 rounded-full text-xs font-medium border transition-colors disabled:opacity-50 ${
                            isSelected ? 'bg-cesar-navy text-white border-cesar-navy' : 'bg-white text-gray-600 border-gray-300 hover:border-cesar-navy hover:text-cesar-navy'
                          }`}
                        >
                          {isSelected && <span className="mr-1">✓</span>}
                          {tag}
                        </button>
                      );
                    })}
                  </div>
                ) : (
                  currentTags.length > 0 ? (
                    <div className="flex flex-wrap gap-1.5">
                      {currentTags.map(tag => (
                        <span key={tag} className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-cesar-navy/10 text-cesar-navy">{tag}</span>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-400">No tags{canEdit ? ' — click Edit to add some' : ''}.</p>
                  )
                )}
              </div>
            </div>

            {/* Comments Section */}
            {(showCommentBox || project.comments) && (
              <div className="mb-6">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  {showCommentBox && project.status === 'pending' ? 'Reason for declining (required)' : 'Comments'}
                </label>
                {project.status === 'pending' ? (
                  <div>
                    <textarea
                      value={notes}
                      onChange={handleNotesChange}
                      placeholder="Describe what needs to be changed..."
                      className={`w-full p-3 border rounded-lg focus:ring-2 focus:ring-cesar-navy focus:border-cesar-navy resize-none ${declineError ? 'border-cesar-magenta bg-[#FCE4EC]' : 'border-gray-300'}`}
                      rows={4}
                      autoFocus={showCommentBox}
                    />
                    {declineError && (
                      <p className="mt-2 text-sm text-[#A8005A] flex items-center gap-1">
                        <AlertCircle className="w-4 h-4 flex-shrink-0" />{declineError}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                    <p className="text-gray-900">{project.comments || 'No comments provided'}</p>
                  </div>
                )}
              </div>
            )}

            {/* Notes Panel */}
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <MessageSquare className="w-4 h-4 text-gray-500" />
                <h3 className="text-sm font-semibold text-gray-700">
                  Notes
                  {proofNotes.length > 0 && (
                    <span className="ml-2 px-1.5 py-0.5 bg-gray-200 text-gray-600 text-xs rounded-full">{proofNotes.length}</span>
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
                          <span className={`px-1.5 py-0.5 rounded text-xs font-medium capitalize ${getRoleColor(note.authorRole)}`}>{note.authorRole}</span>
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
                >
                  {savingNote ? <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" /> : <Send size={16} />}
                </button>
              </div>
            </div>

            {/* Upload Revision */}
            {project.status === 'declined' && hasPermission('canUploadProofs') && (
              <div className="mb-6">
                <div className="p-4 bg-[#FEF3CD] border border-cesar-yellow/30 rounded-lg mb-4">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-medium text-[#92690B] flex items-center gap-2">
                        <AlertCircle className="w-5 h-5" />This proof was declined
                      </h4>
                      <p className="text-sm text-[#92690B] mt-1">Upload a revised version to continue the approval process</p>
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
                    <UploadProof revisionMode={true} parentProof={project} onUploadComplete={() => { setShowUploadRevision(false); onClose(); }} />
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="border-t border-gray-200 p-6 flex gap-3 rounded-b-xl bg-white flex-shrink-0 flex-wrap">
            <a href={project.fileUrl} download target="_blank" rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors">
              <Download size={16} />Download
            </a>

            {/* Details button — all roles */}
            <button
              onClick={() => setShowSpecsPanel(true)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-sm ${
                hasSpecs ? 'bg-cesar-navy/10 text-cesar-navy hover:bg-cesar-navy/20' : 'bg-gray-100 hover:bg-gray-200 text-gray-700'
              }`}
            >
              <ClipboardList size={16} />
              Details
              {hasSpecs && <span className="w-2 h-2 rounded-full bg-cesar-navy" />}
            </button>

            {project.status === 'pending' && isClient() && (
              <>
                <button onClick={handleApprove} disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-cesar-green hover:bg-[#66c23a] text-white rounded-lg transition-colors disabled:opacity-50">
                  <Check size={16} />{isLoading ? 'Approving...' : 'Approve'}
                </button>
                <button onClick={handleDecline} disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-cesar-magenta hover:bg-[#c9006a] text-white rounded-lg transition-colors disabled:opacity-50">
                  <AlertCircle size={16} />{isLoading ? 'Processing...' : (showCommentBox ? 'Submit Decline' : 'Decline')}
                </button>
              </>
            )}

            {project.status === 'approved' && hasPermission('canUploadProofs') && (
              <button onClick={() => handleAdvanceStatus('in_production')} disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-cesar-orange hover:bg-[#e55d00] text-white rounded-lg transition-colors disabled:opacity-50">
                <Factory size={16} />{isLoading ? 'Updating...' : 'Send to Production'}
              </button>
            )}

            {project.status === 'in_production' && (isAdmin() || isDesigner() || isProduction()) && (
              <button onClick={() => handleAdvanceStatus('in_quality_control')} disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-cesar-purple hover:bg-[#6a45a8] text-white rounded-lg transition-colors disabled:opacity-50">
                <FlaskConical size={16} />{isLoading ? 'Updating...' : 'Move to QC'}
              </button>
            )}

            {/* Ready for Pickup / Out for Delivery — admin/designer only, based on fulfillment */}
            {project.status === 'in_quality_control' && (isAdmin() || isDesigner()) && (
              project.fulfillment === 'delivery' ? (
                <button onClick={() => handleAdvanceStatus('out_for_delivery')} disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-[#0A6B6B] hover:bg-[#085656] text-white rounded-lg transition-colors disabled:opacity-50">
                  <Truck size={16} />{isLoading ? 'Updating...' : 'Out for Delivery'}
                </button>
              ) : (
                <button onClick={() => handleAdvanceStatus('ready_for_pickup')} disabled={isLoading}
                  className="flex items-center gap-2 px-6 py-2 bg-[#0A6B6B] hover:bg-[#085656] text-white rounded-lg transition-colors disabled:opacity-50">
                  <Store size={16} />{isLoading ? 'Updating...' : 'Ready for Pickup'}
                </button>
              )
            )}

            {(project.status === 'ready_for_pickup' || project.status === 'out_for_delivery') && hasPermission('canUploadProofs') && (
              <button onClick={() => handleAdvanceStatus('completed')} disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-cesar-navy hover:bg-[#003d73] text-white rounded-lg transition-colors disabled:opacity-50">
                <PackageCheck size={16} />{isLoading ? 'Updating...' : 'Mark Completed'}
              </button>
            )}

            {project.status === 'in_quality_control' && (isAdmin() || isDesigner()) && (
              <button onClick={() => handleAdvanceStatus('in_production')} disabled={isLoading}
                className="flex items-center gap-2 px-6 py-2 bg-cesar-orange hover:bg-[#e55d00] text-white rounded-lg transition-colors disabled:opacity-50">
                <Factory size={16} />{isLoading ? 'Updating...' : 'Return to Production'}
              </button>
            )}
          </div>
        </motion.div>

        {/* ── Print Specs Slide-out Panel ─────────────────────── */}
        <AnimatePresence>
          {showSpecsPanel && (
            <motion.div
              className="absolute right-4 top-4 bottom-4 w-96 bg-white rounded-xl shadow-2xl flex flex-col border border-gray-200 z-10"
              initial={{ x: 420, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 420, opacity: 0 }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              onClick={stopPropagation}
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-200 flex-shrink-0">
                <div className="flex items-center gap-2">
                  <ClipboardList className="w-5 h-5 text-cesar-navy" />
                  <h3 className="font-semibold text-gray-900">Print Details</h3>
                </div>
                <button onClick={() => setShowSpecsPanel(false)} className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors">
                  <X size={18} className="text-gray-500" />
                </button>
              </div>

              <div className="flex-1 overflow-y-auto p-5 space-y-4">

                {/* Fulfillment */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Fulfillment</label>
                  {canEdit ? (
                    <div className="flex gap-2">
                      {['pickup', 'delivery'].map(option => (
                        <button
                          key={option}
                          type="button"
                          onClick={() => setFulfillment(prev => prev === option ? '' : option)}
                          className={`flex-1 py-2 px-3 rounded-lg border text-xs font-medium transition-colors ${
                            fulfillment === option
                              ? 'bg-cesar-navy text-white border-cesar-navy'
                              : 'bg-white text-gray-600 border-gray-300 hover:border-cesar-navy hover:text-cesar-navy'
                          }`}
                        >
                          {option === 'pickup' ? '🏪 Pickup' : '🚚 Delivery'}
                        </button>
                      ))}
                    </div>
                  ) : (
                    <p className="text-sm text-gray-900">
                      {fulfillment === 'pickup' ? '🏪 Ready for Pickup' : fulfillment === 'delivery' ? '🚚 Out for Delivery' : <span className="text-gray-400">—</span>}
                    </p>
                  )}
                </div>

                {/* Estimated Completion Date */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Estimated Completion Date</label>
                  {canEdit ? (
                    <input
                      type="date"
                      value={estimatedCompletionDate}
                      onChange={e => setEstimatedCompletionDate(e.target.value)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {formatShortDate(estimatedCompletionDate) || <span className="text-gray-400">—</span>}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-gray-100" />

                {/* Size */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Size / Dimensions</label>
                  {canEdit ? (
                    <input
                      type="text"
                      value={specs.size}
                      onChange={e => setSpecs(s => ({ ...s, size: e.target.value }))}
                      placeholder="e.g. 24 x 36 inches"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{specs.size || <span className="text-gray-400">—</span>}</p>
                  )}
                </div>

                {/* Quantity */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Quantity</label>
                  {canEdit ? (
                    <input
                      type="number"
                      value={specs.quantity}
                      onChange={e => setSpecs(s => ({ ...s, quantity: e.target.value }))}
                      placeholder="e.g. 500"
                      min="1"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{specs.quantity || <span className="text-gray-400">—</span>}</p>
                  )}
                </div>

                {/* Material */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Material / Substrate</label>
                  {canEdit ? (
                    <input
                      type="text"
                      value={specs.material}
                      onChange={e => setSpecs(s => ({ ...s, material: e.target.value }))}
                      placeholder="e.g. Vinyl, Cardstock, Canvas"
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">{specs.material || <span className="text-gray-400">—</span>}</p>
                  )}
                </div>

                {/* Finish */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Finish</label>
                  {canEdit ? (
                    <select
                      value={specs.finish}
                      onChange={e => setSpecs(s => ({ ...s, finish: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy"
                    >
                      {FINISH_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900">{specs.finish || <span className="text-gray-400">—</span>}</p>
                  )}
                </div>

                {/* Colors */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Colors</label>
                  {canEdit ? (
                    <select
                      value={specs.colors}
                      onChange={e => setSpecs(s => ({ ...s, colors: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy"
                    >
                      {COLOR_OPTIONS.map(o => <option key={o} value={o}>{o}</option>)}
                    </select>
                  ) : (
                    <p className="text-sm text-gray-900">{specs.colors || <span className="text-gray-400">—</span>}</p>
                  )}
                </div>

                {/* Due Date (client requested) */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Client Requested Due Date</label>
                  {canEdit ? (
                    <input
                      type="date"
                      value={specs.dueDate}
                      onChange={e => setSpecs(s => ({ ...s, dueDate: e.target.value }))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy"
                    />
                  ) : (
                    <p className="text-sm text-gray-900">
                      {formatShortDate(specs.dueDate) || <span className="text-gray-400">—</span>}
                    </p>
                  )}
                </div>

                {/* Special Instructions */}
                <div>
                  <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Special Instructions</label>
                  {canEdit ? (
                    <textarea
                      value={specs.specialInstructions}
                      onChange={e => setSpecs(s => ({ ...s, specialInstructions: e.target.value }))}
                      placeholder="Any special handling, finishing, or delivery notes..."
                      rows={4}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-cesar-navy resize-none"
                    />
                  ) : (
                    <p className="text-sm text-gray-900 whitespace-pre-wrap">
                      {specs.specialInstructions || <span className="text-gray-400">—</span>}
                    </p>
                  )}
                </div>
              </div>

              {canEdit && (
                <div className="px-5 py-4 border-t border-gray-200 flex-shrink-0">
                  <button
                    onClick={handleSaveSpecs}
                    disabled={savingSpecs}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2.5 bg-cesar-navy hover:bg-[#003070] text-white rounded-lg transition-colors disabled:opacity-50 text-sm font-medium"
                  >
                    {savingSpecs ? (
                      <><div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />Saving...</>
                    ) : specsSaved ? (
                      <><Check size={16} />Saved!</>
                    ) : (
                      'Save Details'
                    )}
                  </button>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </motion.div>
  );
}