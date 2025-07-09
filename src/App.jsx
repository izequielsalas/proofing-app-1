import { Routes, Route } from 'react-router-dom';
import { AuthProvider } from './contexts/AuthContext'; // Add this import
import Auth from './components/auth';
import Dashboard from './components/dashboard';
import ProofViewer from './components/proofViewer';
import ImageGallery from './components/imageGallery';
import ProtectedRoute from './components/protectedRoute';
import CreateProfile from './components/createProfile';
import UserManagement from './components/UserManagement'; // Add if you have this component
import UnauthorizedPage from './components/UnauthorizedPage'; // Add if you have this component
import PrivateBrowsingNotice from './components/PrivateBrowsingNotice'; // Add this import
import AcceptInvitation from './components/AcceptInvitation'; // ADD THIS LINE

function App() {
  return (
    <AuthProvider> {/* Wrap everything with AuthProvider */}
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
            
            {/* Admin routes */}
            <Route
              path="/admin/users"
              element={
                <ProtectedRoute>
                  <UserManagement />
                </ProtectedRoute>
              }
            />
            
            {/* Unauthorized page */}
            <Route path="/unauthorized" element={<UnauthorizedPage />} />
          </Routes>
        </main>
        
        {/* Private Browsing Notice */}
        <PrivateBrowsingNotice />
      </div>
    </AuthProvider>
  );
}

export default App;