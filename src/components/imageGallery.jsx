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
    <div className="mt-6">
      {imageUrls.length === 0 && <p className="text-white">Loading images...</p>}

      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
        {imageUrls.map((url, idx) => (
          <a key={idx} href={url} target="_blank" rel="noopener noreferrer">
            <img
              src={url}
              alt={`Proof ${idx + 1}`}
              loading="lazy"
              className="rounded border shadow transition-transform transform hover:scale-105"
              style={{
                width: "100%",
                height: "auto",
                objectFit: "cover",
                willChange: "transform", // GPU-accelerated
              }}
            />
          </a>
        ))}
      </div>
    </div>
  );
}
