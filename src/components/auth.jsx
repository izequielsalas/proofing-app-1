import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { useNavigate, useLocation } from 'react-router-dom';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const navigate = useNavigate();
  const location = useLocation();

  // Show any error passed via navigation state (e.g. from ProtectedRoute)
  useEffect(() => {
    if (location.state?.error) {
      setError(location.state.error);
      // Clear state so it doesn't persist on refresh
      window.history.replaceState({}, document.title);
    }
  }, [location.state]);

  // Redirect if already signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const signIn = async () => {
    if (!email || !password) return setError('Please fill in all fields');
    setLoading(true);
    setError('');

    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigate triggers via onAuthStateChanged
    } catch (err) {
      console.error('Login error:', err.message);
      if (err.code === 'auth/user-not-found' || err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
        setError('Invalid email or password. Please try again.');
      } else {
        setError(`Login failed: ${err.message}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-xl rounded-xl p-8 w-full max-w-md">

        {/* Header */}
        <div className="text-center mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome to Cesar Graphics
          </h2>
          <p className="text-gray-600">Sign in to your account</p>
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-[#FCE4EC] text-[#A8005A] rounded-lg text-sm">
            {error}
          </div>
        )}

        {/* Form */}
        <form onSubmit={(e) => e.preventDefault()} className="space-y-4">
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
              Email Address
            </label>
            <input
              id="email"
              type="email"
              placeholder="your@email.com"
              className="input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div>
            <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
              Password
            </label>
            <input
              id="password"
              type="password"
              placeholder="Enter your password"
              className="input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              disabled={loading}
              required
            />
          </div>

          <div className="pt-4">
            <button
              type="submit"
              onClick={signIn}
              disabled={loading}
              className={`btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
            >
              {loading ? 'Signing In...' : 'Sign In'}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Don't have an account? Contact Cesar Graphics for an invitation.
          </p>
        </div>
      </div>
    </div>
  );
}