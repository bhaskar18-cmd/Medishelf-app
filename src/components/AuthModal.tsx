/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { auth, googleProvider, handleFirestoreError, OperationType } from '../db/firebase';
import { signInWithPopup, signInWithCredential, GoogleAuthProvider } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { Capacitor } from '@capacitor/core';
import { Shield, Lock, AlertCircle } from 'lucide-react';

interface AuthModalProps {
  onSignedIn: () => void;
}

export const AuthModal: React.FC<AuthModalProps> = ({ onSignedIn }) => {
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const handleGoogleSignIn = async () => {
    setLoading(true);
    setErrorMsg('');
    try {
      if (Capacitor.isNativePlatform()) {
        const result = await FirebaseAuthentication.signInWithGoogle();
        if (result.credential?.idToken) {
          const credential = GoogleAuthProvider.credential(result.credential.idToken);
          await signInWithCredential(auth, credential);
        } else {
          throw new Error('Google Sign-In did not return a valid ID token.');
        }
      } else {
        await signInWithPopup(auth, googleProvider);
      }
      onSignedIn();
    } catch (error: any) {
      if (
        error?.code === 'auth/popup-closed-by-user' ||
        error?.message?.includes('cancelled') ||
        error?.message?.includes('canceled') ||
        error?.message?.includes('Sign in action cancelled')
      ) {
        setErrorMsg('Sign-in was cancelled. Please try again when ready.');
        return;
      }
      try {
        handleFirestoreError(error, OperationType.WRITE, 'auth');
      } catch (e: any) {
        let errStr = 'Authentication failed';
        try {
          const info = JSON.parse(e.message);
          errStr = info.error || errStr;
        } catch {
          errStr = error?.message || errStr;
        }
        setErrorMsg(errStr);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-2xl p-8 text-center border border-slate-200">
        <div className="w-16 h-16 bg-teal-600 rounded-2xl mx-auto flex items-center justify-center text-white shadow-lg shadow-teal-600/30 mb-6">
          <Shield className="w-8 h-8" />
        </div>
        <h1 className="text-2xl font-bold text-slate-900 mb-2">Sign in to MediShelf</h1>
        <p className="text-slate-500 text-sm mb-6">
          Connect your Google account to securely sync your pharmacy inventory and shelf maps with Cloud Firestore.
        </p>

        {errorMsg && (
          <div className="mb-6 p-4 rounded-xl bg-red-50 border border-red-200 flex items-center gap-3 text-red-700 text-sm text-left">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{errorMsg}</span>
          </div>
        )}

        <button
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full py-3.5 px-4 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-2xl shadow-md transition-all flex items-center justify-center gap-3 disabled:opacity-50"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="currentColor"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="currentColor"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="currentColor"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
            />
            <path
              fill="currentColor"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
            />
          </svg>
          <span>{loading ? 'Signing in...' : 'Sign in with Google'}</span>
        </button>

        <p className="text-xs text-slate-400 mt-6 flex items-center justify-center gap-1.5">
          <Lock className="w-3.5 h-3.5" /> Secured with Firebase Cloud Firestore
        </p>
      </div>
    </div>
  );
};
