import { useState } from 'react';
import { auth } from '../firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

export default function Auth() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const signUp = () => createUserWithEmailAndPassword(auth, email, password);
  const signIn = () => signInWithEmailAndPassword(auth, email, password);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
      <div className="bg-white shadow-lg rounded-xl p-8 w-full max-w-md">
        <h2 className="text-2xl font-bold text-navy mb-6 text-center">
          Login or Register
        </h2>

        <input
          type="email"
          placeholder="Email"
          className="w-full p-3 mb-4 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-navy"
          onChange={(e) => setEmail(e.target.value)}
        />

        <input
          type="password"
          placeholder="Password"
          className="w-full p-3 mb-6 border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-navy"
          onChange={(e) => setPassword(e.target.value)}
        />

        <div className="flex flex-col gap-3">
          
          <button
            onClick={signUp}
            className="bg-navy text-navy"
          >
            Register
          </button>
          <button
            onClick={signIn}
            className="border border-navy text-navy py-3 rounded hover:bg-navy hover:text-navy transition"
          >
            Login
          </button>
          
          
        </div>
      </div>
    </div>
  );
}
