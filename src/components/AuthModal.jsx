import React, { useState } from 'react';
import { 
  signInWithPopup, 
  createUserWithEmailAndPassword, 
  signInWithEmailAndPassword 
} from 'firebase/auth';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { auth, googleProvider, db } from '../firebase'; // Make sure db is exported from your firebase config
import { useAuth } from '../context/AuthContext';

const AuthModal = ({ onClose }) => {
  const { login } = useAuth();
  const [view, setView] = useState('login');
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  // States for login
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');

  // States for register
  const [fullName, setFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [username, setUsername] = useState('');
  const [regPassword, setRegPassword] = useState('');

  // Helper function to store user data in Firestore
  const storeUserData = async (userId, userData) => {
    try {
      const userRef = doc(db, 'users', userId);
      await setDoc(userRef, {
        ...userData,
        createdAt: new Date(),
        updatedAt: new Date()
      });
    } catch (err) {
      console.error("Error storing user data:", err);
      throw err;
    }
  };

  // Helper function to check if username exists
  const checkUsernameExists = async (username) => {
    const usersRef = doc(db, 'usernames', username);
    const docSnap = await getDoc(usersRef);
    return docSnap.exists();
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      setError(null);
      const result = await signInWithPopup(auth, googleProvider);
      
      // Check if user exists in Firestore
      const userRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(userRef);
      
      if (!docSnap.exists()) {
        // New user - store their data
        await storeUserData(result.user.uid, {
          name: result.user.displayName,
          email: result.user.email,
          photoURL: result.user.photoURL,
          username: result.user.email.split('@')[0], // Default username
          provider: 'google'
        });
      }
      
      login({
        uid: result.user.uid,
        name: result.user.displayName,
        email: result.user.email,
        photoURL: result.user.photoURL
      });
      onClose();
    } catch (error) {
      console.error("Google Login Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      const userCredential = await signInWithEmailAndPassword(
        auth, 
        loginEmail, 
        loginPassword
      );
      
      // Get user data from Firestore
      const userRef = doc(db, 'users', userCredential.user.uid);
      const docSnap = await getDoc(userRef);
      
      if (docSnap.exists()) {
        login({
          uid: userCredential.user.uid,
          ...docSnap.data()
        });
        onClose();
      } else {
        setError("User data not found");
      }
    } catch (error) {
      console.error("Login Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      // Check if username is available
      const usernameExists = await checkUsernameExists(username);
      if (usernameExists) {
        throw new Error('Username already taken');
      }
      
      // Create auth user
      const userCredential = await createUserWithEmailAndPassword(
        auth,
        regEmail,
        regPassword
      );
      
      // Store additional user data in Firestore
      await storeUserData(userCredential.user.uid, {
        name: fullName,
        email: regEmail,
        username: username,
        photoURL: '', // Default empty photo
        provider: 'email'
      });
      
      // Reserve username
      const usernameRef = doc(db, 'usernames', username);
      await setDoc(usernameRef, { userId: userCredential.user.uid });
      
      login({
        uid: userCredential.user.uid,
        name: fullName,
        email: regEmail,
        username: username
      });
      onClose();
    } catch (error) {
      console.error("Registration Error:", error);
      setError(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">

        {/* Close button */}
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-700"
          disabled={loading}
        >
          ✕
        </button>

        {/* Logo */}
        <div className="flex justify-center mb-4">
          <img src="https://i.postimg.cc/1z0rrrhr/logo-black.png" alt="logo" />
        </div>

        {/* Error message */}
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-lg text-sm">
            {error}
          </div>
        )}

        {view === 'login' ? (
          <>
            <h2 className="text-lg font-bold text-center">Selamat datang di Second STAR</h2>
            <p className="text-sm text-center mt-1">
              Belum punya akun?{' '}
              <button
                onClick={() => setView('register')}
                className="text-[#bd2c30] hover:underline"
                disabled={loading}
              >
                Daftar
              </button>
            </p>

            {/* Google login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 border rounded-lg hover:bg-gray-100 transition"
              disabled={loading}
            >
              <img
                src="https://www.svgrepo.com/show/355037/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              {loading ? 'Memproses...' : 'Masuk lewat Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="px-3 text-gray-500 text-sm">atau</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Login form */}
            <form onSubmit={handleLogin}>
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 border rounded-lg mb-3 focus:outline-none focus:border-blue-500"
                value={loginEmail}
                onChange={(e) => setLoginEmail(e.target.value)}
                required
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password"
                className="w-full p-3 border rounded-lg mb-2 focus:outline-none focus:border-blue-500"
                value={loginPassword}
                onChange={(e) => setLoginPassword(e.target.value)}
                required
                disabled={loading}
              />
              <div className="text-right mb-4">
                <button 
                  type="button" 
                  className="text-sm text-[#bd2c30] hover:underline"
                  disabled={loading}
                >
                  Lupa password?
                </button>
              </div>
              <button
                type="submit"
                className="w-full py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition"
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Login'}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="text-lg font-bold text-center">
              Daftar buat jual beli baju Second STAR!
            </h2>
            <p className="text-sm text-center mt-1">
              Sudah punya akun?{' '}
              <button
                onClick={() => setView('login')}
                className="text-[#bd2c30] hover:underline"
                disabled={loading}
              >
                Masuk
              </button>
            </p>

            {/* Google login */}
            <button
              type="button"
              onClick={handleGoogleLogin}
              className="mt-5 w-full flex items-center justify-center gap-2 py-3 border rounded-lg hover:bg-gray-100 transition"
              disabled={loading}
            >
              <img
                src="https://www.svgrepo.com/show/355037/google.svg"
                alt="Google"
                className="w-5 h-5"
              />
              {loading ? 'Memproses...' : 'Masuk lewat Google'}
            </button>

            {/* Divider */}
            <div className="flex items-center my-4">
              <div className="flex-1 h-px bg-gray-300"></div>
              <span className="px-3 text-gray-500 text-sm">atau</span>
              <div className="flex-1 h-px bg-gray-300"></div>
            </div>

            {/* Register form */}
            <form onSubmit={handleRegister}>
              <input
                type="text"
                placeholder="Nama lengkap"
                className="w-full p-3 border rounded-lg mb-3 focus:outline-none focus:border-blue-500"
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                required
                disabled={loading}
              />
              <input
                type="email"
                placeholder="Email"
                className="w-full p-3 border rounded-lg mb-3 focus:outline-none focus:border-blue-500"
                value={regEmail}
                onChange={(e) => setRegEmail(e.target.value)}
                required
                disabled={loading}
              />
              <input
                type="text"
                placeholder="Username"
                className="w-full p-3 border rounded-lg mb-3 focus:outline-none focus:border-blue-500"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                disabled={loading}
              />
              <input
                type="password"
                placeholder="Password (min. 6 karakter)"
                className="w-full p-3 border rounded-lg mb-4 focus:outline-none focus:border-blue-500"
                value={regPassword}
                onChange={(e) => setRegPassword(e.target.value)}
                minLength="6"
                required
                disabled={loading}
              />
              <button
                type="submit"
                className="w-full py-3 bg-black text-white font-semibold rounded-lg hover:bg-gray-800 transition"
                disabled={loading}
              >
                {loading ? 'Memproses...' : 'Daftar'}
              </button>
            </form>

            <p className="text-xs text-center text-gray-500 mt-4">
              By joining, you agree to the{' '}
              <a href="#" className="text-[#bd2c30] hover:underline">Terms</a> and{' '}
              <a href="#" className="text-[#bd2c30] hover:underline">Privacy Policy</a>.
            </p>
          </>
        )}
      </div>
    </div>
  );
};

export default AuthModal;