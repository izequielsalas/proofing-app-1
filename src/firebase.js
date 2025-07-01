// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics, isSupported } from "firebase/analytics";
import { getFirestore, connectFirestoreEmulator, enableNetwork, disableNetwork } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth, setPersistence, browserLocalPersistence, browserSessionPersistence } from "firebase/auth";


// Your web app's Firebase configuration
<<<<<<< HEAD
const firebaseConfig = {
 apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: "proofingapp1.firebaseapp.com",
  projectId: "proofingapp1",
  storageBucket: "proofingapp1.firebasestorage.app",
  messagingSenderId: "242269508692",
  appId: "1:242269508692:web:33da52e1b18d235a5009c1",
  measurementId: "G-915HDLWE8N"
};
=======
const firebaseConfig = {*};
>>>>>>> b1a40d0d735285e5ad535a668900c823c4fdf722

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Analytics only if supported (not in private browsing)
let analytics = null;
isSupported().then((supported) => {
  if (supported) {
    analytics = getAnalytics(app);
  }
}).catch((error) => {
  console.warn('Analytics not supported:', error);
});

// Initialize Auth with appropriate persistence
export const auth = getAuth(app);

// Set auth persistence based on private browsing capability
const initAuthPersistence = async () => {
  try {
    // Try local persistence first (normal browsing)
    await setPersistence(auth, browserLocalPersistence);
  } catch (error) {
    try {
      // Fallback to session persistence (private browsing)
      await setPersistence(auth, browserSessionPersistence);
      console.warn('Using session persistence due to private browsing mode');
    } catch (sessionError) {
      console.error('Failed to set auth persistence:', sessionError);
    }
  }
};

// Initialize persistence
initAuthPersistence();

// Initialize Firestore with error handling for private browsing
export const db = getFirestore(app);

// Handle Firestore network issues in private browsing
const handleFirestoreConnection = async () => {
  try {
    await enableNetwork(db);
  } catch (error) {
    console.warn('Firestore network connection issue (likely private browsing):', error);
    // Try to disable and re-enable network
    try {
      await disableNetwork(db);
      await enableNetwork(db);
    } catch (retryError) {
      console.error('Failed to establish Firestore connection:', retryError);
    }
  }
};

// Initialize storage
export const storage = getStorage(app);

// Export the app and analytics
export { app, analytics };

// Utility function to check if we're in private browsing
export const isPrivateBrowsing = () => {
  return new Promise((resolve) => {
    const test = () => {
      try {
        const storage = window.localStorage;
        const testKey = '__test__';
        storage.setItem(testKey, 'test');
        storage.removeItem(testKey);
        resolve(false); // Not private browsing
      } catch {
        resolve(true); // Private browsing
      }
    };
    
    // For Safari
    if (navigator.userAgent.includes('Safari') && !navigator.userAgent.includes('Chrome')) {
      try {
        window.openDatabase(null, null, null, null);
        resolve(false);
      } catch {
        resolve(true);
      }
    } else {
      test();
    }
  });
};

// Initialize Firestore connection
handleFirestoreConnection();
