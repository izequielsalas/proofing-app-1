import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext';
import Auth from './components/auth';
import Dashboard from './components/dashboard';
import ProofViewer from './components/proofViewer';
import ImageGallery from './components/imageGallery';
import ProtectedRoute from './components/protectedRoute';
import UserManagement from './components/UserManagement';
import UnauthorizedPage from './components/UnauthorizedPage';
import PrivateBrowsingNotice from './components/PrivateBrowsingNotice';
import AcceptInvitation from './components/AcceptInvitation';
import AdminProofs from './components/AdminProofs';

function App() {
  return (
    <AuthProvider>
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
            <Route path="/accept-invitation" element={<AcceptInvitation />} />

            {/* Protected routes */}
            <Route path="/dashboard" element={<ProtectedRoute><Dashboard /></ProtectedRoute>} />
            <Route path="/gallery" element={<ProtectedRoute><ImageGallery /></ProtectedRoute>} />
            <Route path="/proof/:id" element={<ProtectedRoute><ProofViewer /></ProtectedRoute>} />
            <Route path="/admin/proofs" element={<ProtectedRoute><AdminProofs /></ProtectedRoute>} />

            {/* Admin routes */}
            <Route path="/admin/users" element={<ProtectedRoute><UserManagement /></ProtectedRoute>} />

            {/* Unauthorized page */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Routes>
        </main>

        <PrivateBrowsingNotice />
      </div>
    </AuthProvider>
  );
}

export default App;