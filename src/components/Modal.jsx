import { motion } from "framer-motion";
import React, { useState } from "react";
import { doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { db } from "../firebase"; // adjust if needed

import { X } from "lucide-react";

export default function Modal({ project, onClose }) {
  const stopPropagation = (e) => e.stopPropagation();
  const isPDF = project.fileUrl?.endsWith(".pdf");

  const [showCommentBox, setShowCommentBox] = useState(false);
  const [notes, setNotes] = useState("");


const onDecline = async (id, notes = "") => {
  setLoadingId(id);
  try {
    await updateDoc(doc(db, "proofs", id), {
      status: "declined",
      responseAt: serverTimestamp(),
      notes: notes.trim(), // optional: remove leading/trailing whitespace
    });
    setActiveProof(null);
  } catch (err) {
    console.error(err);
    alert("Error declining proof.");
  }
  setLoadingId(null);
};
 

  return (
    <motion.div
      className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center z-50"
      onClick={onClose}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.4, ease: "easeInOut" }}
    >
      <motion.div
        className="bg-white rounded-xl shadow-xl max-w-3xl w-full p-6 relative"
        onClick={stopPropagation}
        initial={{ scale: 0.95, y: 50, opacity: 0 }}
        animate={{ scale: 1, y: 0, opacity: 1 }}
        exit={{ scale: 0.8, y: 100, opacity: 0 }}
        transition={{ duration: 0.4, ease: "easeInOut" }}
      >
        <button
          className="absolute top-4 right-4 text-gray-500 hover:text-black"
          onClick={onClose}
        >
          <X size={24} />
        </button>

        {isPDF ? (
          <iframe
            src={project.fileUrl}
            className="w-full aspect-[11/8.5] rounded-lg mb-4"
            title={`proof-${project.id}`}
          />
        ) : (
          <img
            src={project.fileUrl}
            alt={project.title || "Proof image"}
            className="w-full aspect-[11/8.5] rounded-lg mb-4"
          />
        )}

        <h2 className="text-2xl font-bold mb-2">{project.title || "Proof"}</h2>
        <p className="text-gray-700">
          This is where you can add more details about the project — description,
          tools used, links, etc.
        </p>


        <div className="flex gap-3 mb-4">
          <a
            href={project.fileUrl}
            download
            target="_blank"
            rel="noopener noreferrer"
            className="button"
          >
            Download Proof
          </a>          
          <button
            className="px-4 py-2 rounded"
            onClick={() => onApprove(project.id, notes)}
          >
            Approve
          </button>
          <button
            onClick={() => {
              if (!showCommentBox) {
                setShowCommentBox(true);
              } else {
                onDecline(project.id, notes); // pass notes here
              }
            }}
            className="px-4 py-2 rounded"
          >
            {showCommentBox ? "Submit Decline" : "Decline"}
          </button>

        </div>

        {showCommentBox && (
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Leave comments or change requests..."
            className="w-full p-3 border border-gray-300 rounded mb-4 resize-none"
            rows={4}
          />
        )}

        

      </motion.div>
    </motion.div>
  );
}
