// src/components/ImageGallery.jsx
import React, { useEffect, useState } from 'react';
import { getDownloadURL, listAll, ref } from 'firebase/storage';
import { storage } from '../firebase';

export default function ImageGallery({ folderPath = "proofFiles" }) {
  const [imageUrls, setImageUrls] = useState([]);

  useEffect(() => {
    const fetchImages = async () => {
      try {
        const listRef = ref(storage, folderPath);
        const result = await listAll(listRef);

        const urls = await Promise.all(
          result.items.map((itemRef) => getDownloadURL(itemRef))
        );

        setImageUrls(urls);
      } catch (error) {
        console.error("Error fetching images:", error);
      }
    };

    fetchImages();
  }, [folderPath]);

  return (
    <div className="image-gallery">
      {imageUrls.length === 0 && <p>Loading images...</p>}
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem" }}>
        {imageUrls.map((url, idx) => (
          <img
            key={idx}
            src={url}
            alt={`Image ${idx + 1}`}
            style={{ width: "200px", height: "auto", objectFit: "cover" }}
          />
        ))}
      </div>
    </div>
  );
}
