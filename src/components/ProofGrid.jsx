
import { useEffect, useState } from "react";
import { collection, query, orderBy, onSnapshot, doc, updateDoc, serverTimestamp } from "firebase/firestore";
import { AnimatePresence, motion } from "framer-motion";
import { db } from "../firebase";
import Modal from "./Modal";
import WorkItem from "./WorkItem"; // Reuse for visual tile

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

export default function ProofGrid() {
  const [proofs, setProofs] = useState([]);
  const [activeProof, setActiveProof] = useState(null);
  const [declineNotes, setDeclineNotes] = useState({});
  const [loadingId, setLoadingId] = useState(null);

  useEffect(() => {
    const q = query(collection(db, "proofs"), orderBy("createdAt", "desc"));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const proofData = snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() }));
      setProofs(proofData);
      console.log("proofData:", proofData);

    });
    return () => unsubscribe();
  }, []);

  const handleApprove = async (id) => {
    setLoadingId(id);
    try {
      await updateDoc(doc(db, "proofs", id), {
        status: "approved",
        responseAt: serverTimestamp(),
        notes: "",
      });
      setActiveProof(null);
    } catch (err) {
      console.error(err);
      alert("Error approving proof.");
    }
    setLoadingId(null);
  };

  const handleDecline = async (id) => {
    setLoadingId(id);
    try {
      await updateDoc(doc(db, "proofs", id), {
        status: "declined",
        responseAt: serverTimestamp(),
        notes: declineNotes[id] || "",
      });
      setActiveProof(null);
    } catch (err) {
      console.error(err);
      alert("Error declining proof.");
    }
    setLoadingId(null);
  };

  return (
    <>
      <div className="p-8 grid gap-8 grid-cols-[repeat(auto-fit,minmax(280px,1fr))]">
        {proofs.map((proof, index) => (
          <AnimatedGridItem key={proof.id} index={index}>
            <div onClick={() => setActiveProof(proof)}>
              <WorkItem title={`Proof`} fileUrl={proof.fileUrl} />
            </div>
          </AnimatedGridItem>
        ))}
      </div>

      <AnimatePresence>
        {activeProof && (
          <Modal key="modal" project={activeProof} onClose={() => setActiveProof(null)}>
            <div className="text-left text-black space-y-2">
              <p className="text-md font-medium">Status: {activeProof.status}</p>
              {activeProof.fileType === 'pdf' ? (
                <iframe
                  src={activeProof.fileUrl}
                  width="100%"
                  height="500px"
                  className="rounded bg-white"
                  title={`proof-${activeProof.id}`}
                />
              ) : (
                <img src={activeProof.fileUrl} alt="Proof" className="rounded" />
              )}
              {activeProof.status === "pending" && (
                <>
                  <textarea
                    value={declineNotes[activeProof.id] || ""}
                    onChange={(e) =>
                      setDeclineNotes((prev) => ({ ...prev, [activeProof.id]: e.target.value }))
                    }
                    placeholder="Reason for decline (optional)"
                    className="w-full p-2 border border-gray-300 rounded"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={() => handleApprove(activeProof.id)}
                      disabled={loadingId === activeProof.id}
                      className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                    >
                      Approve
                    </button>
                    <button
                      onClick={() => handleDecline(activeProof.id)}
                      disabled={loadingId === activeProof.id}
                      className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded"
                    >
                      Decline
                    </button>
                  </div>
                </>
              )}
            </div>
          </Modal>
        )}
      </AnimatePresence>
    </>
  );
}
