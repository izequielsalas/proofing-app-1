import { useRef, useState } from 'react';
import { ref, uploadBytes } from 'firebase/storage';
import { storage } from '../firebase';

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
      await uploadBytes(filesFolderRef, fileUpload);
      alert('Upload complete!');
    } catch (err) {
      console.error(err);
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
