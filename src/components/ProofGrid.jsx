import { useState, useMemo } from "react";
import { AnimatePresence, motion } from "framer-motion";
import Modal from "./Modal";
import WorkItem from "./WorkItem";
import { Layers, FileText } from "lucide-react";

// ─── Grouping ─────────────────────────────────────────────────────────────────
function groupProofsByChain(proofs) {
  const chainMap = new Map();

  proofs.forEach((proof) => {
    const chainKey = proof.revisionChainId || proof.id;
    if (!chainMap.has(chainKey)) chainMap.set(chainKey, []);
    chainMap.get(chainKey).push(proof);
  });

  chainMap.forEach((group) => {
    group.sort((a, b) => {
      const aRev = a.revisionNumber ?? 0;
      const bRev = b.revisionNumber ?? 0;
      if (bRev !== aRev) return bRev - aRev;
      const aTime = a.createdAt?.toDate?.() ?? new Date(0);
      const bTime = b.createdAt?.toDate?.() ?? new Date(0);
      return bTime - aTime;
    });
  });

  return Array.from(chainMap.values());
}

// ─── Revision thumbnail (used for the cards peeking behind) ──────────────────
function RevisionThumbnail({ proof }) {
  const isPDF = proof?.fileUrl?.endsWith(".pdf");

  if (!proof?.fileUrl) {
    return <div className="w-full h-full bg-gray-200" />;
  }

  if (isPDF) {
    return (
      <div className="w-full h-full flex items-center justify-center bg-red-50">
        <FileText className="w-8 h-8 text-red-400" />
      </div>
    );
  }

  return (
    <img
      src={proof.fileUrl}
      alt="Previous revision"
      className="w-full h-full object-cover opacity-80"
      onError={(e) => {
        e.target.style.display = "none";
        e.target.nextElementSibling.style.display = "flex";
      }}
    />
  );
}

// ─── Stacked card ─────────────────────────────────────────────────────────────
function StackedCard({ group, onOpen }) {
  const latest = group[0];
  const revisionCount = group.length;
  const hasStack = revisionCount > 1;

  return (
    <div
      className="relative cursor-pointer group"
      onClick={() => onOpen(latest)}
      style={{ paddingBottom: hasStack ? "14px" : 0, paddingRight: hasStack ? "14px" : 0 }}
    >
      {/* Layer 2 — furthest back, shows oldest revision thumbnail (3+ versions only) */}
      {revisionCount >= 3 && (
        <div
          className="absolute inset-0 rounded-xl border-2 border-gray-300 overflow-hidden transition-transform duration-200 ease-out group-hover:translate-x-4 group-hover:translate-y-4"
          style={{ transform: "translate(12px, 12px)" }}
        >
          <RevisionThumbnail proof={group[group.length - 1]} />
        </div>
      )}

      {/* Layer 1 — shows the revision just behind the latest */}
      {hasStack && (
        <div
          className="absolute inset-0 rounded-xl border-2 border-gray-300 overflow-hidden transition-transform duration-200 ease-out group-hover:translate-x-2 group-hover:translate-y-2"
          style={{ transform: "translate(6px, 6px)" }}
        >
          <RevisionThumbnail proof={group[1]} />
        </div>
      )}

      {/* Front card — lifts on hover */}
      <div
        className="relative transition-transform duration-200 ease-out group-hover:-translate-y-1 group-hover:shadow-xl"
        style={{ zIndex: 2 }}
      >
        <WorkItem
          title={latest.title || `Proof #${latest.id?.slice(-6)}`}
          fileUrl={latest.fileUrl}
          status={latest.status}
          clientName={latest.clientName}
          createdAt={latest.createdAt}
          revisionNumber={latest.revisionNumber}
          parentProofId={latest.parentProofId}
        />
      </div>

      {/* Versions pill */}
      {hasStack && (
        <div
          className="absolute bottom-5 left-0 flex items-center gap-1 bg-white border border-gray-300 rounded-full px-2.5 py-1 shadow-md transition-transform duration-200 ease-out group-hover:-translate-y-1"
          style={{ zIndex: 3 }}
        >
          <Layers className="w-3 h-3 text-cesar-navy" />
          <span className="text-xs text-cesar-navy font-semibold">
            {revisionCount} versions
          </span>
        </div>
      )}
    </div>
  );
}

// ─── Animated grid wrapper ────────────────────────────────────────────────────
function AnimatedGridItem({ children, index }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
    >
      {children}
    </motion.div>
  );
}

// ─── Main export ──────────────────────────────────────────────────────────────
export default function ProofGrid({ proofs = [] }) {
  const [activeProof, setActiveProof] = useState(null);

  const groups = useMemo(() => groupProofsByChain(proofs), [proofs]);

  if (proofs.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="max-w-md mx-auto">
          <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
            <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">No proofs found</h3>
          <p className="text-gray-600">Upload your first proof to get started with the approval process.</p>
        </div>
      </div>
    );
  }

  return (
    <>
      <div className="grid gap-8 grid-cols-[repeat(auto-fit,minmax(300px,1fr))]">
        {groups.map((group, index) => (
          <AnimatedGridItem key={group[0].revisionChainId || group[0].id} index={index}>
            <StackedCard group={group} onOpen={setActiveProof} />
          </AnimatedGridItem>
        ))}
      </div>

      <AnimatePresence>
        {activeProof && (
          <Modal
            key="modal"
            project={activeProof}
            onClose={() => setActiveProof(null)}
          />
        )}
      </AnimatePresence>
    </>
  );
}