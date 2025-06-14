import { useRef, useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { storage, db } from '../firebase';

export default function UploadProof() {
  const [fileUpload, setFileUpload] = useState(null);
  const fileInputRef = useRef();

  const uploadFile = async () => {
    if (!fileUpload) return alert('Select a file first');
    
    if (fileUpload.type !== 'application/pdf') {
      return alert('Only PDF files are allowed.');
    }

    const filesFolderRef = ref(storage, `proofFiles/${fileUpload.name}`);

    try {
      // Upload to Firebase Storage
      await uploadBytes(filesFolderRef, fileUpload);
      const downloadURL = await getDownloadURL(filesFolderRef);

      // Add metadata to Firestore
      await addDoc(collection(db, 'proofs'), {
        fileUrl: downloadURL,
        fileType: 'pdf',
        status: 'pending',
        createdAt: serverTimestamp(),
      });

      alert('Upload complete!');
      setFileUpload(null);
      fileInputRef.current.value = '';
    } catch (err) {
      console.error(err);
      alert('Upload failed.');
    }
  };

  return (
    <div className="bg-charcoal p-4 rounded text-navy mb-6">
      <h3 className="mb-2 font-semibold">Upload a Proof</h3>

      <div className="flex items-center gap-4">
        {/* Hidden PDF-only file input */}
        <input
          type="file"
          accept="application/pdf"
          ref={fileInputRef}
          onChange={(e) => setFileUpload(e.target.files[0])}
          className="hidden"
        />

        {/* Custom "Choose File" button */}
        <button
          onClick={() => fileInputRef.current.click()}
          
        >
          Choose PDF
        </button>

        {/* Upload button */}
        <button
          onClick={uploadFile}
          
        >
          Upload File
        </button>

        {/* Optional: Show selected file name */}
        {fileUpload && <span className="text-sm text-navy">{fileUpload.name}</span>}
      </div>
    </div>
  );
}
