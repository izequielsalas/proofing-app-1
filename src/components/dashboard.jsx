import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { collection, onSnapshot, query, orderBy } from 'firebase/firestore';
import { auth, db } from '../firebase';
import UploadProof from './UploadProof';
import ProofViewer from './ProofViewer';

export default function Dashboard() {
  const [user, setUser] = useState(null);
  const [proofs, setProofs] = useState([]);

  useEffect(() => {
    const unsubAuth = onAuthStateChanged(auth, setUser);
    return unsubAuth;
  }, []);

  useEffect(() => {
    const q = query(collection(db, 'proofs'), orderBy('createdAt', 'desc'));
    const unsub = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => ({ ...doc.data(), id: doc.id }));
      setProofs(data);
    });
    return unsub;
  }, []);

  if (!user) return <p className="text-navy">Not logged in</p>;

  return (
    <div className="bg-grey p-6 rounded text-navy">
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-xl font-bold">Welcome, {user.email}</h2>
        <button onClick={() => signOut(auth)} className="bg-navy px-4 py-2 rounded">Logout</button>
      </div>
      <UploadProof />
      {proofs.map((proof) => (
        <ProofViewer key={proof.id} url={proof.url} type={proof.type} />
      ))}
    </div>
  );
}
