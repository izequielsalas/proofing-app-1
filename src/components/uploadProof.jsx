import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '../firebase';

export default function UploadProof() {
  const [file, setFile] = useState(null);

  const handleUpload = async () => {
    if (!file) return alert('Select a file first');

    const fileRef = ref(storage, `proofs/${file.name}`);
    await uploadBytes(fileRef, file);
    const url = await getDownloadURL(fileRef);

    await addDoc(collection(db, 'proofs'), {
      url,
      type: file.type.includes('pdf') ? 'pdf' : 'jpg',
      client: 'Example Client',
      status: 'pending',
      createdAt: serverTimestamp(),
      uploadedBy: auth.currentUser.email,
    });

    alert('Upload complete!');
  };

  return (
    <div className="bg-charcoal p-4 rounded text-navy mb-6">
      <h3 className="mb-2 font-semibold">Upload a Proof</h3>
      <input
        type="file"
        accept=".jpg,.jpeg,.png,.pdf"
        onChange={(e) => setFile(e.target.files[0])}
        className="block mb-2"
      />
      <button
        onClick={handleUpload}
        className="bg-navy px-4 py-2 rounded hover:bg-opacity-90"
      >
        Upload
      </button>
    </div>
  );
}
