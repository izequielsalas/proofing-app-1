import { useEffect, useState } from 'react';
import { ref, uploadBytes, getDownloadURL, listAll } from 'firebase/storage';
import { addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { storage, db, auth } from '../firebase';
import { v4 } from "uuid";


export default function ProofViewer({ url, type }) {
  const [imageList, setImageList] = useState([]);

  const imageListRef = ref(storage, "proofFiles/");

 /* useEffect(() => {
    listAll(imageListRef).then((response) => {
      console.log(response);
      response.items.forEach((item) => {
        getDownloadURL(item).then((url) => {
          setImageList((prev) => [...prev, url]);
        })
      })
    });
  }, []);
*/



  return (
    <div className="mb-4 p-4 bg-charcoal rounded shadow-md">
      {type === 'pdf' ? (
        <a href={url} target="_blank" rel="noopener noreferrer" className="text-blue-300 underline">
          View PDF
        </a>
      ) : (
        <img src={url} alt="Proof" className="max-w-full h-auto rounded border border-grey" />
      )}
    </div>
  );
}
