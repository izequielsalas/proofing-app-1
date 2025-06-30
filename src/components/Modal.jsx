import { motion } from "framer-motion";
import React, { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase";
import { X, Download, Check, AlertCircle } from "lucide-react";

export default function Modal({ project, onClose }) {
  const stopPropagation = (e) => e.stopPropagation();
  const isPDF = project.fileUrl?.endsWith(".pdf");
  
  const [showCommentBox, setShowCommentBox] = useState(false);
  const [notes, setNotes] = useState("");
  const [isLoading, setIsLoading] = useState(false);

  const handleApprove = async () => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "proofs", project.id), {
        status: "approved",
        responseAt: serverTimestamp(),
        notes: notes.trim(),
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
    
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "proofs", project.id), {
        status: "declined",
        responseAt: serverTimestamp(),
        notes: notes.trim(),
      });
      onClose();
    } catch (err) {
      console.error("Error declining proof:", err);
      alert("Error declining proof. Please try again.");
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'approved': return 'text-green-600 bg-green-50 border-green-200';
      case 'declined': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-amber-600 bg-amber-50 border-amber-200';
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
        className="bg-white rounded-xl shadow-2xl max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={stopPropagation}
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.9, opacity: 0 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="sticky top-0 bg-white border-b border-gray-200 p-6 flex justify-between items-center rounded-t-xl">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold text-gray-900">
              {project.title || `Proof #${project.id?.slice(-6)}`}
            </h2>
            <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusColor(project.status)}`}>
              {project.status?.charAt(0).toUpperCase() + project.status?.slice(1)}
            </span>
          </div>
          <button
            className="p-2 hover:bg-gray-100 rounded-full transition-colors"
            onClick={onClose}
          >
            <X size={24} className="text-gray-500" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* File Display */}
          <div className="mb-6">
            {isPDF ? (
              <iframe
                src={project.fileUrl}
                className="w-full h-[600px] rounded-lg border shadow-sm"
                title={`proof-${project.id}`}
              />
            ) : (
              <img
                src={project.fileUrl}
                alt={project.title || "Proof"}
                className="w-full max-h-[600px] object-contain rounded-lg border shadow-sm"
              />
            )}
          </div>

          {/* Proof Details */}
          <div className="mb-6 p-4 bg-gray-50 rounded-lg">
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="font-medium text-gray-600">Created:</span>
                <p className="text-gray-900">
                  {project.createdAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                </p>
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
              {project.responseAt && (
                <div>
                  <span className="font-medium text-gray-600">Response Date:</span>
                  <p className="text-gray-900">
                    {project.responseAt?.toDate?.()?.toLocaleDateString() || 'Unknown'}
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Comments Section */}
          {(showCommentBox || project.notes) && (
            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Comments {project.status === 'pending' && '(optional)'}
              </label>
              {project.status === 'pending' ? (
                <textarea
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder="Add comments, change requests, or approval notes..."
                  className="w-full p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 resize-none"
                  rows={4}
                />
              ) : (
                <div className="p-3 bg-gray-50 border border-gray-200 rounded-lg">
                  <p className="text-gray-900">{project.notes || 'No comments provided'}</p>
                </div>
              )}
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-3 pt-4 border-t border-gray-200">
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
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}