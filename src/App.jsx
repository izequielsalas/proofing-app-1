import { Routes, Route } from 'react-router-dom';
import Auth from './components/auth';                    // ✅ Fixed: lowercase
import Dashboard from './components/dashboard';          // ✅ Fixed: lowercase
import ProofViewer from './components/proofViewer';      // ✅ Fixed: camelCase
import ImageGallery from './components/imageGallery';    // ✅ Fixed: camelCase
import ProtectedRoute from './components/protectedRoute'; // ✅ Fixed: camelCase
import CreateProfile from './components/createProfile';   // ✅ Fixed: camelCase

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="header-gradient text-white py-6 shadow-lg">
        <h1 className="text-3xl font-bold text-center">
          Cesar Graphics - Proofing Portal
        </h1>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <Routes>
          {/* Public routes */}
          <Route path="/" element={<Auth />} />
          <Route path="/auth" element={<Auth />} />
          
          {/* Protected routes */}
          <Route
            path="/dashboard"
            element={
              <ProtectedRoute>
                <Dashboard />
              </ProtectedRoute>
            }
          />
          <Route
            path="/gallery"
            element={
              <ProtectedRoute>
                <ImageGallery />
              </ProtectedRoute>
            }
          />
          <Route
            path="/proof/:id"
            element={
              <ProtectedRoute>
                <ProofViewer />
              </ProtectedRoute>
            }
          />
          <Route
            path="/createProfile"
            element={
              <ProtectedRoute>
                <CreateProfile />
              </ProtectedRoute>
            }
          />
        </Routes>
      </main>
    </div>
  );
}

export default App;