import { useState, useEffect } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  onAuthStateChanged,
} from 'firebase/auth';
import { useNavigate } from 'react-router-dom';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [mode, setMode] = useState('login'); // 'login' or 'register'
  const navigate = useNavigate();

  // Redirect if already signed in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        navigate('/dashboard');
      }
    });
    return () => unsubscribe();
  }, [navigate]);

  const signUp = async () => {
    if (!email || !password) return alert('Please fill in all fields');
    setLoading(true);
    
    try {
      await createUserWithEmailAndPassword(auth, email, password);
      navigate('/createProfile');
    } catch (err) {
      console.error("Registration error:", err.message);
      alert(`Registration failed: ${err.message}`);
    } finally {
      setLoading(false);
    }
  };

  const signIn = async () => {
    if (!email || !password) return alert('Please fill in all fields');
    setLoading(true);
    
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // Navigate will trigger via onAuthStateChanged
    } catch (err) {
      console.error("Login error:", err.message);
      alert(`Login failed: ${err.message}`);
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
          <p className="text-gray-600">
            {mode === 'login' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

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

          {/* Action Buttons */}
          <div className="space-y-3 pt-4">
            {mode === 'login' ? (
              <>
                <button
                  type="submit"
                  onClick={signIn}
                  disabled={loading}
                  className={`btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
                >
                  {loading ? 'Signing In...' : 'Sign In'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setMode('register')}
                  disabled={loading}
                  className="btn-secondary btn-full"
                >
                  Need an account? Register
                </button>
              </>
            ) : (
              <>
                <button
                  type="submit"
                  onClick={signUp}
                  disabled={loading}
                  className={`btn-primary btn-full ${loading ? 'btn-loading' : ''}`}
                >
                  {loading ? 'Creating Account...' : 'Create Account'}
                </button>
                
                <button
                  type="button"
                  onClick={() => setMode('login')}
                  disabled={loading}
                  className="btn-secondary btn-full"
                >
                  Already have an account? Sign In
                </button>
              </>
            )}
          </div>
        </form>

        {/* Footer */}
        <div className="mt-8 pt-6 border-t border-gray-200 text-center">
          <p className="text-xs text-gray-500">
            Secure proof approval system for print professionals
          </p>
        </div>
      </div>
    </div>
  );
}