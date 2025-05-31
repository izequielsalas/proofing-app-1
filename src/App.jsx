import { Routes, Route } from 'react-router-dom';
import Auth from './components/Auth';
import Dashboard from './components/Dashboard';
import ProofViewer from './components/ProofViewer';
import ImageGallery from './components/ImageGallery';
import ProtectedRoute from './components/ProtectedRoute';
import CreateProfile from './components/createProfile';

function App() {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-800">
      <header className="bg-navy text-navy py-6 shadow">
        <h1 className="text-3xl font-bold text-center">
          Printshop Proofing App
        </h1>
      </header>

      <main className="max-w-4xl mx-auto p-6">
        <Routes>
        <Route path="/auth" element={<Auth />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <Dashboard />
            </ProtectedRoute>
          }
        />
          <Route path="/" element={<Auth />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/gallery" element={<ImageGallery />} />
          <Route path="/proof/:id" element={<ProofViewer />} />
          <Route path="/createProfile" element={<CreateProfile />} />
        </Routes>
      </main>
    </div>
  );
}

export default App;
