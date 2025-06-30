import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Modal from "./Modal";
import WorkItem from "./WorkItem";

function AnimatedGridItem({ children, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      className="fade-in"
    >
      {children}
    </motion.div>
  );
}

export default function ProofGrid({ proofs = [] }) {
  const [activeProof, setActiveProof] = useState(null);
  const [loadingId, setLoadingId] = useState(null);

  if (proofs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No proofs found</h3>
          <p className="text-gray-600">
            Upload your first proof to get started with the approval process.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-6 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {proofs.map((proof, index) => (
          <AnimatedGridItem key={proof.id} index={index}>
            <div 
              onClick={() => setActiveProof(proof)}
              className="cursor-pointer"
            >
              <WorkItem 
                title={proof.title || `Proof #${proof.id?.slice(-6)}`}
                fileUrl={proof.fileUrl}
                status={proof.status}
                clientName={proof.clientName}
                createdAt={proof.createdAt}
              />
            </div>
          </AnimatedGridItem>
        ))}
      </div>

      <AnimatePresence>
        {activeProof && (
          <Modal 
            key="modal" 
            project={activeProof} 
            onClose={() => setActiveProof(null)}
            loadingId={loadingId}
          />
        )}
      </AnimatePresence>
    </>
  );
}