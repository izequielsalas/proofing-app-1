import { useState } from 'react';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '../firebase';


export default function UploadProof() {
  const [file, setFile] = useState(null);

  //file upload state
  const[fileUpload, setFileUpload] = useState(null);

  /*const handleUpload = async () => {
    if (!file) return alert('Select a file first');
    console.log(file.type.name);
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
  */

    //upload file funct
    const uploadFile = async () => {
      if (!fileUpload) return alert('Select a file first');
      console.log(fileUpload.type.name);
  
      const filesFolderRef = ref(storage, `proofFiles/${fileUpload.name}`);
  
      try {
        await uploadBytes(filesFolderRef, fileUpload);
  
      } catch (err) {
        console.error(err);
      }
      
  
    };

  return (
    <div className="bg-charcoal p-4 rounded text-navy mb-6">
      <h3 className="mb-2 font-semibold">Upload a Proof</h3>
      

      <div>
        <input 
        type="file"
        onChange={(e) => setFileUpload(e.target.files[0])}
        ></input>
        <button onClick={(e) => uploadFile(e)}>Upload File</button>
      </div>
    </div>
  );
}
